const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Post, User, Comment, Follow, Share, Notification } = require('../models');
const { authenticateToken } = require('./auth');
const { getVideoThumbnail } = require('../config/cloudinary');
const NotificationService = require('../services/notificationService');

// Helper function to get Socket.IO instance
const getIo = (req) => req.app.get('io');

// MongoDB-only post management

// @route   GET /api/posts/health
// @desc    Health check for posts service
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Posts service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// @route   GET /api/posts
// @desc    Get all posts with proper privacy filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/posts - Request received');
    console.log('Query params:', req.query);
    
    // Extract query parameters
    const {
      feedType = 'for-you',
      limit = 20,
      page = 1,
      contentType = 'all',
      authorId,
      hashtag,
      search
    } = req.query;
    
    // Get current user ID if authenticated and valid
    const rawUserId = req.user ? (req.user.userId || req.user.id) : null;
    const currentUserId = (rawUserId && rawUserId !== 'anonymous-user' && mongoose.Types.ObjectId.isValid(String(rawUserId)))
      ? String(rawUserId)
      : null;
    
    // Base query - always include active posts
    let query = { isActive: true };
    
    // Privacy filtering based on user authentication and feed type
    if (feedType === 'following' && currentUserId) {
      // Following feed: get posts from users the current user follows + their own posts
      const followingIds = await Follow.getFollowingIds(currentUserId);
      
      // Include posts from followed users and own posts
      const authorIds = [...followingIds, currentUserId];
      
      query.$and = [
        { author: { $in: authorIds } },
        {
          $or: [
            { privacy: 'public' },
            { privacy: 'followers', author: { $in: followingIds } },
            { author: currentUserId } // Always show own posts
          ]
        }
      ];
    } else if (feedType === 'recent') {
      // Recent feed: show all public posts + posts from followed users (most inclusive)
      if (currentUserId) {
        const followingIds = await Follow.getFollowingIds(currentUserId);
        
        query.$or = [
          { privacy: 'public' }, // All public posts from everyone
          { privacy: 'followers', author: { $in: followingIds } }, // Followers posts from people you follow
          { author: currentUserId } // Always show own posts
        ];
      } else {
        // Not authenticated: show all public posts
        query.privacy = 'public';
      }
    } else if (feedType === 'trending') {
      // Trending feed: show popular public posts only
      query.privacy = 'public';
      // Add date filter for trending (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: weekAgo };
    } else {
      // For-you feed: personalized content
      if (currentUserId) {
        const followingIds = await Follow.getFollowingIds(currentUserId);
        
        query.$or = [
          { privacy: 'public' },
          { privacy: 'followers', author: { $in: followingIds } },
          { author: currentUserId } // Always show own posts
        ];
      } else {
        // Not authenticated: only show public posts
        query.privacy = 'public';
      }
    }
    
    // Filter by specific author (for profile pages)
    if (authorId) {
      // When viewing someone's profile, respect privacy settings
      if (currentUserId && currentUserId.toString() === authorId.toString()) {
        // Own profile: show all posts
        query = { isActive: true, author: authorId };
      } else if (currentUserId) {
        // Other's profile: check if following
        const { Follow } = require('../models');
        const isFollowing = await Follow.isFollowing(currentUserId, authorId);
        
        query = {
          isActive: true,
          author: authorId,
          $or: [
            { privacy: 'public' },
            ...(isFollowing ? [{ privacy: 'followers' }] : [])
          ]
        };
      } else {
        // Not authenticated: only public posts
        query = { isActive: true, author: authorId, privacy: 'public' };
      }
    }

    // Filter by content type
    if (contentType !== 'all') {
      query.type = contentType;
    }

    // Filter by hashtag
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }

    // Search functionality using MongoDB $text for content/hashtags
    if (search) {
      const searchString = String(search).trim();
      if (searchString.length) {
        const textClause = { $text: { $search: searchString } };
        if (query.$and) {
          query.$and.push(textClause);
        } else {
          query = { $and: [query, textClause] };
        }
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get posts based on feed type with proper sorting
    let posts;
    let sortCriteria;
    
    switch (feedType) {
      case 'trending':
        // Sort by engagement metrics for trending
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      case 'following':
        // Sort by recency for following feed
        sortCriteria = { createdAt: -1 };
        break;
      case 'recent':
        // Sort by recency for recent feed
        sortCriteria = { createdAt: -1 };
        break;
      default:
        // For-you feed: mix of engagement and recency
        sortCriteria = { 
          createdAt: -1
        };
    }
    
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Sort criteria:', JSON.stringify(sortCriteria, null, 2));
    console.log('Limit:', parseInt(limit), 'Skip:', skip);
    
    // Prefer $text score sort when using text search
    const isTextSearch = !!(
      (query.$and && query.$and.some(clause => clause.$text)) ||
      (query.$or && query.$or.some(clause => clause.$text))
    );

    posts = await Post.find(query, isTextSearch ? { score: { $meta: 'textScore' } } : undefined)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort(isTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : sortCriteria)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    console.log(`Found ${posts.length} posts (${total} total)`);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Handle anonymous author case
          // Transform arrays to counts and add computed properties
          const userId = req.user ? (req.user.userId || req.user.id) : null;
          
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id, // Add id field for compatibility
            authorId: post.author._id, // Add authorId for compatibility
            // Transform author to match frontend interface
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            // Transform arrays to counts
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            // Add user interaction flags
            isLiked: userId && Array.isArray(post.likes) ? post.likes.some(like => 
              (like.user && like.user.toString() === userId.toString())
            ) : false,
            isBookmarked: userId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
              (bookmark.user && bookmark.user.toString() === userId.toString())
            ) : false,
            isShared: userId && Array.isArray(post.shares) ? post.shares.some(share => 
              (share.user && share.user.toString() === userId.toString())
            ) : false,
            // Keep original arrays for backward compatibility but ensure they're safe
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            // Ensure media array is properly structured
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        feedType,
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/public
// @desc    Get all public posts (no authentication required)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    console.log('GET /api/posts/public - Request received');
    const {
      limit = 20,
      page = 1,
      contentType = 'all',
      hashtag,
      search,
      sortBy = 'recent' // recent, trending, popular
    } = req.query;

    // Base query for public posts only
    let query = { 
      isActive: true, 
      privacy: 'public' 
    };

    // Filter by content type
    if (contentType !== 'all') {
      query.type = contentType;
    }

    // Filter by hashtag
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }

    // Search functionality using MongoDB $text for content/hashtags
    if (search) {
      const searchString = String(search).trim();
      if (searchString.length) {
        const textClause = { $text: { $search: searchString } };
        if (query.$and) {
          query.$and.push(textClause);
        } else {
          query = { $and: [query, textClause] };
        }
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort criteria
    let sortCriteria;
    switch (sortBy) {
      case 'trending':
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      case 'popular':
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      default: // recent
        sortCriteria = { createdAt: -1 };
    }
    
    // Prefer $text score sort when using text search
    const isTextSearch = !!(
      (query.$and && query.$and.some(clause => clause.$text)) ||
      (query.$or && query.$or.some(clause => clause.$text))
    );

    const posts = await Post.find(query, isTextSearch ? { score: { $meta: 'textScore' } } : undefined)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort(isTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : sortCriteria)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get public posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/trending
// @desc    Get trending posts
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    console.log('GET /api/posts/trending - Request received');
    const {
      limit = 20,
      timeRange = 'week',
      minViews = 0,
      minLikes = 0
    } = req.query;

    // Use the static method to get trending posts
    const posts = await Post.getTrending({
      limit: parseInt(limit),
      timeRange,
      minViews: parseInt(minViews),
      minLikes: parseInt(minLikes)
    });

    const total = posts.length;

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total,
          pages: 1,
        },
      },
    });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/bookmarks/:userId
// @desc    Get bookmarked posts for a user
// @access  Private
router.get('/bookmarks/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/posts/bookmarks/:userId - Request received');
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Validate user ID
    if (userId !== req.user.id && userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own bookmarks'
      });
    }

    // Find posts that are bookmarked by this user
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await Post.find({
      'bookmarks.user': userId,
      isActive: true
    })
    .populate('author', 'username displayName avatar isVerified bio role followerCount location')
    .sort({ 'bookmarks.createdAt': -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

    const total = await Post.countDocuments({
      'bookmarks.user': userId,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            isBookmarked: true, // All posts from this endpoint are bookmarked
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmarks',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/:postId
// @desc    Get a specific post by ID
// @access  Public
router.get('/:postId', async (req, res) => {
  try {
    console.log('GET /api/posts/:postId - Request received');
    const { postId } = req.params;
    const userId = req.user ? (req.user.userId || req.user.id) : null;

    // Find the post
    const post = await Post.findById(postId)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .lean();

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: 'The requested post could not be found or has been removed'
      });
    }

    // Privacy check
    if (post.privacy === 'private' && (!userId || post.author._id.toString() !== userId.toString())) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this post'
      });
    }

    if (post.privacy === 'followers') {
      // Check if user is following the author or is the author
      if (userId && post.author._id.toString() !== userId.toString()) {
        const isFollowing = await Follow.isFollowing(userId, post.author._id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You must follow this user to view their posts'
          });
        }
      } else if (!userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You must be logged in to view this post'
        });
      }
    }

    // Count comments for this post
    const commentCount = await Comment.countDocuments({ 
      post: post._id, 
      isActive: true 
    });

    const postWithCounts = {
      ...post,
      id: post._id,
      authorId: post.author._id,
      author: {
        ...post.author,
        id: post.author._id,
        name: post.author.displayName || post.author.username,
      },
      likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
      commentCount: commentCount,
      shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
      bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
      likes: Array.isArray(post.likes) ? post.likes.length : 0,
      shares: Array.isArray(post.shares) ? post.shares.length : 0,
      bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
      comments: commentCount,
      isLiked: userId && Array.isArray(post.likes) ? post.likes.some(like => 
        (like.user && like.user.toString() === userId.toString())
      ) : false,
      isBookmarked: userId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
        (bookmark.user && bookmark.user.toString() === userId.toString())
      ) : false,
      isShared: userId && Array.isArray(post.shares) ? post.shares.some(share => 
        (share.user && share.user.toString() === userId.toString())
      ) : false,
      media: Array.isArray(post.media) ? post.media.map(media => ({
        ...media,
        id: media._id || media.public_id,
        secure_url: media.secure_url || media.url,
        resource_type: media.resource_type || 'image',
        thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
      })) : []
    };

    res.json({
      success: true,
      data: {
        post: postWithCounts
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts - Request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const {
      content,
      type = 'text',
      media = [],
      hashtags = [],
      mentions = [],
      location = '',
      privacy = 'public'
    } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Post content is required',
      });
    }

    // Validate post type
    const validTypes = ['text', 'image', 'video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post type',
      });
    }

    // Validate media requirements for non-text posts
    if (type !== 'text' && (!media || media.length === 0)) {
      return res.status(400).json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} posts require media files`,
        details: type === 'video' ? 'Please upload a video file to create a video post' : 
                 type === 'image' ? 'Please upload an image file to create an image post' :
                 'Please upload media files for this post type'
      });
    }

    // Add this helper function to validate media URLs
    const validateMediaUrls = (mediaArray) => {
      if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
        return { valid: true }; // No media to validate
      }

      for (let i = 0; i < mediaArray.length; i++) {
        const media = mediaArray[i];
        
        // Check required fields
        if (!media.public_id) {
          return { 
            valid: false, 
            error: `Media item ${i + 1} is missing public_id` 
          };
        }
        
        if (!media.secure_url && !media.url) {
          return { 
            valid: false, 
            error: `Media item ${i + 1} is missing both secure_url and url` 
          };
        }
        
        // Validate URL format
        const url = media.secure_url || media.url;
        if (url && typeof url === 'string') {
          // Check for localhost URLs that might indicate local files not properly uploaded
          if (url.includes('localhost:8000/uploads/') && !url.includes('cloudinary.com')) {
            // This might be a local file, which is okay for development but should be checked
            console.warn(`Media item ${i + 1} appears to be a local file: ${url}`);
          }
          
          // Check for known missing file patterns
          const knownMissingPatterns = [
            'file_1760168733155_lfhjq4ik7ht',
            'file_1760263843073_w13593s5t8l',
            'file_1760276276250_3pqeekj048s'
          ];
          
          for (const pattern of knownMissingPatterns) {
            if (url.includes(pattern)) {
              return { 
                valid: false, 
                error: `Media item ${i + 1} references a known missing file` 
              };
            }
          }
        }
      }
      
      return { valid: true };
    };

    // Handle both authenticated and anonymous users
    const userId = req.user.id || req.user.userId;
    
    console.log('Processing user authentication - userId:', userId, 'isAnonymous:', req.user.isAnonymous);
    
    // Get authenticated user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Note: Mentions validation can be added later as an async process
    // For now, we'll allow mentions and validate them in the background

    // Create new post
    const newPost = new Post({
      author: user._id,
      content: content.trim(),
      type,
      media: media || [],
      hashtags: hashtags.map(tag => tag.toLowerCase()),
      mentions,
      location,
      privacy,
      views: 0,
    });

    // Save post to MongoDB
    await newPost.save();

    // Populate author data for registered users
    await newPost.populate('author', 'username displayName avatar isVerified');

    console.log(`Post created successfully:`, {
      postId: newPost._id,
      type: newPost.type,
      author: newPost.author.username,
      hasMedia: newPost.media && newPost.media.length > 0,
      mediaCount: newPost.media ? newPost.media.length : 0,
      mediaTypes: newPost.media ? newPost.media.map(m => m.resource_type) : []
    });

    // Notify all followers about the new post
    setImmediate(async () => {
      try {
        // Only notify followers for non-anonymous users
        if (user._id !== 'anonymous-user' && !req.user.isAnonymous) {
          // Get all followers of the post author
          const followers = await Follow.getFollowers(user._id, { limit: 1000, populate: false });
          const followerIds = followers.map(follow => follow.follower.toString());
          
          console.log(`Notifying ${followerIds.length} followers about new post`);
          
          // Create notifications for each follower
          const notificationPromises = followerIds.map(followerId => {
            // Skip notifying the post author
            if (followerId === user._id.toString()) {
              return Promise.resolve();
            }
            
            const notificationData = {
              recipient: followerId,
              sender: user._id,
              type: 'post',
              title: `${user.displayName || user.username} just posted`,
              message: newPost.content.length > 100 
                ? newPost.content.substring(0, 100) + '...' 
                : newPost.content,
              data: {
                postId: newPost._id,
                postType: newPost.type,
                authorId: user._id
              },
              relatedId: newPost._id,
              relatedModel: 'Post',
              actionUrl: `/post/${newPost._id}`
            };
            
            return Notification.createNotification(notificationData)
              .then(notification => {
                // Send real-time notification
                // Instead of using getIo(req), let's try to access io directly
                // This is a more reliable approach for background processes
                const io = req.app.get('io');
                if (io) {
                  io.to(`user_${followerId}`).emit('notification:new', notification);
                  
                  // Update unread count for the follower
                  return Notification.getUnreadCount(followerId)
                    .then(unreadCount => {
                      io.to(`user_${followerId}`).emit('notification:unread-count', {
                        unreadCount
                      });
                    })
                    .catch(err => {
                      console.error('Error getting unread count:', err);
                    });
                } else {
                  console.log('Socket.IO instance not available for real-time notifications');
                }
              })
              .catch(err => {
                console.error(`Error creating notification for follower ${followerId}:`, err);
              });
          });
          
          // Wait for all notifications to be created
          await Promise.all(notificationPromises);
          console.log(`Notifications sent to ${followerIds.length} followers`);
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
      }
    });

    // Return the created post with proper structure
    const postResponse = {
      ...newPost.toObject(),
      id: newPost._id,
      authorId: newPost.author._id,
      author: {
        ...newPost.author.toObject(),
        id: newPost.author._id,
        name: newPost.author.displayName || newPost.author.username,
      },
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      likes: 0,
      shares: 0,
      bookmarks: 0,
      comments: 0,
      isLiked: false,
      isBookmarked: false,
      isShared: false,
      media: Array.isArray(newPost.media) ? newPost.media.map(media => ({
        ...media,
        id: media._id || media.public_id,
        secure_url: media.secure_url || media.url,
        resource_type: media.resource_type || 'image',
        thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
      })) : []
    };

    res.status(201).json({
      success: true,
      data: {
        post: postResponse
      },
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message,
    });
  }
});

// @route   PUT /api/posts/:postId
// @desc    Update a post
// @access  Private
router.put('/:postId', authenticateToken, async (req, res) => {
  try {
    console.log('PUT /api/posts/:postId - Request received');
    const { postId } = req.params;
    const { content, hashtags, location, privacy } = req.body;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only edit your own posts',
      });
    }

    // Add to edit history if content changed
    if (content && content !== post.content) {
      post.editHistory = post.editHistory || [];
      post.editHistory.push({
        content: post.content,
        editedAt: new Date(),
      });
    }

    // Update fields
    if (content) post.content = content.trim();
    if (hashtags) post.hashtags = hashtags.map(tag => tag.toLowerCase());
    if (location) post.location = location;
    if (privacy) post.privacy = privacy;

    // Save updated post
    await post.save();

    // Populate author data
    await post.populate('author', 'username displayName avatar isVerified');

    // Return updated post
    res.json({
      success: true,
      data: {
        post: {
          ...post.toObject(),
          id: post._id,
          authorId: post.author._id,
          author: {
            ...post.author.toObject(),
            id: post.author._id,
            name: post.author.displayName || post.author.username,
          },
          likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
          commentCount: await Comment.countDocuments({ post: post._id, isActive: true }),
          shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
          bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
          likes: Array.isArray(post.likes) ? post.likes.length : 0,
          shares: Array.isArray(post.shares) ? post.shares.length : 0,
          bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
          comments: await Comment.countDocuments({ post: post._id, isActive: true }),
          media: Array.isArray(post.media) ? post.media.map(media => ({
            ...media,
            id: media._id || media.public_id,
            secure_url: media.secure_url || media.url,
            resource_type: media.resource_type || 'image',
            thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
          })) : []
        }
      },
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error.message,
    });
  }
});

// @route   DELETE /api/posts/:postId
// @desc    Delete a post
// @access  Private
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    console.log('DELETE /api/posts/:postId - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own posts',
      });
    }

    // Soft delete - set isActive to false
    post.isActive = false;
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/like - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user already liked the post
    const existingLikeIndex = post.likes.findIndex(like => 
      like.user && like.user.toString() === userId.toString()
    );

    let action;
    if (existingLikeIndex >= 0) {
      // Unlike - remove from likes array
      post.likes.splice(existingLikeIndex, 1);
      action = 'unlike';
    } else {
      // Like - add to likes array
      post.likes.push({
        user: userId,
        createdAt: new Date(),
      });
      action = 'like';
    }

    // Save updated post
    await post.save();

    res.json({
      success: true,
      data: {
        action,
        likeCount: post.likes.length,
      },
      message: action === 'like' ? 'Post liked successfully' : 'Post unliked successfully',
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like/unlike post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/bookmark
// @desc    Bookmark/unbookmark a post
// @access  Private
router.post('/:postId/bookmark', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/bookmark - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user already bookmarked the post
    const existingBookmarkIndex = post.bookmarks.findIndex(bookmark => 
      bookmark.user && bookmark.user.toString() === userId.toString()
    );

    let action;
    if (existingBookmarkIndex >= 0) {
      // Unbookmark - remove from bookmarks array
      post.bookmarks.splice(existingBookmarkIndex, 1);
      action = 'unbookmark';
    } else {
      // Bookmark - add to bookmarks array
      post.bookmarks.push({
        user: userId,
        createdAt: new Date(),
      });
      action = 'bookmark';
    }

    // Save updated post
    await post.save();

    res.json({
      success: true,
      data: {
        action,
        isBookmarked: action === 'bookmark',
      },
      message: action === 'bookmark' ? 'Post bookmarked successfully' : 'Post unbookmarked successfully',
    });
  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bookmark/unbookmark post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/share
// @desc    Share a post
// @access  Private
router.post('/:postId/share', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/share - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Add to shares array
    post.shares.push({
      user: userId,
      createdAt: new Date(),
    });

    // Save updated post
    await post.save();

    res.json({
      success: true,
      data: {
        shareCount: post.shares.length,
      },
      message: 'Post shared successfully',
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/comments - Request received');
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id || req.user.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required',
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Create comment using Comment model
    const newComment = new Comment({
      post: postId,
      author: userId,
      content: content.trim(),
      parentId: parentId || null,
    });

    // Save comment
    await newComment.save();

    // Populate author data
    await newComment.populate('author', 'username displayName avatar isVerified');

    res.status(201).json({
      success: true,
      data: {
        comment: {
          ...newComment.toObject(),
          id: newComment._id,
          authorId: newComment.author._id,
          author: {
            ...newComment.author.toObject(),
            id: newComment.author._id,
            name: newComment.author.displayName || newComment.author.username,
          },
        }
      },
      message: 'Comment added successfully',
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/:postId/comments
// @desc    Get comments for a post
// @access  Public
router.get('/:postId/comments', async (req, res) => {
  try {
    console.log('GET /api/posts/:postId/comments - Request received');
    const { postId } = req.params;
    const { limit = 20, page = 1, sortBy = 'newest' } = req.query;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Privacy check
    if (post.privacy === 'private') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view comments on this post'
      });
    }

    // Build sort criteria
    let sortCriteria;
    switch (sortBy) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'popular':
        sortCriteria = { likes: -1, createdAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find comments
    const comments = await Comment.find({ 
      post: postId, 
      isActive: true,
      parentId: null // Only top-level comments
    })
    .populate('author', 'username displayName avatar isVerified')
    .sort(sortCriteria)
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

    // Get total count
    const total = await Comment.countDocuments({ 
      post: postId, 
      isActive: true,
      parentId: null
    });

    // Add like counts and user interaction flags
    const userId = req.user ? (req.user.userId || req.user.id) : null;
    const commentsWithCounts = await Promise.all(comments.map(async comment => {
      const likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0;
      const isLiked = userId && Array.isArray(comment.likes) ? comment.likes.some(like => 
        (like.user && like.user.toString() === userId.toString())
      ) : false;
      
      return {
        ...comment,
        id: comment._id,
        authorId: comment.author._id,
        author: {
          ...comment.author,
          id: comment.author._id,
          name: comment.author.displayName || comment.author.username,
        },
        likeCount,
        isLiked,
        likes: likeCount,
        replies: await Comment.countDocuments({ 
          parentId: comment._id, 
          isActive: true 
        }),
      };
    }));

    res.json({
      success: true,
      data: {
        comments: commentsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments',
      message: error.message,
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
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
    
    // Get current user ID if authenticated
    const currentUserId = req.user ? (req.user.userId || req.user.id) : null;
    
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
          createdAt: -1 
        };
        break;
      case 'popular':
        sortCriteria = { 
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

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    console.log(`Found ${posts.length} public posts (${total} total)`);

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
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            // For public endpoint, don't show user interaction flags
            isLiked: false,
            isBookmarked: false,
            isShared: false,
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
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total,
          hasNextPage: skip + posts.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/posts/:id (Mongo ObjectId only)
// @desc    Get post by ID
// @access  Public
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`GET /api/posts/${id} - Request received`);

    // Find post by MongoDB _id
    const post = await Post.findById(id)
      .populate('author', 'username displayName avatar isVerified')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Increment views
    await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Add isLiked property if user is authenticated
    let isLiked = false;
    if (req.user) {
      const userId = req.user.userId || req.user.id;
      // Check if user has liked this post
      isLiked = post.likes && post.likes.some(like => {
        // Handle different formats of like objects
        if (like.user && like.user._id) {
          return like.user._id.toString() === userId.toString();
        } else if (like.user) {
          return like.user.toString() === userId.toString();
        }
        return false;
      });
    }

    console.log(`Post found: ${post.content.substring(0, 50)}...`);

    // Count comments for this post
    const commentCount = await Comment.countDocuments({ 
      post: post._id, 
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        ...post,
        id: post._id, // Add id field for compatibility
        authorId: post.author._id, // Add authorId for compatibility
        // Transform arrays to counts
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount: commentCount,
        shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        // Add user interaction flags
        isLiked: isLiked,
        isBookmarked: req.user && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
          (bookmark.user && bookmark.user.toString() === (req.user.userId || req.user.id).toString())
        ) : false,
        isShared: req.user && Array.isArray(post.shares) ? post.shares.some(share => 
          (share.user && share.user.toString() === (req.user.userId || req.user.id).toString())
        ) : false,
        // Keep original arrays for backward compatibility but ensure they're safe
        likes: Array.isArray(post.likes) ? post.likes.length : 0,
        shares: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        comments: commentCount,
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

// @route   GET /api/posts/username/:username
// @desc    Get posts by username
// @access  Public
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log(`GET /api/posts/username/${username} - Request received`);

    // First find the user by username
    const user = await User.findOne({
      username: new RegExp(`^${username}$`, 'i'),
      isActive: true
    }).select('_id');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Find posts by user
    const posts = await Post.find({
      author: user._id,
      isActive: true
    })
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalPosts = await Post.countDocuments({
      author: user._id,
      isActive: true
    });

    console.log(`Found ${posts.length} posts for user ${username}`);

    res.json({
      success: true,
      data: await Promise.all(posts.map(async post => {
        const userId = req.user ? (req.user.userId || req.user.id) : null;
        
        // Count comments for this post
        const commentCount = await Comment.countDocuments({ 
          post: post._id, 
          isActive: true 
        });
        
        return {
          ...post,
          id: post._id,
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
        };
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPosts,
        pages: Math.ceil(totalPosts / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get posts by username error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/user/:userIdOrUsername
// @desc    Get posts by user (accepts Mongo ObjectId or username)
//          Supports optional contentType filter: all | image | video
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId: userIdOrUsername } = req.params;
    const { limit = 20, page = 1, contentType = 'all' } = req.query;
    
    console.log(`GET /api/posts/user/${userIdOrUsername} - Request received`);
    console.log('Query params:', req.query);

    // Special-case 'anonymous' username: return empty results to avoid 404 noise
    if (String(userIdOrUsername).toLowerCase() === 'anonymous') {
      return res.json({
        success: true,
        data: {
          posts: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    }

    // Resolve to actual user _id (supports username)
    let authorId = userIdOrUsername;
    const isValidObjectId = (() => {
      try { return require('mongoose').Types.ObjectId.isValid(userIdOrUsername); } catch { return false; }
    })();

    if (!isValidObjectId) {
      const userDoc = await User.findOne({ username: userIdOrUsername }).select('_id');
      if (!userDoc) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      authorId = userDoc._id;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query for user's posts
    const userQuery = { 
      author: authorId, 
      isActive: true,
      ...(contentType === 'all' ? {} : (contentType === 'media' ? { type: { $in: ['image', 'video'] } } : { type: contentType }))
    };

    // Find posts by user
    const posts = await Post.find(userQuery)
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Post.countDocuments(userQuery);

    console.log(`Found ${posts.length} posts for user ${authorId} (${total} total)`);

    const transform = async (post) => {
      const userId = req.user ? (req.user.userId || req.user.id) : null;
      // Count comments for this post
      const commentCount = await Comment.countDocuments({ post: post._id, isActive: true });
      return {
        ...post,
        id: post._id,
        authorId: post.author._id,
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount,
        shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        isLiked: userId && Array.isArray(post.likes) ? post.likes.some(like => (like.user && like.user.toString() === userId.toString())) : false,
        isBookmarked: userId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => (bookmark.user && bookmark.user.toString() === userId.toString())) : false,
        isShared: userId && Array.isArray(post.shares) ? post.shares.some(share => (share.user && share.user.toString() === userId.toString())) : false,
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
    };

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(transform)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/user/:userId/liked
// @desc    Get posts liked by the authenticated user (userId must match requester)
// @access  Private
router.get('/user/:userId/liked', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1, contentType = 'all' } = req.query;
    const currentUserId = req.user.userId || req.user.id;

    if (userId !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find posts where likes array contains currentUserId
    const query = {
      isActive: true,
      ...(contentType === 'all' ? {} : (contentType === 'media' ? { type: { $in: ['image', 'video'] } } : { type: contentType })),
      likes: { $elemMatch: { user: currentUserId } },
    };

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    const transform = async (post) => {
      const commentCount = await Comment.countDocuments({ post: post._id, isActive: true });
      return {
        ...post,
        id: post._id,
        authorId: post.author._id,
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount,
        shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        isLiked: true,
        isBookmarked: Array.isArray(post.bookmarks) ? post.bookmarks.some(b => (b.user && b.user.toString() === currentUserId.toString())) : false,
        isShared: Array.isArray(post.shares) ? post.shares.some(s => (s.user && s.user.toString() === currentUserId.toString())) : false,
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
    };

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(transform)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get liked posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get liked posts', message: error.message });
  }
});

// @route   GET /api/posts/user/:userId/bookmarks
// @desc    Get posts bookmarked by the authenticated user (userId must match requester)
// @access  Private
router.get('/user/:userId/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1, contentType = 'all' } = req.query;
    const currentUserId = req.user.userId || req.user.id;

    if (userId !== currentUserId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find posts where bookmarks array contains currentUserId
    const query = {
      isActive: true,
      ...(contentType === 'all' ? {} : (contentType === 'media' ? { type: { $in: ['image', 'video'] } } : { type: contentType })),
      bookmarks: { $elemMatch: { user: currentUserId } },
    };

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    const transform = async (post) => {
      const commentCount = await Comment.countDocuments({ post: post._id, isActive: true });
      return {
        ...post,
        id: post._id,
        authorId: post.author._id,
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount,
        shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        isLiked: Array.isArray(post.likes) ? post.likes.some(l => (l.user && l.user.toString() === currentUserId.toString())) : false,
        isBookmarked: true,
        isShared: Array.isArray(post.shares) ? post.shares.some(s => (s.user && s.user.toString() === currentUserId.toString())) : false,
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
    };

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(transform)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get bookmarked posts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get bookmarked posts', message: error.message });
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

    // Validate media data structure
    if (media && media.length > 0) {
      console.log('Validating media items:', media);
      for (let i = 0; i < media.length; i++) {
        const mediaItem = media[i];
        console.log(`Media item ${i}:`, mediaItem);
        console.log(`Has public_id: ${!!mediaItem.public_id}`);
        console.log(`Has secure_url: ${!!mediaItem.secure_url}`);
        console.log(`Has resource_type: ${!!mediaItem.resource_type}`);
        
        if (!mediaItem.public_id || !mediaItem.secure_url || !mediaItem.resource_type) {
          console.log(`Media validation failed for item ${i}`);
          return res.status(400).json({
            success: false,
            error: 'Invalid media data structure',
            details: `Missing required fields in media item ${i}. Required: public_id, secure_url, resource_type`,
          });
        }

        // Specific validation for video posts
        if (type === 'video' && mediaItem.resource_type !== 'video') {
          return res.status(400).json({
            success: false,
            error: 'Invalid media type for video post',
            details: `Video posts require video files. Found: ${mediaItem.resource_type}`,
          });
        }

        // Validate video file size (optional, since Cloudinary handles this)
        if (mediaItem.resource_type === 'video' && mediaItem.bytes) {
          const maxVideoSize = 200 * 1024 * 1024; // 200MB
          if (mediaItem.bytes > maxVideoSize) {
            return res.status(400).json({
              success: false,
              error: 'Video file too large',
              details: `Video files must be less than 200MB. Current size: ${(mediaItem.bytes / (1024 * 1024)).toFixed(1)}MB`,
            });
          }
        }
      }
      console.log('All media items validated successfully');
    }

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
      } catch (error) {
        console.error('Error notifying followers about new post:', error);
      }
    });

    // Broadcast new post to all connected clients (non-blocking)
    setImmediate(() => {
      if (global.broadcastToAll) {
        try {
          const postData = {
            ...newPost.toObject(),
            id: newPost._id,
            authorId: newPost.author._id,
            // Ensure counts are properly set
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            bookmarkCount: 0,
            // Ensure interaction flags are set
            isLiked: false,
            isBookmarked: false,
            isShared: false,
          };

          console.log(`Broadcasting new ${type} post:`, {
            postId: postData.id,
            type: postData.type,
            hasMedia: postData.media && postData.media.length > 0,
            mediaCount: postData.media ? postData.media.length : 0
          });

          global.broadcastToAll('new-post', {
            post: postData,
            feedType: 'for-you'
          });

          // Also broadcast to specific feed types
          if (type === 'video') {
            global.broadcastToAll('new-video-post', {
              post: postData,
              feedType: 'for-you'
            });
          }
        } catch (broadcastError) {
          console.error('Broadcast error:', broadcastError);
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...newPost.toObject(),
        id: newPost._id,
        authorId: newPost.author._id,
        // Ensure counts are properly set for new posts
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        bookmarkCount: 0,
        // Ensure interaction flags are set
        isLiked: false,
        isBookmarked: false,
        isShared: false,
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} post created successfully`,
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

// @route   POST /api/posts/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/posts/${id}/like - User: ${userId}`);

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID format'
      });
    }

    // Find the post
    const post = await Post.findById(id).populate('author', 'username displayName');
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user already liked the post
    const alreadyLiked = post.isLikedBy(userId);
    let action, updatedLikeCount;
    
    if (alreadyLiked) {
      // Unlike the post
      await post.removeLike(userId);
      action = 'unlike';
      console.log(`User ${userId} unliked post ${id}`);
    } else {
      // Like the post
      await post.addLike(userId);
      action = 'like';
      console.log(`User ${userId} liked post ${id}`);
      
      // Create notification for post owner (if not self-like and author exists)
      if (post.author && post.author._id && post.author._id.toString() !== userId) {
        try {
          await NotificationService.createLikeNotification(
            userId,
            post.author._id.toString(),
            id,
            post.content ? post.content.substring(0, 100) : ''
          );
        } catch (notificationError) {
          console.error('Failed to create like notification:', notificationError);
          // Continue without notification if it fails
        }
      }
    }

    // Get the updated like count after saving
    // Refresh the post to get the updated like count
    const updatedPost = await Post.findById(id);
    updatedLikeCount = updatedPost.likes ? updatedPost.likes.length : 0;

    // Broadcast like update via Socket.IO
    const io = getIo(req);
    if (io) {
      const updateData = {
        postId: post._id.toString(),
        type: 'like_update',
        action: action,
        likeCount: updatedLikeCount,
        userId: userId,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all users in the post room
      io.to(`post:${post._id}`).emit('post-like-updated', updateData);
      
      // Also broadcast to general post updates for feeds
      io.emit('post-updated', {
        postId: post._id.toString(),
        type: 'like',
        likeCount: updatedLikeCount,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcasted ${action} update for post ${id}`);
    }

    res.json({
      success: true,
      data: {
        postId: post._id,
        action: action,
        likeCount: updatedLikeCount,
        message: `Post ${action}d successfully`
      }
    });
  } catch (error) {
    console.error('Like/unlike post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like/unlike post',
      message: error.message
    });
  }
});


// @route   POST /api/posts/:id/bookmark
// @desc    Toggle bookmark on a post
// @access  Private
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/posts/${id}/bookmark - User: ${userId}`);

    // Validate inputs
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required',
      });
    }

    // Handle anonymous user
    if (userId === 'anonymous-user' || req.user.isAnonymous) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to bookmark posts',
        message: 'Please log in to bookmark posts',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User authentication failed',
      });
    }

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID format',
      });
    }

    console.log(`Finding post with ID: ${id}`);
    const post = await Post.findById(id);
    if (!post) {
      console.log(`Post not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if already bookmarked
    const isAlreadyBookmarked = post.isBookmarkedBy(userId);
    console.log(`User ${userId} already bookmarked post ${id}: ${isAlreadyBookmarked}`);

    let action, newIsBookmarked;
    
    if (isAlreadyBookmarked) {
      // Remove bookmark
      console.log(`Removing bookmark for user ${userId} on post ${id}`);
      await post.removeBookmark(userId);
      action = 'unbookmark';
      newIsBookmarked = false;
      console.log(`Bookmark removed successfully`);
    } else {
      // Add bookmark
      console.log(`Adding bookmark for user ${userId} on post ${id}`);
      await post.addBookmark(userId);
      action = 'bookmark';
      newIsBookmarked = true;
      console.log(`Bookmark added successfully`);
    }

    console.log(`Returning response with bookmarkCount: ${post.bookmarkCount}`);
    res.json({
      success: true,
      data: {
        postId: post._id,
        action: action,
        bookmarkCount: post.bookmarkCount,
        isBookmarked: newIsBookmarked,
        wasAlreadyBookmarked: isAlreadyBookmarked,
      },
      message: `Post ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle bookmark',
      message: error.message,
    });
  }
});

// Note: Unbookmark functionality is now handled by the toggle endpoint above (POST /api/posts/:id/bookmark)

// @route   POST /api/posts/:id/share
// @desc    Share a post (basic share - increments count)
// @access  Private
router.post('/:id/share', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'internal' } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/posts/${id}/share - User: ${userId}, Platform: ${platform}`);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    console.log(`Finding post with ID: ${id}`);
    const post = await Post.findById(id);
    if (!post) {
      console.log(`Post not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    console.log(`Found post:`, post);
    // Create external share record for analytics
    if (platform !== 'internal') {
      console.log(`Creating external share record for platform: ${platform}`);
      await Share.createExternalShare(id, userId, platform, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });
    }

    // Increment share count in post
    console.log(`Adding share for user ${userId} on post ${id}`);
    await post.addShare(userId);
    console.log(`Share added successfully`);

    // Broadcast share update via Socket.IO to all users viewing this post
    const io = getIo(req);
    if (io) {
      const updateData = {
        postId: post._id.toString(),
        type: 'share_update',
        action: 'share',
        shareCount: post.shareCount,
        userId: userId,
        platform: platform,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all users in the post room
      io.to(`post_${post._id}`).emit('post-share-updated', updateData);
      
      // Also broadcast to general post updates for feeds
      io.emit('post-updated', {
        postId: post._id.toString(),
        type: 'share',
        shareCount: post.shareCount,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcasted share update for post ${id}`);
    }

    console.log(`Returning response with shareCount: ${post.shareCount}`);
    res.json({
      success: true,
      data: {
        postId: post._id,
        action: 'share',
        shareCount: post.shareCount,
        shares: post.shareCount, // For backward compatibility
        message: 'Post shared successfully',
        platform: platform
      },
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

// @route   POST /api/posts/:id/share/followers
// @desc    Share a post with followers
// @access  Private
router.post('/:id/share/followers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message = '' } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/posts/${id}/share/followers - User: ${userId}`);

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Share with followers
    const share = await Share.shareWithFollowers(id, userId, message);

    // Increment share count in post
    await post.addShare(userId);

    // Broadcast share update via Socket.IO to all users viewing this post
    const io = getIo(req);
    if (io) {
      const updateData = {
        postId: post._id.toString(),
        type: 'share_update',
        action: 'share_followers',
        shareCount: post.shareCount,
        userId: userId,
        platform: 'followers',
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all users in the post room
      io.to(`post_${post._id}`).emit('post-share-updated', updateData);
      
      // Also broadcast to general post updates for feeds
      io.emit('post-updated', {
        postId: post._id.toString(),
        type: 'share',
        shareCount: post.shareCount,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcasted share with followers update for post ${id}`);
    }

    res.json({
      success: true,
      data: {
        postId: post._id,
        action: 'share_followers',
        shareCount: post.shareCount,
        share: share,
        shares: post.shareCount, // For backward compatibility
        sharedWith: share.shareCount,
        message: 'Post shared with followers successfully',
      },
    });
  } catch (error) {
    console.error('Share with followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post with followers',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:id/share/users
// @desc    Share a post with specific users
// @access  Private
router.post('/:id/share/users', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, message = '' } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log(`POST /api/posts/${id}/share/users - User: ${userId}, Recipients: ${userIds?.length || 0}`);

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs are required',
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Share with specific users
    const share = await Share.shareWithUsers(id, userId, userIds, message);

    // Increment share count in post
    await post.addShare(userId);

    // Broadcast share update via Socket.IO to all users viewing this post
    const io = getIo(req);
    if (io) {
      const updateData = {
        postId: post._id.toString(),
        type: 'share_update',
        action: 'share_users',
        shareCount: post.shareCount,
        userId: userId,
        platform: 'users',
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to all users in the post room
      io.to(`post_${post._id}`).emit('post-share-updated', updateData);
      
      // Also broadcast to general post updates for feeds
      io.emit('post-updated', {
        postId: post._id.toString(),
        type: 'share',
        shareCount: post.shareCount,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcasted share with users update for post ${id}`);
    }

    res.json({
      success: true,
      data: {
        postId: post._id,
        action: 'share_users',
        shareCount: post.shareCount,
        share: share,
        shares: post.shareCount, // For backward compatibility
        sharedWith: share.shareCount,
        message: 'Post shared with users successfully',
      },
    });
  } catch (error) {
    console.error('Share with users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post with users',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/:id/shares
// @desc    Get shares for a post
// @access  Public
router.get('/:id/shares', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type = null } = req.query;
    const Share = require('../models/Share');

    console.log(`GET /api/posts/${id}/shares - Request received`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const shares = await Share.getPostShares(id, {
      limit: parseInt(limit),
      skip: skip,
      shareType: type
    });

    const analytics = await Share.getShareAnalytics(id);

    res.json({
      success: true,
      data: {
        shares: shares,
        analytics: analytics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: analytics.totalShares,
          pages: Math.ceil(analytics.totalShares / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get post shares error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post shares',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/shared/received
// @desc    Get posts shared with current user
// @access  Private
router.get('/shared/received', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.userId || req.user.id;

    console.log(`GET /api/posts/shared/received - User: ${userId}`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sharedPosts = await Share.getReceivedShares(userId, {
      limit: parseInt(limit),
      skip: skip
    });

    const totalShares = await Share.countDocuments({
      'sharedWith.user': userId,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        shares: sharedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalShares,
          pages: Math.ceil(totalShares / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get received shares error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get received shares',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/trending/hashtags
// @desc    Get trending hashtags with engagement and time decay
// @access  Public
router.get('/trending/hashtags', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log('GET /api/posts/trending/hashtags - Request received');

    // Aggregate hashtags with enhanced scoring
    const trendingHashtags = await Post.aggregate([
      {
        $match: {
          isActive: true,
          hashtags: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$hashtags' },
      // Compute per-post engagement metrics
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          sharesCount: { $size: { $ifNull: ['$shares', []] } },
          viewsCount: { $ifNull: ['$views', 0] }
        }
      },
      // Lookup comment count for each post
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$post', '$$postId'] }, { $eq: ['$isActive', true] } ] } } },
            { $count: 'count' }
          ],
          as: 'commentAgg'
        }
      },
      {
        $addFields: {
          commentCount: { $ifNull: [ { $arrayElemAt: ['$commentAgg.count', 0] }, 0 ] }
        }
      },
      // Time decay weight based on post age (so newer posts weigh more)
      {
        $addFields: {
          ageHours: { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] },
          decayWeight: { $divide: [ 1, { $add: [ 1, { $divide: [ { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] }, 24 ] } ] } ] } // 1 / (1 + ageHours/24)
        }
      },
      // Per-post score with weights
      {
        $addFields: {
          postScore: {
            $multiply: [
              { $add: [
                1, // base
                { $multiply: ['$likesCount', 2] },
                { $multiply: ['$commentCount', 3] },
                { $multiply: ['$sharesCount', 4] },
                { $multiply: ['$viewsCount', 0.1] }
              ] },
              '$decayWeight'
            ]
          }
        }
      },
      // Group by hashtag
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalComments: { $sum: '$commentCount' },
          totalShares: { $sum: '$sharesCount' },
          totalViews: { $sum: '$viewsCount' },
          score: { $sum: '$postScore' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          totalViews: 1,
          score: 1,
          _id: 0
        }
      }
    ]);

    console.log(`Found ${trendingHashtags.length} trending hashtags`);

    res.json({
      success: true,
      data: {
        hashtags: trendingHashtags,
      },
    });
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending hashtags',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/user/:userId/bookmarks
// @desc    Get user's bookmarked posts
// @access  Private
router.get('/user/:userId/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const requestingUserId = req.user.userId || req.user.id;

    // Users can only see their own bookmarks
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    console.log(`GET /api/posts/user/${userId}/bookmarks - Request received`);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find posts bookmarked by the user
    const bookmarkedPosts = await Post.find({
      bookmarkedBy: userId,
      isActive: true
    })
      .populate('author', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Post.countDocuments({
      bookmarkedBy: userId,
      isActive: true
    });

    console.log(`Found ${bookmarkedPosts.length} bookmarked posts for user ${userId}`);

    res.json({
      success: true,
      data: {
        posts: bookmarkedPosts.map(post => ({
          ...post,
          id: post._id,
          isBookmarked: true, // All posts in this list are bookmarked
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
    console.error('Get bookmarked posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmarked posts',
      message: error.message,
    });
  }
});

// @route   PUT /api/posts/:id/video-settings
// @desc    Update video-specific settings
// @access  Private
router.put('/:id/video-settings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { quality, visibility, enableComments, enableDownload } = req.body;
    const userId = req.user.userId;

    // Find the post and verify ownership
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if post has video content
    const hasVideo = post.media?.some(m => m.resource_type === 'video');
    if (!hasVideo) {
      return res.status(400).json({
        success: false,
        error: 'Post does not contain video content'
      });
    }

    // Update video settings
    const updates = {};
    if (visibility) updates.privacy = visibility;
    
    // For other video-specific settings, you might want to add them to the Post schema
    // For now, we'll just update what we can
    
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: updatedPost,
      message: 'Video settings updated successfully'
    });
  } catch (error) {
    console.error('Update video settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update video settings',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/videos/search
// @desc    Search video posts with advanced filters
// @access  Public
router.get('/videos/search', async (req, res) => {
  try {
    const {
      query = '',
      duration_min = 0,
      duration_max = 3600,
      format = '',
      author = '',
      tags = '',
      sort_by = 'createdAt',
      sort_order = 'desc',
      limit = 20,
      page = 1
    } = req.query;

    // Build search criteria
    const searchCriteria = {
      $or: [
        { type: 'video' },
        { 'media.resource_type': 'video' }
      ],
      isActive: true,
      privacy: 'public'
    };

    // Text search
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      searchCriteria.$and = [
        {
          $or: [
            { content: searchRegex },
            { hashtags: { $in: [searchRegex] } }
          ]
        }
      ];
    }

    // Duration filter
    if (duration_min > 0 || duration_max < 3600) {
      searchCriteria['media.duration'] = {
        $gte: parseInt(duration_min),
        $lte: parseInt(duration_max)
      };
    }

    // Format filter
    if (format) {
      searchCriteria['media.format'] = format.toLowerCase();
    }

    // Author filter
    if (author) {
      const authorUser = await User.findOne({ username: author });
      if (authorUser) {
        searchCriteria.author = authorUser._id;
      }
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      searchCriteria.hashtags = { $in: tagArray };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Execute search
    const posts = await Post.find(searchCriteria)
      .populate('author', 'username displayName avatar isVerified')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Post.countDocuments(searchCriteria);

    // Transform results
    const transformedPosts = posts.map(post => {
      const videoMedia = post.media?.filter(m => m.resource_type === 'video') || [];
      
      return {
        id: post._id,
        title: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        description: post.content,
        thumbnail: videoMedia[0]?.secure_url || null,
        url: videoMedia[0]?.secure_url || null,
        duration: videoMedia[0]?.duration || 0,
        format: videoMedia[0]?.format || 'unknown',
        quality: 'auto', // Default quality setting
        views: post.views || 0,
        likes: post.likes?.length || 0,
        comments: 0, // Would need to query Comment model
        author: {
          id: post.author._id,
          name: post.author.displayName || post.author.username,
          avatar: post.author.avatar
        },
        tags: post.hashtags || [],
        createdAt: post.createdAt,
        size: videoMedia[0]?.bytes || 0
      };
    });

    res.json({
      success: true,
      data: {
        videos: transformedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          query,
          duration_min: parseInt(duration_min),
          duration_max: parseInt(duration_max),
          format,
          author,
          tags: tags ? tags.split(',') : [],
          sort_by,
          sort_order
        }
      }
    });
  } catch (error) {
    console.error('Video search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search videos',
      message: error.message,
    });
  }
});

module.exports = router;

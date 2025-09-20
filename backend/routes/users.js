const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { User, Follow } = require('../models');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Users service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});



// @route   GET /api/users/check-username
// @desc    Check if a username is available
// @access  Public
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
        available: false
      });
    }
    
    // Check if username meets requirements
    if (username.length < 3 || username.length > 30) {
      return res.json({
        success: true,
        message: 'Username must be between 3 and 30 characters',
        available: false
      });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.json({
        success: true,
        message: 'Username can only contain letters, numbers, and underscores',
        available: false
      });
    }
    
    // Check if username exists
    const existingUser = await User.findOne({
      username: new RegExp(`^${username}$`, 'i')
    });
    
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Username is already taken',
        available: false
      });
    }
    
    // Username is available
    return res.json({
      success: true,
      message: 'Username is available',
      available: true
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username availability',
      available: false
    });
  }
});

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username (includes relationship status when authenticated)
// @access  Public (with privacy controls)
router.get('/profile/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const requestingUserId = req.user?.userId;

    console.log(`Getting profile for username: ${username}, requested by: ${requestingUserId || 'anonymous'}`);

    // Special-case 'anonymous' username: return a minimal public profile instead of 404
    if (String(username).toLowerCase() === 'anonymous') {
      const anonymousProfile = {
        id: 'anonymous-user',
        username: 'anonymous',
        displayName: 'TalkCart User',
        email: undefined,
        avatar: '',
        bio: '',
        location: '',
        website: '',
        isVerified: false,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        walletAddress: undefined,
        socialLinks: {},
        settings: {
          privacy: {
            profileVisibility: 'public',
            activityVisibility: 'public',
            allowDirectMessages: true,
            allowGroupInvites: true,
            allowMentions: true,
            showWallet: false,
            showActivity: true,
            showOnlineStatus: false,
            showLastSeen: false,
          }
        },
        lastSeen: undefined,
        isOnline: false,
        isFollowing: false,
        isFollower: false,
        canMessage: true,
        canInviteToGroup: true,
      };

      return res.json({ success: true, data: anonymousProfile });
    }

    const user = await User.findOne({
      username: new RegExp(`^${username}$`, 'i'),
      isActive: true
    }).select('-password -resetPasswordToken -resetPasswordExpiry -biometricCredentials').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const requesterIsValid = requestingUserId && mongoose.Types.ObjectId.isValid(requestingUserId);
    const isSelf = requesterIsValid && requestingUserId === user._id.toString();

    // Check privacy settings
    const profileVisibility = user.settings?.privacy?.profileVisibility || 'public';
    const activityVisibility = user.settings?.privacy?.activityVisibility || 'public';

    // If profile is private and not own profile, allow if requester follows this user
    if (profileVisibility === 'private' && !isSelf) {
      const isFollowing = requesterIsValid
        ? await Follow.isFollowing(requestingUserId, user._id)
        : false;
      if (!isFollowing) {
        return res.status(403).json({
          success: false,
          error: 'This profile is private'
        });
      }
    }

    // Transform user data
    const transformedUser = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      email: isSelf ? user.email : undefined, // Only show email to self
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isVerified: user.isVerified || false,
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
      postCount: user.postCount || 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      walletAddress: (user.settings?.privacy?.showWallet || isSelf) ? user.walletAddress : undefined,
      socialLinks: user.socialLinks,
      settings: isSelf ? user.settings : {
        privacy: {
          profileVisibility,
          activityVisibility,
          allowDirectMessages: user.settings?.privacy?.allowDirectMessages ?? true,
          allowGroupInvites: user.settings?.privacy?.allowGroupInvites ?? true,
          allowMentions: user.settings?.privacy?.allowMentions ?? true,
          showWallet: user.settings?.privacy?.showWallet ?? false,
          showActivity: activityVisibility !== 'private',
          showOnlineStatus: user.settings?.privacy?.showOnlineStatus ?? false,
          showLastSeen: user.settings?.privacy?.showLastSeen ?? false,
        }
      },
      lastSeen: user.lastSeenAt,
      isOnline: user.lastSeenAt && (Date.now() - new Date(user.lastSeenAt).getTime()) < 300000, // 5 minutes
    };

    // Add relationship info when requester is authenticated (non-anonymous ObjectId)
    if (requesterIsValid && !isSelf) {
      const [isFollowing, isFollower] = await Promise.all([
        Follow.isFollowing(requestingUserId, user._id),
        Follow.isFollowing(user._id, requestingUserId),
      ]);
      transformedUser.isFollowing = isFollowing;
      transformedUser.isFollower = isFollower;
      transformedUser.canMessage = user.settings?.privacy?.allowDirectMessages ?? true;
      transformedUser.canInviteToGroup = user.settings?.privacy?.allowGroupInvites ?? true;
    } else {
      transformedUser.isFollowing = false;
      transformedUser.isFollower = false;
      transformedUser.canMessage = user.settings?.privacy?.allowDirectMessages ?? true;
      transformedUser.canInviteToGroup = user.settings?.privacy?.allowGroupInvites ?? true;
    }

    res.json({
      success: true,
      data: transformedUser
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { displayName, bio, location, website, socialLinks } = req.body;

    console.log(`Updating profile for user: ${userId}`);

    // Validate input
    if (displayName && displayName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Display name must be at least 2 characters long'
      });
    }

    if (displayName && displayName.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Display name cannot exceed 50 characters'
      });
    }

    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Bio cannot exceed 500 characters'
      });
    }

    if (location && location.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Location cannot exceed 100 characters'
      });
    }

    if (website && website.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'Website URL cannot exceed 200 characters'
      });
    }

    // Validate website URL format
    if (website && website.trim()) {
      const urlRegex = /^https?:\/\/.+\..+/;
      if (!urlRegex.test(website)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid website URL (starting with http:// or https://)'
        });
      }
    }

    // Update user profile
    const updateData = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpiry -biometricCredentials');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Transform response
    const transformedUser = {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      displayName: updatedUser.displayName || updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      location: updatedUser.location,
      website: updatedUser.website,
      isVerified: updatedUser.isVerified || false,
      followerCount: updatedUser.followerCount || 0,
      followingCount: updatedUser.followingCount || 0,
      postCount: updatedUser.postCount || 0,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      walletAddress: updatedUser.walletAddress,
      socialLinks: updatedUser.socialLinks,
      settings: updatedUser.settings,
    };

    console.log(`Profile updated successfully for user: ${userId}`);

    res.json({
      success: true,
      data: transformedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', authenticateTokenStrict, async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    console.log(`User ${currentUserId} attempting to follow user ${targetUserId}`);

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Use Follow model with idempotency
    const existing = await Follow.findOne({ follower: currentUserId, following: targetUserId });
    if (existing && existing.isActive) {
      return res.status(200).json({ success: true, message: 'Already following' });
    }

    // Create or reactivate follow
    await Follow.createFollow(currentUserId, targetUserId);

    // Update counters atomically and safely
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: 1 } });
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } });

    console.log(`User ${currentUserId} successfully followed user ${targetUserId}`);

    res.json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow user',
      message: error.message
    });
  }
});

// @route   DELETE /api/users/:id/follow
// @desc    Unfollow a user
// @access  Private
router.delete('/:id/follow', authenticateTokenStrict, async (req, res) => {
  try {
    const { id: targetUserId } = req.params;
    const currentUserId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot unfollow yourself'
      });
    }

    console.log(`User ${currentUserId} attempting to unfollow user ${targetUserId}`);

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Use Follow model with idempotency
    const existing = await Follow.findOne({ follower: currentUserId, following: targetUserId, isActive: true });
    if (!existing) {
      return res.status(200).json({ success: true, message: 'Not following' });
    }

    await Follow.removeFollow(currentUserId, targetUserId);

    // Update counters atomically and safely
    await User.findByIdAndUpdate(targetUserId, { $inc: { followerCount: -1 } });
    await User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } });

    console.log(`User ${currentUserId} successfully unfollowed user ${targetUserId}`);

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow user',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get user followers
// @access  Private
router.get('/:id/followers', authenticateTokenStrict, async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    console.log(`Getting followers for user: ${userId}`);

    // TODO: Implement with Follow model
    // For now, return empty array
    res.json({
      success: true,
      data: {
        followers: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get followers',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get user following
// @access  Private
router.get('/:id/following', authenticateTokenStrict, async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    console.log(`Getting following for user: ${userId}`);

    // TODO: Implement with Follow model
    // For now, return empty array
    res.json({
      success: true,
      data: {
        following: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get following',
      message: error.message
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by username or display name
// @access  Private
router.get('/search', authenticateTokenStrict, async (req, res) => {
  try {
    const { query, limit = 20, page = 1, excludeIds } = req.query;
    const userId = req.user.userId;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log(`Searching users for query: ${query}, user: ${userId}`);

    // Build search criteria
    const searchRegex = new RegExp(query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    let searchCriteria = {
      $and: [
        {
          $or: [
            { username: searchRegex },
            { displayName: searchRegex },
            { email: searchRegex }
          ]
        },
        { isActive: true },
        { _id: { $ne: userId } } // Exclude current user
      ]
    };

    // Exclude specific user IDs if provided
    if (excludeIds) {
      const excludeArray = Array.isArray(excludeIds) ? excludeIds : [excludeIds];
      const validExcludeIds = excludeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validExcludeIds.length > 0) {
        searchCriteria.$and.push({ _id: { $nin: validExcludeIds } });
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Search users
    const users = await User.find(searchCriteria)
      .select('username displayName avatar isVerified isActive lastSeen')
      .sort({ displayName: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await User.countDocuments(searchCriteria);

    // Transform data and add online status
    const transformedUsers = users.map(user => {
      const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
      const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime()) < 300000; // 5 minutes

      return {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || null,
        isVerified: user.isVerified || false,
        isOnline,
        lastSeen: user.lastSeen
      };
    });

    console.log(`Found ${transformedUsers.length} users for query: ${query}`);

    res.json({
      success: true,
      data: {
        users: transformedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users',
      message: error.message
    });
  }
});

// @route   GET /api/users/suggestions
// @desc    Get suggested users to follow
// @access  Public (but better suggestions if authenticated)
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { limit = 5, search } = req.query;
    const currentUserId = req.user?.userId;

    console.log(`Getting user suggestions, limit: ${limit}, currentUser: ${currentUserId || 'anonymous'}`);

    let excludeIds = [];
    
    if (currentUserId && currentUserId !== 'anonymous-user') {
      // If user is authenticated, exclude users they already follow and themselves
      const { Follow } = require('../models');
      const followingIds = await Follow.getFollowingIds(currentUserId);
      excludeIds = [...followingIds, currentUserId];
    }

    // Get suggested users based on different criteria
    const matchStage = {
      _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true,
      displayName: { $exists: true, $ne: '' }
    };

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      matchStage.$or = [
        { username: searchRegex },
        { displayName: searchRegex }
      ];
    }

    const suggestions = await User.aggregate([
      // Exclude current user and users they already follow, optionally filter by search
      { $match: matchStage },
      // Add computed fields for ranking
      {
        $addFields: {
          // Prioritize verified users
          verifiedScore: { $cond: [{ $eq: ['$isVerified', true] }, 10, 0] },
          // Prioritize users with more followers
          followerScore: { $multiply: [{ $ifNull: ['$followerCount', 0] }, 0.1] },
          // Prioritize recently active users
          activityScore: {
            $cond: [
              {
                $gte: [
                  '$lastSeen',
                  { $subtract: [new Date(), 7 * 24 * 60 * 60 * 1000] } // 7 days ago
                ]
              },
              5,
              0
            ]
          },
          // Random factor for diversity
          randomScore: { $rand: {} }
        }
      },
      // Calculate total score
      {
        $addFields: {
          totalScore: {
            $add: ['$verifiedScore', '$followerScore', '$activityScore', '$randomScore']
          }
        }
      },
      // Sort by total score
      { $sort: { totalScore: -1 } },
      // Limit results
      { $limit: parseInt(limit) },
      // Project only needed fields
      {
        $project: {
          _id: 1,
          username: 1,
          displayName: 1,
          avatar: 1,
          isVerified: 1,
          followerCount: { $ifNull: ['$followerCount', 0] },
          postCount: { $ifNull: ['$postCount', 0] },
          bio: { $ifNull: ['$bio', ''] },
          lastSeen: 1,
          totalScore: 1
        }
      }
    ]);

    // Transform the results
    const transformedSuggestions = suggestions.map(user => {
      const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
      const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime()) < 300000; // 5 minutes

      return {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        followerCount: user.followerCount,
        postCount: user.postCount,
        bio: user.bio,
        isOnline,
        lastSeen: user.lastSeen,
        // Add suggestion reason for better UX
        suggestionReason: user.isVerified 
          ? 'Verified user' 
          : user.followerCount > 100 
            ? 'Popular user' 
            : 'New to TalkCart'
      };
    });

    res.json({
      success: true,
      data: {
        suggestions: transformedSuggestions,
        total: transformedSuggestions.length
      },
      message: `Found ${transformedSuggestions.length} user suggestions`
    });

  } catch (error) {
    console.error('Get user suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user suggestions',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    console.log(`Getting user: ${id}, requested by: ${userId}`);

    const user = await User.findOne({
      _id: id,
      isActive: true
    }).select('username displayName avatar isVerified isActive lastSeen').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Transform data and add online status
    const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
    const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime()) < 300000; // 5 minutes

    const transformedUser = {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || null,
      isVerified: user.isVerified || false,
      isOnline,
      lastSeen: user.lastSeen
    };

    res.json({
      success: true,
      data: transformedUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

// @route   POST /api/users/batch
// @desc    Get multiple users by IDs
// @access  Private
router.post('/batch', authenticateTokenStrict, async (req, res) => {
  try {
    const { userIds } = req.body;
    const userId = req.user.userId;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    // Validate all IDs
    const validIds = userIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid user IDs provided'
      });
    }

    console.log(`Getting batch users: ${validIds.join(', ')}, requested by: ${userId}`);

    const users = await User.find({
      _id: { $in: validIds },
      isActive: true
    }).select('username displayName avatar isVerified isActive lastSeen').lean();

    // Transform data and add online status
    const transformedUsers = users.map(user => {
      const lastSeenDate = user.lastSeen ? new Date(user.lastSeen) : null;
      const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime()) < 300000; // 5 minutes

      return {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || null,
        isVerified: user.isVerified || false,
        isOnline,
        lastSeen: user.lastSeen
      };
    });

    console.log(`Found ${transformedUsers.length} users from batch request`);

    res.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    console.error('Get batch users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: error.message
    });
  }
});

// @route   GET /api/users/contacts
// @desc    Get user's contacts/friends
// @access  Private
router.get('/contacts', authenticateTokenStrict, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user.userId;

    console.log(`Getting contacts for user: ${userId}`);

    // This is a simplified version - in a real app you would have a separate
    // contacts/friends system. For now, we'll return users the current user
    // has had conversations with.

    const { Conversation } = require('../models');
    
    // Get conversations where user is a participant
    const conversations = await Conversation.find({
      participants: { $in: [userId] },
      isActive: true
    }).populate('participants', 'username displayName avatar isVerified lastSeen').lean();

    // Extract unique participants (excluding current user)
    const contactIds = new Set();
    conversations.forEach(conv => {
      conv.participants.forEach(participant => {
        if (participant._id.toString() !== userId) {
          contactIds.add(participant._id.toString());
        }
      });
    });

    // Get contact details
    const contacts = await User.find({
      _id: { $in: Array.from(contactIds) },
      isActive: true
    })
    .select('username displayName avatar isVerified lastSeen')
    .limit(parseInt(limit))
    .lean();

    // Transform data and add online status
    const transformedContacts = contacts.map(contact => {
      const lastSeenDate = contact.lastSeen ? new Date(contact.lastSeen) : null;
      const isOnline = lastSeenDate && (Date.now() - lastSeenDate.getTime()) < 300000; // 5 minutes

      return {
        id: contact._id.toString(),
        username: contact.username,
        displayName: contact.displayName || contact.username,
        avatar: contact.avatar || null,
        isVerified: contact.isVerified || false,
        isOnline,
        lastSeen: contact.lastSeen
      };
    });

    console.log(`Found ${transformedContacts.length} contacts`);

    res.json({
      success: true,
      data: transformedContacts
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contacts',
      message: error.message
    });
  }
});

// @route   GET /api/users/:id/relationship
// @desc    Get relationship status between current user and target user
// @access  Public (auth optional for requester)
router.get('/:id/relationship', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const requesterId = req.user?.userId;
    const requesterIsValid = requesterId && mongoose.Types.ObjectId.isValid(requesterId);

    // If anonymous or self, trivial results
    if (!requesterIsValid || requesterId === targetUserId) {
      return res.json({ success: true, data: { isFollowing: false, isFollower: false, mutual: false } });
    }

    const [isFollowing, isFollower] = await Promise.all([
      Follow.isFollowing(requesterId, targetUserId), // requester -> target
      Follow.isFollowing(targetUserId, requesterId), // target -> requester
    ]);

    return res.json({ success: true, data: { isFollowing, isFollower, mutual: isFollowing && isFollower } });
  } catch (error) {
    console.error('Get relationship error:', error);
    res.status(500).json({ success: false, error: 'Failed to get relationship', message: error.message });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get followers list for a user
// @access  Public
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = req.params.id;
    const { limit = 20, skip = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('_id isActive');
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const followers = await Follow.getFollowers(userId, { limit: parseInt(limit), skip: parseInt(skip), populate: true });

    const items = followers.map(f => {
      const u = f.follower;
      return {
        id: u._id.toString(),
        username: u.username,
        displayName: u.displayName || u.username,
        avatar: u.avatar || null,
        isVerified: !!u.isVerified,
        followerCount: u.followerCount || 0,
        followingCount: u.followingCount || 0,
        followedAt: f.createdAt,
      };
    });

    res.json({ success: true, data: { total: items.length, items } });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get followers', message: error.message });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get following list for a user
// @access  Public
router.get('/:id/following', async (req, res) => {
  try {
    const userId = req.params.id;
    const { limit = 20, skip = 0 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('_id isActive');
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const following = await Follow.getFollowing(userId, { limit: parseInt(limit), skip: parseInt(skip), populate: true });

    const items = following.map(f => {
      const u = f.following;
      return {
        id: u._id.toString(),
        username: u.username,
        displayName: u.displayName || u.username,
        avatar: u.avatar || null,
        isVerified: !!u.isVerified,
        followerCount: u.followerCount || 0,
        followingCount: u.followingCount || 0,
        followedAt: f.createdAt,
      };
    });

    res.json({ success: true, data: { total: items.length, items } });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, error: 'Failed to get following', message: error.message });
  }
});

module.exports = router;
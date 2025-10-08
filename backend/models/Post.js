const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  public_id: {
    type: String,
    required: true
  },
  secure_url: {
    type: String,
    required: true
  },
  url: String,
  resource_type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  format: String,
  width: Number,
  height: Number,
  bytes: Number,
  duration: Number, // For video/audio
  created_at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post author is required']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [2000, 'Post content cannot exceed 2000 characters'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text',
    required: true,
    index: true
  },
  media: [mediaSchema],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Hashtag cannot exceed 50 characters']
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    name: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  privacy: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    expiresAt: Date,
    allowMultipleChoices: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ privacy: 1, isActive: 1 });
// Note: type field already has index: true in field definition, so no separate index needed
// Search-related indexes (weighted)
postSchema.index({ content: 'text', hashtags: 'text' }, { weights: { content: 10, hashtags: 5 } });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments || 0; // Will be populated from Comment model
});

// Virtual for share count
postSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Virtual for bookmark count
postSchema.virtual('bookmarkCount').get(function() {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Virtual for engagement score
postSchema.virtual('engagementScore').get(function() {
  const likes = this.likeCount;
  const comments = this.commentCount || 0;
  const shares = this.shareCount;
  const views = this.views || 0;
  
  // Weighted engagement score
  return (likes * 2) + (comments * 3) + (shares * 4) + (views * 0.1);
});

// Virtual for post URL
postSchema.virtual('postUrl').get(function() {
  return `/post/${this._id}`;
});

// Instance method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  // Handle edge cases where likes array might be undefined or null
  if (!this.likes || !Array.isArray(this.likes)) {
    return false;
  }
  
  // Check if user has liked this post
  return this.likes.some(like => {
    // Handle different possible structures of like objects
    if (!like || !like.user) return false;
    
    // Compare user IDs
    try {
      const likeUserId = like.user.toString ? like.user.toString() : String(like.user);
      const targetUserId = userId.toString ? userId.toString() : String(userId);
      return likeUserId === targetUserId;
    } catch (error) {
      console.error('Error comparing user IDs in isLikedBy:', error);
      return false;
    }
  });
};

// Instance method to check if user shared the post
postSchema.methods.isSharedBy = function(userId) {
  return this.shares.some(share => share.user.toString() === userId.toString());
};

// Instance method to check if user bookmarked the post
postSchema.methods.isBookmarkedBy = function(userId) {
  // Handle edge cases where bookmarks array might be undefined or null
  if (!this.bookmarks || !Array.isArray(this.bookmarks)) {
    return false;
  }
  
  // Check if user has bookmarked this post
  return this.bookmarks.some(bookmark => {
    // Handle different possible structures of bookmark objects
    if (!bookmark || !bookmark.user) return false;
    
    // Compare user IDs
    try {
      const bookmarkUserId = bookmark.user.toString ? bookmark.user.toString() : String(bookmark.user);
      const targetUserId = userId.toString ? userId.toString() : String(userId);
      return bookmarkUserId === targetUserId;
    } catch (error) {
      console.error('Error comparing user IDs in isBookmarkedBy:', error);
      return false;
    }
  });
};

// Instance method to add like
postSchema.methods.addLike = function(userId) {
  // Initialize likes array if it doesn't exist
  if (!this.likes || !Array.isArray(this.likes)) {
    this.likes = [];
  }
  
  const alreadyLiked = this.isLikedBy(userId);
  if (!alreadyLiked) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Instance method to remove like
postSchema.methods.removeLike = function(userId) {
  // Initialize likes array if it doesn't exist
  if (!this.likes || !Array.isArray(this.likes)) {
    this.likes = [];
    return this.save();
  }
  
  this.likes = this.likes.filter(like => {
    // Handle different possible structures of like objects
    if (!like || !like.user) return true;
    
    // Compare user IDs
    try {
      const likeUserId = like.user.toString ? like.user.toString() : String(like.user);
      const targetUserId = userId.toString ? userId.toString() : String(userId);
      return likeUserId !== targetUserId;
    } catch (error) {
      console.error('Error comparing user IDs in removeLike:', error);
      return true; // Keep the like if we can't compare
    }
  });
  return this.save();
};

// Instance method to add share
postSchema.methods.addShare = function(userId) {
  console.log(`addShare called with userId: ${userId}`);
  console.log(`Current shares:`, this.shares);
  const alreadyShared = this.isSharedBy(userId);
  console.log(`User ${userId} already shared: ${alreadyShared}`);
  if (!alreadyShared) {
    console.log(`Adding share for user ${userId}`);
    this.shares.push({ user: userId });
    console.log(`Shares after adding:`, this.shares);
  } else {
    console.log(`User ${userId} already shared this post, not adding again`);
  }
  console.log(`Saving post with shares:`, this.shares);
  return this.save();
};

// Instance method to add bookmark
postSchema.methods.addBookmark = function(userId) {
  // Initialize bookmarks array if it doesn't exist
  if (!this.bookmarks || !Array.isArray(this.bookmarks)) {
    this.bookmarks = [];
  }
  
  const alreadyBookmarked = this.isBookmarkedBy(userId);
  if (!alreadyBookmarked) {
    this.bookmarks.push({ user: userId });
  }
  return this.save();
};

// Instance method to remove bookmark
postSchema.methods.removeBookmark = function(userId) {
  // Initialize bookmarks array if it doesn't exist
  if (!this.bookmarks || !Array.isArray(this.bookmarks)) {
    this.bookmarks = [];
    return this.save();
  }
  
  this.bookmarks = this.bookmarks.filter(bookmark => {
    // Handle different possible structures of bookmark objects
    if (!bookmark || !bookmark.user) return true;
    
    // Compare user IDs
    try {
      const bookmarkUserId = bookmark.user.toString ? bookmark.user.toString() : String(bookmark.user);
      const targetUserId = userId.toString ? userId.toString() : String(userId);
      return bookmarkUserId !== targetUserId;
    } catch (error) {
      console.error('Error comparing user IDs in removeBookmark:', error);
      return true; // Keep the bookmark if we can't compare
    }
  });
  return this.save();
};

// Instance method to increment views
postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to get feed posts
postSchema.statics.getFeedPosts = function(options = {}) {
  const { 
    userId, 
    feedType = 'for-you', 
    limit = 20, 
    skip = 0,
    followingIds = []
  } = options;

  let query = { isActive: true };
  let sort = { createdAt: -1 };

  switch (feedType) {
    case 'following':
      if (followingIds.length > 0) {
        query.author = { $in: followingIds };
      } else {
        // If no following, show user's own posts
        query.author = userId;
      }
      break;
    
    case 'trending':
      // Get posts from last 7 days and sort by engagement
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: weekAgo };
      sort = { views: -1, createdAt: -1 };
      break;
    
    case 'for-you':
    default:
      // Personalized feed - all public posts
      query.privacy = 'public';
      break;
  }

  return this.find(query)
    .populate('author', 'username displayName avatar isVerified')
    .populate('mentions', 'username displayName')
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to search posts
postSchema.statics.searchPosts = function(query, options = {}) {
  const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { content: searchRegex },
      { hashtags: { $in: [searchRegex] } }
    ],
    isActive: true,
    privacy: 'public'
  })
  .populate('author', 'username displayName avatar isVerified')
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip);
};

module.exports = mongoose.model('Post', postSchema);

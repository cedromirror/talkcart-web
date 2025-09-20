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
  console.log(`isLikedBy called with userId: ${userId}`);
  console.log(`Current likes:`, this.likes);
  const result = this.likes.some(like => {
    const isMatch = like.user.toString() === userId.toString();
    console.log(`Comparing ${like.user} with ${userId}: ${isMatch}`);
    return isMatch;
  });
  console.log(`isLikedBy result: ${result}`);
  return result;
};

// Instance method to check if user shared the post
postSchema.methods.isSharedBy = function(userId) {
  return this.shares.some(share => share.user.toString() === userId.toString());
};

// Instance method to check if user bookmarked the post
postSchema.methods.isBookmarkedBy = function(userId) {
  console.log(`isBookmarkedBy called with userId: ${userId}`);
  console.log(`Current bookmarks:`, this.bookmarks);
  const result = this.bookmarks.some(bookmark => {
    const isMatch = bookmark.user.toString() === userId.toString();
    console.log(`Comparing ${bookmark.user} with ${userId}: ${isMatch}`);
    return isMatch;
  });
  console.log(`isBookmarkedBy result: ${result}`);
  return result;
};

// Instance method to add like
postSchema.methods.addLike = function(userId) {
  console.log(`addLike called with userId: ${userId}`);
  console.log(`Current likes:`, this.likes);
  const alreadyLiked = this.isLikedBy(userId);
  console.log(`User ${userId} already liked: ${alreadyLiked}`);
  if (!alreadyLiked) {
    console.log(`Adding like for user ${userId}`);
    this.likes.push({ user: userId });
    console.log(`Likes after adding:`, this.likes);
  } else {
    console.log(`User ${userId} already liked this post, not adding again`);
  }
  console.log(`Saving post with likes:`, this.likes);
  return this.save();
};

// Instance method to remove like
postSchema.methods.removeLike = function(userId) {
  console.log(`removeLike called with userId: ${userId}`);
  console.log(`Current likes before removal:`, this.likes);
  this.likes = this.likes.filter(like => {
    const shouldKeep = like.user.toString() !== userId.toString();
    console.log(`Keeping like from user ${like.user}: ${shouldKeep}`);
    return shouldKeep;
  });
  console.log(`Likes after removal:`, this.likes);
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
  console.log(`addBookmark called with userId: ${userId}`);
  console.log(`Current bookmarks:`, this.bookmarks);
  const alreadyBookmarked = this.isBookmarkedBy(userId);
  console.log(`User ${userId} already bookmarked: ${alreadyBookmarked}`);
  if (!alreadyBookmarked) {
    console.log(`Adding bookmark for user ${userId}`);
    this.bookmarks.push({ user: userId });
    console.log(`Bookmarks after adding:`, this.bookmarks);
  } else {
    console.log(`User ${userId} already bookmarked this post, not adding again`);
  }
  console.log(`Saving post with bookmarks:`, this.bookmarks);
  return this.save();
};

// Instance method to remove bookmark
postSchema.methods.removeBookmark = function(userId) {
  console.log(`removeBookmark called with userId: ${userId}`);
  console.log(`Current bookmarks before removal:`, this.bookmarks);
  this.bookmarks = this.bookmarks.filter(bookmark => {
    const shouldKeep = bookmark.user.toString() !== userId.toString();
    console.log(`Keeping bookmark from user ${bookmark.user}: ${shouldKeep}`);
    return shouldKeep;
  });
  console.log(`Bookmarks after removal:`, this.bookmarks);
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

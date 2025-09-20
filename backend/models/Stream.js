const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  thumbnail: {
    public_id: String,
    secure_url: String,
    url: String
  },
  streamUrl: String, // RTMP or streaming URL
  playbackUrl: String, // HLS or playback URL
  streamKey: String, // Private stream key for broadcasting
  category: {
    type: String,
    required: true,
    enum: ['Technology', 'Art & Design', 'Gaming', 'Music', 'Education', 'Entertainment', 'Finance', 'Business', 'Lifestyle', 'Sports', 'Other']
  },
  tags: [String],
  language: {
    type: String,
    default: 'English'
  },
  isLive: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledAt: Date,
  isRecording: {
    type: Boolean,
    default: false
  },
  viewerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  peakViewerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  },
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  startedAt: Date,
  endedAt: Date,
  settings: {
    allowChat: { type: Boolean, default: true },
    allowDonations: { type: Boolean, default: true },
    allowRecording: { type: Boolean, default: true },
    isSubscriberOnly: { type: Boolean, default: false },
    isMatureContent: { type: Boolean, default: false },
    maxViewers: { type: Number, default: 10000 },
    chatSlowMode: { type: Number, default: 0 }, // seconds between messages
    requireFollowToChat: { type: Boolean, default: false },
    autoModeration: { type: Boolean, default: true },
    quality: {
      resolution: { type: String, default: '1080p' },
      bitrate: { type: Number, default: 2500 },
      fps: { type: Number, default: 30 }
    }
  },
  monetization: {
    subscriptionPrice: { type: Number, default: 0 },
    donationGoal: { type: Number, default: 0 },
    totalDonations: { type: Number, default: 0 },
    minimumDonation: { type: Number, default: 1 },
    donationCurrency: { type: String, default: 'USD' }
  },
  moderators: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: [String], // ['moderate_chat', 'timeout_users', 'ban_users', 'delete_messages']
    addedAt: { type: Date, default: Date.now }
  }],
  moderation: {
    bannedUsers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      until: { type: Date, default: null }, // null means permanent
      createdAt: { type: Date, default: Date.now }
    }],
    timeouts: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      until: { type: Date, required: true }, // required for timeout
      createdAt: { type: Date, default: Date.now }
    }]
  },
  analytics: {
    totalChatMessages: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalShares: { type: Number, default: 0 },
    newFollowers: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    averageWatchTime: { type: Number, default: 0 }
  },
  health: {
    status: { type: String, default: 'offline' }, // 'live', 'offline', 'starting', 'stopping'
    bitrate: { type: Number, default: 0 },
    fps: { type: Number, default: 0 },
    quality: { type: String, default: 'unknown' }, // 'excellent', 'good', 'fair', 'poor'
    latency: { type: Number, default: 0 }, // in seconds
    droppedFrames: { type: Number, default: 0 }
  },
  // User interactions
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports: [{
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String, default: '' },
    reportedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved', 'dismissed'], default: 'pending' }
  }],
}, {
  timestamps: true
});

streamSchema.index({ streamerId: 1, isLive: 1 });
streamSchema.index({ category: 1, isLive: 1 });
streamSchema.index({ title: 'text', description: 'text', tags: 'text' });
streamSchema.index({ isLive: -1, viewerCount: -1 });

module.exports = mongoose.model('Stream', streamSchema);
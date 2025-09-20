const mongoose = require('mongoose');

const streamGiftSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  giftType: {
    type: String,
    enum: ['heart', 'star', 'diamond', 'crown', 'rocket', 'unicorn', 'rainbow', 'fireworks'],
    required: true
  },
  giftName: {
    type: String,
    required: true
  },
  giftEmoji: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
streamGiftSchema.index({ streamId: 1, createdAt: -1 });
streamGiftSchema.index({ receiverId: 1, createdAt: -1 });
streamGiftSchema.index({ senderId: 1, createdAt: -1 });

// Static methods
streamGiftSchema.statics.getStreamGifts = async function(streamId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ streamId })
    .populate('senderId', 'username displayName avatar')
    .populate('receiverId', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

streamGiftSchema.statics.getTotalGiftsValue = async function(streamId) {
  const result = await this.aggregate([
    { $match: { streamId: new mongoose.Types.ObjectId(streamId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  return result.length > 0 ? result[0].total : 0;
};

module.exports = mongoose.model('StreamGift', streamGiftSchema);

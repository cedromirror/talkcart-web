const mongoose = require('mongoose');

const streamDonationSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'ETH', 'BTC']
  },
  message: {
    type: String,
    maxlength: 300
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'crypto', 'wallet'],
    required: true
  },
  transactionId: String,
  processingFee: {
    type: Number,
    default: 0
  },
  netAmount: Number, // Amount after fees
  isHighlighted: {
    type: Boolean,
    default: false
  },
  highlightColor: String,
  sound: String, // Sound effect to play
  displayDuration: {
    type: Number,
    default: 5 // seconds to display on stream
  }
}, {
  timestamps: true
});

// Indexes
streamDonationSchema.index({ streamId: 1, createdAt: -1 });
streamDonationSchema.index({ streamerId: 1, status: 1 });
streamDonationSchema.index({ donorId: 1, createdAt: -1 });

// Pre-save middleware to calculate net amount
streamDonationSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('processingFee')) {
    this.netAmount = this.amount - (this.processingFee || 0);
  }
  next();
});

module.exports = mongoose.model('StreamDonation', streamDonationSchema);
const mongoose = require('mongoose');

const chatbotConversationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotMessage'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  // Chatbot-specific settings
  botEnabled: {
    type: Boolean,
    default: true
  },
  botPersonality: {
    type: String,
    enum: ['friendly', 'professional', 'concise'],
    default: 'friendly'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatbotConversationSchema.index({ customerId: 1, vendorId: 1, productId: 1 });
chatbotConversationSchema.index({ vendorId: 1, isActive: 1 });
chatbotConversationSchema.index({ productId: 1 });
chatbotConversationSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('ChatbotConversation', chatbotConversationSchema);
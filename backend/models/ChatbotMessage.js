const mongoose = require('mongoose');

const chatbotMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotConversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'system', 'suggestion'],
    default: 'text'
  },
  // Bot-specific fields
  isBotMessage: {
    type: Boolean,
    default: false
  },
  botConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  suggestedResponses: [{
    text: String,
    action: String // e.g., 'ask_price', 'ask_availability', 'request_demo'
  }],
  // Metadata for analytics
  responseTime: Number, // in milliseconds
  userSatisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatbotMessage'
    }
  }
}, {
  timestamps: true
});

chatbotMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatbotMessageSchema.index({ senderId: 1 });
chatbotMessageSchema.index({ isBotMessage: 1 });

module.exports = mongoose.model('ChatbotMessage', chatbotMessageSchema);

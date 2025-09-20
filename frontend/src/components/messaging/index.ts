// Modern Messaging Components (Recommended)
export { default as ModernMessageBubble } from './ModernMessageBubble';
export { default as ModernVoiceMessageBubble } from './ModernVoiceMessageBubble';
export { default as ModernConversationList } from './ModernConversationList';
export { default as ModernMessageInput } from './ModernMessageInput';

// Legacy Components (deprecated - kept for backward compatibility)
// Note: These will be removed in a future version
// export { default as EnhancedMessageBubbleV2 } from './EnhancedMessageBubbleV2';
// export { default as VoiceMessageBubble } from './VoiceMessageBubble';

// Type exports
export type { Message, Conversation, MessageMedia, MessageReaction, ReadReceipt } from '@/types/message';
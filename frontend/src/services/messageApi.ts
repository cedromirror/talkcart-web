import axios from 'axios';
import { Message } from '@/types/message';
import { Conversation } from '@/types/conversation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const messageApi = axios.create({
  baseURL: `${API_BASE_URL}/api/messages`,
  timeout: 10000,
});

// Add auth token to requests
messageApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Type aliases for compatibility with useMessages hook
export type ConversationData = Conversation;
export type MessageData = Message;

export interface ConversationSettings {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  allowInvites?: boolean;
  muteNotifications?: boolean;
}

export interface SendMessageRequest {
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'media';
  media?: Array<{
    type: string;
    url: string;
    filename: string;
    public_id: string;
  }>;
  replyTo?: string;
}

export interface SendMessageResponse {
  success: boolean;
  data: Message;
  message: string;
}

export interface EditMessageRequest {
  content: string;
}

export interface EditMessageResponse {
  success: boolean;
  data: Message;
  message: string;
}

export interface ForwardMessageRequest {
  conversationIds: string[];
  message?: string;
}

export interface ForwardMessageResponse {
  success: boolean;
  data: {
    forwardedMessages: Message[];
    successCount: number;
    failedCount: number;
  };
  message: string;
}

export interface ReactionRequest {
  emoji: string;
}

export interface ReactionResponse {
  success: boolean;
  data: {
    messageId: string;
    reactions: Array<{
      userId: string;
      emoji: string;
      createdAt: string;
    }>;
  };
  message: string;
}

/**
 * Get a single conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<ConversationData> => {
  try {
    const response = await messageApi.get(`/conversations/${conversationId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Get conversation error:', error);
    throw error.response?.data || { success: false, error: 'Failed to get conversation' };
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (
  participantIds: string[],
  isGroup: boolean = false,
  groupName?: string,
  groupDescription?: string
): Promise<ConversationData> => {
  try {
    const response = await messageApi.post('/conversations', {
      participantIds,
      isGroup,
      groupName,
      groupDescription
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Create conversation error:', error);
    throw error.response?.data || { success: false, error: 'Failed to create conversation' };
  }
};

/**
 * Update conversation settings
 */
export const updateConversationSettings = async (
  conversationId: string,
  settings: ConversationSettings
): Promise<ConversationData> => {
  try {
    const response = await messageApi.put(`/conversations/${conversationId}/settings`, settings);
    return response.data.data;
  } catch (error: any) {
    console.error('Update conversation settings error:', error);
    throw error.response?.data || { success: false, error: 'Failed to update conversation settings' };
  }
};

/**
 * Add members to a group conversation
 */
export const addGroupMembers = async (
  conversationId: string,
  memberIds: string[]
): Promise<ConversationData> => {
  try {
    const response = await messageApi.post(`/conversations/${conversationId}/members`, {
      memberIds
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Add group members error:', error);
    throw error.response?.data || { success: false, error: 'Failed to add group members' };
  }
};

/**
 * Remove a member from a group conversation
 */
export const removeGroupMember = async (
  conversationId: string,
  memberId: string
): Promise<ConversationData> => {
  try {
    const response = await messageApi.delete(`/conversations/${conversationId}/members/${memberId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Remove group member error:', error);
    throw error.response?.data || { success: false, error: 'Failed to remove group member' };
  }
};

/**
 * Send a new message to a conversation
 */
export const sendMessage = async (
  conversationId: string,
  messageData: SendMessageRequest
): Promise<SendMessageResponse> => {
  try {
    const response = await messageApi.post<SendMessageResponse>(
      `/conversations/${conversationId}/messages`,
      messageData
    );
    return response.data;
  } catch (error: any) {
    console.error('Send message error:', error);
    throw error.response?.data || { success: false, error: 'Failed to send message' };
  }
};

/**
 * Edit an existing message
 */
export const editMessage = async (
  messageId: string,
  editData: EditMessageRequest
): Promise<EditMessageResponse> => {
  try {
    const response = await messageApi.put<EditMessageResponse>(
      `/${messageId}/edit`,
      editData
    );
    return response.data;
  } catch (error: any) {
    console.error('Edit message error:', error);
    throw error.response?.data || { success: false, error: 'Failed to edit message' };
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await messageApi.delete(`/${messageId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete message error:', error);
    throw error.response?.data || { success: false, error: 'Failed to delete message' };
  }
};

/**
 * Forward a message to multiple conversations
 */
export const forwardMessage = async (
  messageId: string,
  forwardData: ForwardMessageRequest
): Promise<ForwardMessageResponse> => {
  try {
    const response = await messageApi.post<ForwardMessageResponse>(
      `/${messageId}/forward`,
      forwardData
    );
    return response.data;
  } catch (error: any) {
    console.error('Forward message error:', error);
    throw error.response?.data || { success: false, error: 'Failed to forward message' };
  }
};

/**
 * Add or remove a reaction to/from a message
 */
export const toggleReaction = async (
  messageId: string,
  reactionData: ReactionRequest
): Promise<ReactionResponse> => {
  try {
    const response = await messageApi.post<ReactionResponse>(
      `/${messageId}/reactions`,
      reactionData
    );
    return response.data;
  } catch (error: any) {
    console.error('Toggle reaction error:', error);
    throw error.response?.data || { success: false, error: 'Failed to toggle reaction' };
  }
};

/**
 * Mark messages as read
 */
export const markMessageAsRead = async (messageId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await messageApi.put(`/${messageId}/read`);
    return response.data;
  } catch (error: any) {
    console.error('Mark as read error:', error);
    throw error.response?.data || { success: false, error: 'Failed to mark message as read' };
  }
};

/**
 * Get messages for a conversation with pagination
 */
export const getMessages = async (
  conversationId: string,
  options: {
    limit?: number;
    page?: number;
    before?: string;
  } = {}
): Promise<{
  success: boolean;
  data: {
    messages: Message[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalMessages: number;
      hasMore: boolean;
    };
  };
}> => {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.before) params.append('before', options.before);

    const response = await messageApi.get(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Get messages error:', error);
    throw error.response?.data || { success: false, error: 'Failed to get messages' };
  }
};

/**
 * Search messages in a conversation
 */
export const searchMessages = async (
  conversationId: string,
  query: string,
  options: {
    limit?: number;
    page?: number;
  } = {}
): Promise<{
  success: boolean;
  data: {
    messages: Message[];
    totalResults: number;
    pagination: {
      currentPage: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}> => {
  try {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());

    const response = await messageApi.get(
      `/conversations/${conversationId}/search?${params.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Search messages error:', error);
    throw error.response?.data || { success: false, error: 'Failed to search messages' };
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markAllAsRead = async (conversationId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await messageApi.put(`/conversations/${conversationId}/read`);
    return response.data;
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    throw error.response?.data || { success: false, error: 'Failed to mark all messages as read' };
  }
};

/**
 * Send typing indicator
 */
export const sendTypingIndicator = async (
  conversationId: string,
  isTyping: boolean
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await messageApi.post(`/conversations/${conversationId}/typing`, {
      isTyping
    });
    return response.data;
  } catch (error: any) {
    console.error('Typing indicator error:', error);
    throw error.response?.data || { success: false, error: 'Failed to send typing indicator' };
  }
};

/**
 * Aliases for compatibility with useMessages hook
 */
export const markAsRead = markMessageAsRead;
export const addReaction = toggleReaction;

export default {
  // Conversation functions
  getConversation,
  createConversation,
  updateConversationSettings,
  addGroupMembers,
  removeGroupMember,

  // Message functions
  sendMessage,
  editMessage,
  deleteMessage,
  forwardMessage,
  toggleReaction,
  markMessageAsRead,
  markAllAsRead,
  markAsRead,
  addReaction,
  getMessages,
  searchMessages,
  sendTypingIndicator,
};
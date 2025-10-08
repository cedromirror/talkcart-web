import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const chatbotApi = axios.create({
    baseURL: `${API_BASE_URL}/api/chatbot`,
    timeout: 10000,
});

// Add auth token to requests
chatbotApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface ChatbotConversation {
    _id: string;
    customerId: string;
    vendorId: string;
    productId: string;
    productName: string;
    lastMessage?: ChatbotMessage;
    lastActivity: string;
    isActive: boolean;
    isResolved: boolean;
    botEnabled: boolean;
    botPersonality: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatbotMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'system' | 'suggestion';
    isBotMessage: boolean;
    botConfidence?: number;
    suggestedResponses?: Array<{
        text: string;
        action: string;
    }>;
    responseTime?: number;
    userSatisfaction?: number;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Vendor {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
    followerCount: number;
    followingCount: number;
    productCount: number;
}

export interface Customer {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    createdAt: string;
    orderCount: number;
}

export interface GetConversationsResponse {
    success: boolean;
    data: {
        conversations: ChatbotConversation[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalConversations: number;
            hasMore: boolean;
        };
    };
}

export interface SearchVendorsResponse {
    success: boolean;
    data: {
        vendors: Vendor[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}

export interface SearchCustomersResponse {
    success: boolean;
    data: {
        customers: Customer[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}

export interface CreateConversationRequest {
    vendorId: string;
    productId: string;
}

export interface CreateConversationResponse {
    success: boolean;
    data: {
        conversation: ChatbotConversation;
        isNew: boolean;
    };
    message: string;
}

export interface SendMessageRequest {
    content: string;
}

export interface SendMessageResponse {
    success: boolean;
    data: {
        message: ChatbotMessage;
    };
    message: string;
}

/**
 * Get user chatbot conversations
 */
export const getConversations = async (options: {
    limit?: number;
    page?: number;
} = {}): Promise<GetConversationsResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await chatbotApi.get(`/conversations?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot conversations error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get conversations' };
    }
};

/**
 * Search vendors for messaging
 */
export const searchVendors = async (options: {
    search?: string;
    limit?: number;
    page?: number;
} = {}): Promise<SearchVendorsResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await chatbotApi.get(`/search/vendors?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search vendors error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search vendors' };
    }
};

/**
 * Search customers for messaging
 */
export const searchCustomers = async (options: {
    search?: string;
    limit?: number;
    page?: number;
} = {}): Promise<SearchCustomersResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await chatbotApi.get(`/search/customers?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search customers error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search customers' };
    }
};

/**
 * Create new chatbot conversation
 */
export const createConversation = async (
    data: CreateConversationRequest
): Promise<CreateConversationResponse> => {
    try {
        const response = await chatbotApi.post('/conversations', data);
        return response.data;
    } catch (error: any) {
        console.error('Create chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to create conversation' };
    }
};

/**
 * Get a specific chatbot conversation
 */
export const getConversation = async (conversationId: string): Promise<{ success: boolean; data: { conversation: ChatbotConversation } }> => {
    try {
        const response = await chatbotApi.get(`/conversations/${conversationId}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get conversation' };
    }
};

/**
 * Get messages in a chatbot conversation
 */
export const getMessages = async (conversationId: string, options: {
    limit?: number;
    page?: number;
    before?: string;
} = {}): Promise<{
    success: boolean;
    data: {
        messages: ChatbotMessage[];
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

        const response = await chatbotApi.get(`/conversations/${conversationId}/messages?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot messages error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get messages' };
    }
};

/**
 * Send message in chatbot conversation
 */
export const sendMessage = async (
    conversationId: string,
    data: SendMessageRequest
): Promise<SendMessageResponse> => {
    try {
        const response = await chatbotApi.post(`/conversations/${conversationId}/messages`, data);
        return response.data;
    } catch (error: any) {
        console.error('Send chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send message' };
    }
};

/**
 * Edit a chatbot message
 */
export const editMessage = async (
    conversationId: string,
    messageId: string,
    data: { content: string }
): Promise<SendMessageResponse> => {
    try {
        const response = await chatbotApi.put(`/conversations/${conversationId}/messages/${messageId}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Edit chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to edit message' };
    }
};

/**
 * Delete a chatbot message
 */
export const deleteMessage = async (
    conversationId: string,
    messageId: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await chatbotApi.delete(`/conversations/${conversationId}/messages/${messageId}`);
        return response.data;
    } catch (error: any) {
        console.error('Delete chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to delete message' };
    }
};

/**
 * Reply to a chatbot message
 */
export const replyToMessage = async (
    conversationId: string,
    messageId: string,
    data: SendMessageRequest
): Promise<SendMessageResponse> => {
    try {
        const response = await chatbotApi.post(`/conversations/${conversationId}/messages/${messageId}/reply`, data);
        return response.data;
    } catch (error: any) {
        console.error('Reply to chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send reply' };
    }
};

/**
 * Mark chatbot conversation as resolved
 */
export const resolveConversation = async (conversationId: string): Promise<{ success: boolean; data: { conversation: ChatbotConversation }; message: string }> => {
    try {
        const response = await chatbotApi.put(`/conversations/${conversationId}/resolve`);
        return response.data;
    } catch (error: any) {
        console.error('Resolve chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to resolve conversation' };
    }
};

/**
 * Close chatbot conversation
 */
export const closeConversation = async (conversationId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await chatbotApi.delete(`/conversations/${conversationId}`);
        return response.data;
    } catch (error: any) {
        console.error('Close chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to close conversation' };
    }
};

export default {
    getConversations,
    searchVendors,
    searchCustomers,
    createConversation,
    getConversation,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    resolveConversation,
    closeConversation,
};



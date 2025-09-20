import axios from 'axios';
import { Conversation } from '@/types/conversation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const conversationApi = axios.create({
    baseURL: `${API_BASE_URL}/api/messages`,
    timeout: 10000,
});

// Add auth token to requests
conversationApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface GetConversationsResponse {
    success: boolean;
    data: {
        conversations: Conversation[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalConversations: number;
            hasMore: boolean;
        };
    };
}

/**
 * Get user conversations
 */
export const getConversations = async (options: {
    limit?: number;
    page?: number;
} = {}): Promise<GetConversationsResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await conversationApi.get(`/conversations?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get conversations error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get conversations' };
    }
};

export default {
    getConversations,
};
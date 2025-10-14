import axios from 'axios';
import { Conversation } from '@/types/conversation';
import { API_URL, TIMEOUTS } from '@/config/index';

const BROWSER_BASE = `${API_URL}/messages`; // API_URL is '/api' in browser
const SERVER_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/messages`;

// Create axios instance with default config
const conversationApi = axios.create({
    baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
    timeout: TIMEOUTS.API_REQUEST,
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
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());

    const url = `/conversations?${params.toString()}`;

    // Simple retry logic for transient errors/timeouts
    let attempt = 0;
    const maxRetries = 2;
    let lastError: any = null;
    while (attempt <= maxRetries) {
        try {
            const response = await conversationApi.get(url, {
                // per-request override can extend timeout slightly on retries
                timeout: attempt === 0 ? TIMEOUTS.API_REQUEST : Math.min(TIMEOUTS.API_REQUEST + attempt * 5000, TIMEOUTS.API_REQUEST * 2),
            });
            return response.data;
        } catch (error: any) {
            lastError = error;
            const isTimeout = error?.code === 'ECONNABORTED' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('timeout'));
            const isNetwork = typeof error?.message === 'string' && error.message.toLowerCase().includes('network');
            if (attempt < maxRetries && (isTimeout || isNetwork)) {
                attempt += 1;
                // Try again
                continue;
            }
            break;
        }
    }
    console.error('Get conversations error:', lastError);
    throw lastError?.response?.data || { success: false, error: 'Failed to get conversations' };
};

export default {
    getConversations,
};
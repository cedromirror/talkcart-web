import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, TIMEOUTS } from '@/config/index';
import { api } from '@/lib/api';

export interface UserSuggestion {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  followerCount: number;
  postCount: number;
  bio: string;
  isOnline: boolean;
  lastSeen: string;
  suggestionReason: string;
}

interface UserSuggestionsResponse {
  success: boolean;
  data: {
    suggestions: UserSuggestion[];
    total: number;
  };
  message: string;
}

interface UseUserSuggestionsOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseUserSuggestionsOptions {
  limit?: number;
  enabled?: boolean;
  search?: string;
}

export const useUserSuggestions = (options: UseUserSuggestionsOptions = {}) => {
  const { limit = 5, enabled = true, search } = options;
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const params = new URLSearchParams({ limit: String(limit) });
      if (search && search.trim()) params.set('search', search.trim());

      const url = `${API_URL}/users/suggestions?${params.toString()}`;

      // Retry GET with backoff similar to api.ts
      let attempt = 0;
      const maxRetries = 2;
      let lastError: any = null;
      let response: { data: UserSuggestionsResponse } | null = null;
      while (attempt <= maxRetries) {
        try {
          response = await axios.get<UserSuggestionsResponse>(url, {
            headers,
            timeout: attempt === 0 ? Math.min(TIMEOUTS.API_REQUEST, 15000) : Math.min(TIMEOUTS.API_REQUEST + attempt * 5000, TIMEOUTS.API_REQUEST * 2),
          });
          break;
        } catch (err: any) {
          lastError = err;
          const isTimeout = err?.code === 'ECONNABORTED' || (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'));
          const isNetwork = typeof err?.message === 'string' && err.message.toLowerCase().includes('network');
          if (attempt < maxRetries && (isTimeout || isNetwork)) {
            attempt += 1;
            continue;
          }
          break;
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to fetch user suggestions');
      }

      if (response.data.success) {
        setSuggestions(response.data.data.suggestions);
      } else {
        setError('Failed to fetch user suggestions');
      }
    } catch (err: any) {
      console.error('Error fetching user suggestions:', err);
      setError(err.response?.data?.message || 'Failed to fetch user suggestions');
    } finally {
      setLoading(false);
    }
  };

  const followUser = async (userId: string) => {
    try {
      // Use shared API client with auto-refresh and normalized errors
      const res = await api.users.follow(userId);
      if (!res?.success) {
        throw new Error(res?.message || res?.error || 'Failed to follow user');
      }

      // Remove the followed user from suggestions
      setSuggestions(prev => prev.filter(user => user.id !== userId));
      
      return { success: true };
    } catch (err: any) {
      console.error('Error following user:', err);

      // Normalize session expiration for consistent UX
      const name = err?.name;
      const message = String(err?.message || '').toLowerCase();
      if (name === 'SessionExpiredError' || message.includes('session expired')) {
        return { success: false, error: 'Your session expired. Please log in again.' };
      }

      const msg = (err?.message || '').toLowerCase().includes('timeout')
        ? 'Network is slow. Please try again.'
        : (err.response?.data?.message || err?.message || 'Failed to follow user');
      return { success: false, error: msg };
    }
  };

  const refreshSuggestions = () => {
    fetchSuggestions();
  };

  useEffect(() => {
    fetchSuggestions();
  }, [limit, enabled]);

  return {
    suggestions,
    loading,
    error,
    followUser,
    refreshSuggestions
  };
};
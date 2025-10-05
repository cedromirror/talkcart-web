import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { API_URL } from '@/config';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system' | 'tag' | 'order' | 'payment' | 'product_approved' | 'product_rejected' | 'share' | 'message' | 'view';
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  data?: {
    postId?: string;
    commentId?: string;
    userId?: string;
    url?: string;
    orderId?: string;
    productId?: string;
  };
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  addNotification: (notification: Notification) => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const { isAuthenticated } = useAuth();
  const { socket } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!isAuthenticated) return;
    
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/notifications?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        // The backend doesn't return unreadCount directly in this endpoint
        // We need to fetch it separately
        fetchUnreadCount();
      } else {
        throw new Error(data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getToken]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.data.unreadCount);
      } else {
        throw new Error(data.message || 'Failed to fetch unread count');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count';
      console.error(errorMessage);
    }
  }, [isAuthenticated, getToken]);

  // Add a new notification to the list
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    const token = getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true } 
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      } else {
        throw new Error(data.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      console.error(errorMessage);
      return false;
    }
  }, [isAuthenticated, getToken]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    const token = getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
        return true;
      } else {
        throw new Error(data.message || 'Failed to mark all notifications as read');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      console.error(errorMessage);
      return false;
    }
  }, [isAuthenticated, getToken]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    const token = getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      const data = await response.json();
      if (data.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update unread count if the deleted notification was unread
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete notification');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      console.error(errorMessage);
      return false;
    }
  }, [isAuthenticated, getToken, notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    const token = getToken();
    if (!token) return false;

    try {
      // First, get all notification IDs
      const notificationIds = notifications.map(n => n.id);
      
      // If there are no notifications, we're done
      if (notificationIds.length === 0) {
        return true;
      }

      // Delete all notifications by calling the delete endpoint for each
      const deletePromises = notificationIds.map(id => 
        fetch(`${API_URL}/notifications/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      );
      
      await Promise.all(deletePromises);
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear all notifications';
      console.error(errorMessage);
      return false;
    }
  }, [isAuthenticated, getToken, notifications]);

  // Load initial notifications
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  // Set up real-time notifications with WebSocket
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleNewNotification = (notification: Notification) => {
      addNotification(notification);
      // Show a toast notification
      toast.success(`New notification: ${notification.content}`, {
        duration: 4000,
        icon: '🔔'
      });
    };

    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    // Listen for new notifications
    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread-count', handleUnreadCountUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread-count', handleUnreadCountUpdate);
    };
  }, [socket, isAuthenticated, addNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification
  };
};

export default useNotifications;
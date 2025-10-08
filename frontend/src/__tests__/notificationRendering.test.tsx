/**
 * Test file to verify notification rendering
 * This simulates the notification component rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationsPage from '../../pages/notifications';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user-id', username: 'testuser1' },
    loading: false
  })
}));

// Mock the WebSocketContext
jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: null,
    isConnected: false
  })
}));

// Mock the useNotifications hook
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      {
        id: '1',
        type: 'like',
        title: 'New Like',
        content: 'User2 liked your post',
        isRead: false,
        createdAt: new Date().toISOString(),
        sender: {
          id: 'sender-id',
          username: 'testuser2',
          displayName: 'Test User 2',
          avatar: '/avatar.jpg'
        }
      },
      {
        id: '2',
        type: 'comment',
        title: 'New Comment',
        content: 'commented on your post: "This is a test comment"',
        isRead: true,
        createdAt: new Date().toISOString(),
        sender: {
          id: 'sender-id',
          username: 'testuser2',
          displayName: 'Test User 2',
          avatar: '/avatar.jpg'
        }
      }
    ],
    unreadCount: 1,
    loading: false,
    error: null,
    fetchNotifications: jest.fn(),
    fetchUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    addNotification: jest.fn()
  })
}));

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    query: {},
    asPath: '/notifications'
  })
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: Array<React.ReactElement> }) => {
      return <>{children}</>;
    },
  };
});

describe('NotificationsPage', () => {
  it('renders notifications correctly', () => {
    render(<NotificationsPage />);
    
    // Check that the page title is rendered
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    
    // Check that notifications are rendered
    expect(screen.getByText('New Like')).toBeInTheDocument();
    expect(screen.getByText('User2 liked your post')).toBeInTheDocument();
    
    expect(screen.getByText('New Comment')).toBeInTheDocument();
    expect(screen.getByText('commented on your post: "This is a test comment"')).toBeInTheDocument();
    
    // Check that unread count is displayed
    expect(screen.getByText('1')).toBeInTheDocument();
    
    console.log('✅ Notification rendering test passed!');
  });

  it('renders notification tabs correctly', () => {
    render(<NotificationsPage />);
    
    // Check that tabs are rendered
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Likes')).toBeInTheDocument();
    expect(screen.getByText('Comments')).toBeInTheDocument();
    expect(screen.getByText('Follows')).toBeInTheDocument();
    expect(screen.getByText('Shares')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    
    console.log('✅ Notification tabs rendering test passed!');
  });
});
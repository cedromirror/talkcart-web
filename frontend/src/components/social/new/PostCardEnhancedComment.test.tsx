import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCardEnhanced } from './PostCardEnhanced';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Post } from '@/types/social'; // Import the Post type

// Mock the contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user123' }
  })
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: {
      emit: jest.fn()
    }
  })
}));

// Mock the api
jest.mock('@/lib/api', () => ({
  api: {
    posts: {
      like: jest.fn().mockResolvedValue({}),
      bookmark: jest.fn().mockResolvedValue({}),
      share: jest.fn().mockResolvedValue({}),
    },
    users: {
      follow: jest.fn().mockResolvedValue({}),
      unfollow: jest.fn().mockResolvedValue({}),
    }
  }
}));

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('PostCardEnhanced Comment Handler', () => {
  const mockPost: Post = { // Use the Post type
    id: '1',
    type: 'image',
    content: 'Test post content',
    author: {
      id: 'author1',
      username: 'testuser',
      displayName: 'Test User'
    },
    media: [],
    createdAt: new Date().toISOString(),
    likes: 10,
    comments: 5,
    shares: 2,
    isLiked: false,
    isBookmarked: false,
    views: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onComment handler when comment button is clicked', () => {
    const mockOnComment = jest.fn();
    render(<PostCardEnhanced post={mockPost} onComment={mockOnComment} />);
    
    // Find the comment button by its icon
    const commentButton = screen.getByRole('button', { name: 'Comment' });
    fireEvent.click(commentButton);
    
    expect(mockOnComment).toHaveBeenCalledWith('1');
  });
});
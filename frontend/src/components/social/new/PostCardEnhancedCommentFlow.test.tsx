import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCardEnhanced } from './PostCardEnhanced';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRouter } from 'next/router';
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
  useRouter: jest.fn(),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn().mockReturnValue('2 hours ago'),
  parseISO: jest.fn().mockImplementation((date) => new Date(date)),
}));

describe('PostCardEnhanced Comment Flow', () => {
  const mockPost: Post = { // Use the Post type
    id: '1',
    type: 'image',
    content: 'Test post content',
    author: {
      id: 'author1',
      username: 'testuser',
      displayName: 'Test User',
      isVerified: true,
      avatar: ''
    },
    media: [
      {
        resource_type: 'image',
        secure_url: 'https://example.com/image.jpg',
      }
    ],
    createdAt: new Date().toISOString(),
    likes: 10,
    comments: 5,
    shares: 2,
    views: 100,
    isLiked: false,
    isBookmarked: false,
  };

  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  it('calls onComment handler with correct postId when comment button is clicked', () => {
    const mockOnComment = jest.fn();
    render(<PostCardEnhanced post={mockPost} onComment={mockOnComment} />);
    
    // Find the comment button by its icon
    const commentButton = screen.getByRole('button', { name: 'Comment' });
    fireEvent.click(commentButton);
    
    expect(mockOnComment).toHaveBeenCalledWith('1');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('navigates to post detail page with focus=comments when used in SocialPage context', () => {
    render(
      <PostCardEnhanced 
        post={mockPost} 
        onComment={(postId) => {
          mockRouter.push(`/post/${postId}?focus=comments`);
        }}
      />
    );
    
    // Find the comment button by its icon
    const commentButton = screen.getByRole('button', { name: 'Comment' });
    fireEvent.click(commentButton);
    
    expect(mockRouter.push).toHaveBeenCalledWith('/post/1?focus=comments');
  });
});
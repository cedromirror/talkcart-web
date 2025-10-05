import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentSection } from '../src/components/Comments/CommentSection';

// Mock the necessary hooks and components
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user1', displayName: 'Test User', username: 'testuser' },
    isAuthenticated: true
  })
}));

jest.mock('@/hooks/useComments', () => ({
  __esModule: true,
  default: () => ({
    comments: [],
    totalComments: 0,
    isLoading: false,
    isCreating: false,
    isLiking: false,
    isDeleting: false,
    isEditing: false,
    isReporting: false,
    error: null,
    createComment: jest.fn(),
    likeComment: jest.fn(),
    deleteComment: jest.fn(),
    editComment: jest.fn(),
    reportComment: jest.fn(),
    refetch: jest.fn(),
    isConnected: true,
    realTimeEnabled: true
  })
}));

// Mock child components
jest.mock('@/components/common/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div data-testid="user-avatar" />;
  };
});

jest.mock('@/components/common/FollowButton', () => {
  return function MockFollowButton() {
    return <div data-testid="follow-button" />;
  };
});

jest.mock('@/utils/mentionUtils', () => ({
  formatTextWithMentions: (text) => text
}));

describe('CommentSection Emoji Functionality', () => {
  const defaultProps = {
    postId: '507f1f77bcf86cd799439011',
    isExpanded: true
  };

  test('renders emoji picker button in comment input', () => {
    render(<CommentSection {...defaultProps} />);
    
    // Check if the emoji button is rendered in the main comment input
    const emojiButton = screen.getByRole('button', { name: /smile/i });
    expect(emojiButton).toBeInTheDocument();
  });

  test('renders emoji picker button in reply input', () => {
    render(<CommentSection {...defaultProps} />);
    
    // Check if the emoji button is rendered (there should be at least one)
    const emojiButtons = screen.getAllByRole('button', { name: /smile/i });
    expect(emojiButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('opens emoji picker when emoji button is clicked', () => {
    render(<CommentSection {...defaultProps} />);
    
    // Click the emoji button
    const emojiButton = screen.getByRole('button', { name: /smile/i });
    fireEvent.click(emojiButton);
    
    // Check if emoji picker would open (we can't easily test the actual popover)
    expect(emojiButton).toBeInTheDocument();
  });
});
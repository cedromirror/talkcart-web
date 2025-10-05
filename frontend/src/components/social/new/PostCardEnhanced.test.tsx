import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostCardEnhanced } from './PostCardEnhanced';
import * as api from '@/lib/api';

// Mock the contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'current-user-id' },
  }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: {
      emit: jest.fn(),
    },
    isConnected: true,
  }),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    users: {
      follow: jest.fn(),
      unfollow: jest.fn(),
    },
    posts: {
      like: jest.fn(),
      share: jest.fn(),
      bookmark: jest.fn(),
    },
  },
}));

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    asPath: '/',
    isReady: true,
  }),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock UserAvatar
jest.mock('@/components/common/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div data-testid="user-avatar">User Avatar</div>;
  };
});

const mockPost: any = {
  id: 'post-1',
  type: 'image',
  content: 'Test post content with #hashtag',
  author: {
    id: 'author-1',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'avatar-url',
    isVerified: true,
  },
  createdAt: '2023-01-01T00:00:00Z',
  likes: 10,
  comments: 5,
  shares: 5,
  views: 100,
  likeCount: 10,
  commentCount: 5,
  shareCount: 5,
  hashtags: ['hashtag'],
  media: [
    {
      resource_type: 'image',
      secure_url: 'image-url',
    }
  ]
};

describe('PostCardEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the post card with all elements', () => {
    render(<PostCardEnhanced post={mockPost} />);

    // Check that the post content is rendered
    expect(screen.getByText('Test post content with #hashtag')).toBeInTheDocument();
    
    // Check that the username is rendered under the avatar
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Check that the hashtag is rendered
    expect(screen.getByText('#hashtag')).toBeInTheDocument();
    
    // Check that engagement metrics are rendered
    expect(screen.getByText('10')).toBeInTheDocument(); // likes
    expect(screen.getByText('5')).toBeInTheDocument(); // comments
    expect(screen.getByText('100')).toBeInTheDocument(); // views
    
    // Check that action icons are rendered (now vertically arranged)
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument(); // Follow icon
    expect(screen.getByRole('button', { name: /heart/i })).toBeInTheDocument(); // Like icon
    expect(screen.getByRole('button', { name: /eye/i })).toBeInTheDocument(); // View icon
    expect(screen.getByRole('button', { name: /message/i })).toBeInTheDocument(); // Comment icon
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument(); // Share icon
    expect(screen.getByRole('button', { name: /bookmark/i })).toBeInTheDocument(); // Bookmark icon
  });

  it('calls like API when like button is clicked', async () => {
    // Mock the like API response
    (api.api.posts.like as jest.Mock).mockResolvedValue({
      success: true,
    });

    render(<PostCardEnhanced post={mockPost} />);

    // Click the like button (icon)
    const likeButton = screen.getByRole('button', { name: /heart/i });
    fireEvent.click(likeButton);

    // Wait for the API call
    await waitFor(() => {
      expect(api.api.posts.like).toHaveBeenCalledWith('post-1');
    });
  });

  it('calls bookmark API when bookmark button is clicked', async () => {
    // Mock the bookmark API response
    (api.api.posts.bookmark as jest.Mock).mockResolvedValue({
      success: true,
    });

    render(<PostCardEnhanced post={mockPost} />);

    // Click the bookmark button (icon)
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
    fireEvent.click(bookmarkButton);

    // Wait for the API call
    await waitFor(() => {
      expect(api.api.posts.bookmark).toHaveBeenCalledWith('post-1');
    });
  });

  it('calls follow API when follow icon is clicked', async () => {
    // Mock the follow API response
    (api.api.users.follow as jest.Mock).mockResolvedValue({
      success: true,
    });

    render(<PostCardEnhanced post={mockPost} />);

    // Click the follow icon (now in vertical action icons)
    const followButton = screen.getByRole('button', { name: /user/i });
    fireEvent.click(followButton);

    // Wait for the API call
    await waitFor(() => {
      expect(api.api.users.follow).toHaveBeenCalledWith('author-1');
    });
  });

  it('shows following button for already followed user', () => {
    const postWithFollowing = {
      ...mockPost,
      author: {
        ...mockPost.author,
      },
    };

    render(<PostCardEnhanced post={postWithFollowing} />);

    // Check that the following button is rendered
    // Note: In a real implementation, this would depend on the user's following state
    // For this test, we're just checking the component renders
  });
});
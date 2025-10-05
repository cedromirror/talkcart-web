import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialPage from '@/components/social/new/SocialPage';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { CreatePostDialog } from '@/components/social/new/CreatePostDialog';
import TrendingPostsSidebar from '@/components/social/new/TrendingPostsSidebar';
import WhoToFollow from '@/components/social/new/WhoToFollow';
import TrendingProducts from '@/components/social/new/TrendingProducts';

// Mock the necessary contexts and hooks
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', username: 'testuser' },
  }),
}));

jest.mock('@/hooks/usePosts', () => () => ({
  posts: [],
  loading: false,
  error: null,
  fetchPosts: jest.fn(),
  fetchBookmarkedPosts: jest.fn(),
  likePost: jest.fn(),
  bookmarkPost: jest.fn(),
  sharePost: jest.fn(),
}));

jest.mock('@/hooks/usePostInteractions', () => ({
  usePostInteractions: () => ({
    liked: false,
    likeCount: 0,
    shareCount: 0,
    isLikePending: false,
    isSharePending: false,
    handleLike: jest.fn(),
    handleShare: jest.fn(),
  }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    onPostLikeUpdate: () => () => {},
    onPostShareUpdate: () => () => {},
    onPostUpdate: () => () => {},
  }),
}));

jest.mock('@/components/common/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div data-testid="user-avatar">User Avatar</div>;
  };
});

jest.mock('@/components/Comments/CommentSection', () => {
  return function MockCommentSection() {
    return <div data-testid="comment-section">Comment Section</div>;
  };
});

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    posts: {
      health: jest.fn(),
      getTrending: jest.fn(),
      create: jest.fn(),
    },
    marketplace: {
      getRandomProducts: jest.fn(),
    },
    media: {
      upload: jest.fn(),
    },
  },
}));

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

// Mock useUserSuggestions hook
jest.mock('@/hooks/useUserSuggestions', () => ({
  useUserSuggestions: () => ({
    suggestions: [],
    loading: false,
    error: null,
    followUser: jest.fn(),
    refreshSuggestions: jest.fn(),
  }),
}));

describe('Social Components', () => {
  test('SocialPage renders without crashing', () => {
    render(<SocialPage />);
    expect(screen.getByText('TalkCart')).toBeInTheDocument();
  });

  test('PostCard renders without crashing', () => {
    const mockPost: any = {
      id: '1',
      type: 'text' as const,
      content: 'Test post',
      author: {
        id: 'author-1',
        username: 'testuser',
        displayName: 'Test User',
        avatar: '',
        isVerified: false,
      },
      media: [],
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      isLiked: false,
      isBookmarked: false,
    };

    render(<PostCard post={mockPost} />);
    expect(screen.getByText('Test post')).toBeInTheDocument();
  });

  test('CreatePostDialog renders without crashing', () => {
    const { container } = render(
      <CreatePostDialog open={true} onClose={jest.fn()} onPostCreated={jest.fn()} />
    );
    expect(container).toBeInTheDocument();
  });

  test('TrendingPostsSidebar renders without crashing', () => {
    render(<TrendingPostsSidebar />);
    expect(screen.getByText('Trending Posts')).toBeInTheDocument();
  });

  test('WhoToFollow renders without crashing', () => {
    render(<WhoToFollow />);
    expect(screen.getByText('Who to Follow')).toBeInTheDocument();
  });

  test('TrendingProducts renders without crashing', () => {
    render(<TrendingProducts />);
    expect(screen.getByText('Trending Products')).toBeInTheDocument();
  });
});
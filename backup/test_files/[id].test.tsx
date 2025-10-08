import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';
import PostDetailPage from './[id]';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock other components
jest.mock('@/components/layout/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

jest.mock('@/components/Comments/CommentSection', () => {
  return function MockCommentSection() {
    return <div data-testid="comment-section">Comments Section</div>;
  };
});

jest.mock('@/components/common/UserAvatar', () => {
  return function MockUserAvatar() {
    return <div>User Avatar</div>;
  };
});

describe('PostDetailPage', () => {
  const mockRouter = {
    query: { id: '123' },
    back: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the post detail page', () => {
    render(<PostDetailPage />);
    
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByTestId('comment-section')).toBeInTheDocument();
  });

  it('handles focus=comments query parameter', () => {
    // This would be difficult to test without a full browser environment
    // but we can at least verify the component renders without errors
    const mockRouterWithFocus = {
      query: { id: '123', focus: 'comments' },
      back: jest.fn(),
    };
    
    (useRouter as jest.Mock).mockReturnValue(mockRouterWithFocus);
    
    render(<PostDetailPage />);
    
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByTestId('comment-section')).toBeInTheDocument();
  });
});
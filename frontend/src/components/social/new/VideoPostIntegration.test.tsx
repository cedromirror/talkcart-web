import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostListItem from './PostListItem';

// Mock the date-fns functions to avoid date-related issues in tests
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
  parseISO: (dateString: string) => new Date(dateString)
}));

// Mock video component to avoid actual video loading
jest.mock('./VideoMedia', () => {
  return function MockVideoMedia({ src }: { src: string }) {
    return <div data-testid="mock-video">Video Player - {src}</div>;
  };
});

// Mock image component to avoid actual image loading
jest.mock('./ImageMedia', () => {
  return function MockImageMedia({ src }: { src: string }) {
    return <div data-testid="mock-image">Image Display - {src}</div>;
  };
});

// Mock GridMedia component
jest.mock('./GridMedia', () => {
  return function MockGridMedia({ mediaItem }: { mediaItem: any }) {
    const src = mediaItem.secure_url || mediaItem.url;
    return <div data-testid="mock-grid-media">Grid Media - {src}</div>;
  };
});

describe('Video Post Integration', () => {
  const mockPost = {
    id: 'test-video-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This is a test video post',
    createdAt: new Date().toISOString(),
    likeCount: 10,
    commentCount: 5,
    shareCount: 2,
    isLiked: false
  };

  it('renders video post with Cloudinary URL correctly', () => {
    const postWithCloudinaryVideo = {
      ...mockPost,
      media: [
        {
          id: 'video123',
          public_id: 'talkcart/test-video',
          secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
          resource_type: 'video',
          format: 'mp4'
        }
      ]
    };

    render(<PostListItem post={postWithCloudinaryVideo} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('This is a test video post')).toBeInTheDocument();
    expect(screen.getByTestId('mock-video')).toBeInTheDocument();
    expect(screen.getByText(/Video Player/)).toBeInTheDocument();
  });

  it('renders video post with local URL correctly (no duplicate paths)', () => {
    const postWithLocalVideo = {
      ...mockPost,
      media: [
        {
          id: 'video456',
          public_id: 'talkcart/file_1760459532573_hmjwxi463j',
          secure_url: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
          resource_type: 'video',
          format: 'mp4'
        }
      ]
    };

    render(<PostListItem post={postWithLocalVideo} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('This is a test video post')).toBeInTheDocument();
    expect(screen.getByTestId('mock-video')).toBeInTheDocument();
    expect(screen.getByText(/Video Player/)).toBeInTheDocument();
  });

  it('handles duplicate path URLs correctly', () => {
    const postWithDuplicatePathVideo = {
      ...mockPost,
      media: [
        {
          id: 'video789',
          public_id: 'talkcart/file_1760446946793_ix9n9oc37qk',
          secure_url: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk',
          resource_type: 'video',
          format: 'mp4'
        }
      ]
    };

    // Mock console.warn to avoid noise in tests
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<PostListItem post={postWithDuplicatePathVideo} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('This is a test video post')).toBeInTheDocument();
    expect(screen.getByTestId('mock-video')).toBeInTheDocument();
    expect(screen.getByText(/Video Player/)).toBeInTheDocument();
    
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  it('renders image media correctly', () => {
    const postWithImage = {
      ...mockPost,
      media: [
        {
          id: 'image123',
          public_id: 'talkcart/test-image',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
          resource_type: 'image'
        }
      ]
    };

    render(<PostListItem post={postWithImage} />);
    
    expect(screen.getByTestId('mock-image')).toBeInTheDocument();
    expect(screen.getByText(/Image Display/)).toBeInTheDocument();
  });

  it('renders grid media for multiple items', () => {
    const postWithMultipleMedia = {
      ...mockPost,
      media: [
        {
          id: 'image123',
          public_id: 'talkcart/test-image1',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample1.jpg',
          resource_type: 'image'
        },
        {
          id: 'image456',
          public_id: 'talkcart/test-image2',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample2.jpg',
          resource_type: 'image'
        }
      ]
    };

    render(<PostListItem post={postWithMultipleMedia} />);
    
    expect(screen.getByTestId('mock-grid-media')).toBeInTheDocument();
  });

  it('shows error message for invalid media URLs', async () => {
    // Mock console.warn to avoid noise in tests
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const postWithInvalidMedia = {
      ...mockPost,
      media: [
        {
          id: 'invalid123',
          public_id: 'talkcart/invalid-media',
          secure_url: 'invalid-url',
          resource_type: 'video'
        }
      ]
    };

    render(<PostListItem post={postWithInvalidMedia} />);
    
    // Wait for the error state to be rendered
    await waitFor(() => {
      expect(screen.getByText('Video not available')).toBeInTheDocument();
    });
    
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  it('handles missing URL gracefully', () => {
    const postWithMissingUrl = {
      ...mockPost,
      media: [
        {
          id: 'missing123',
          public_id: 'talkcart/missing-media',
          resource_type: 'video'
        }
      ]
    };

    render(<PostListItem post={postWithMissingUrl} />);
    
    // Should show error message for missing URL
    expect(screen.getByText('Media not available')).toBeInTheDocument();
  });
});
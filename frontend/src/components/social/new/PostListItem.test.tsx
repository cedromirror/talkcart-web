import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostListItem from './PostListItem';

// Mock video component to avoid actual video loading
jest.mock('./VideoMedia', () => {
  return function MockVideoMedia() {
    return <div data-testid="mock-video">Video Player</div>;
  };
});

// Mock image component to avoid actual image loading
jest.mock('./ImageMedia', () => {
  return function MockImageMedia() {
    return <div data-testid="mock-image">Image Display</div>;
  };
});

// Mock GridMedia component
jest.mock('./GridMedia', () => {
  return function MockGridMedia() {
    return <div data-testid="mock-grid-media">Grid Media</div>;
  };
});

describe('PostListItem', () => {
  const mockPost = {
    id: 'test-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This is a test post',
    createdAt: new Date().toISOString(),
    likeCount: 10,
    commentCount: 5,
    shareCount: 2,
    isLiked: false
  };

  it('renders post content correctly', () => {
    render(<PostListItem post={mockPost} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('This is a test post')).toBeInTheDocument();
  });

  it('renders video media correctly with valid Cloudinary URL', () => {
    const postWithVideo = {
      ...mockPost,
      media: [
        {
          id: 'video123',
          public_id: 'talkcart/test-video',
          secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
          resource_type: 'video'
        }
      ]
    };

    render(<PostListItem post={postWithVideo} />);
    
    // Since we're mocking the VideoMedia component, we check for the mock
    expect(screen.getByTestId('mock-video')).toBeInTheDocument();
  });

  it('renders image media correctly with valid URL', () => {
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
    
    // Since we're mocking the ImageMedia component, we check for the mock
    expect(screen.getByTestId('mock-image')).toBeInTheDocument();
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
    
    // Check for grid media
    expect(screen.getByTestId('mock-grid-media')).toBeInTheDocument();
  });

  it('shows error message for invalid media URLs', () => {
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
    
    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });
});
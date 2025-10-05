import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatePostDialog } from './CreatePostDialog';

// Mock the api
jest.mock('@/lib/api', () => ({
  api: {
    media: {
      upload: jest.fn().mockResolvedValue({
        success: true,
        data: {
          public_id: 'test-public-id',
          secure_url: 'https://example.com/test.jpg',
          url: 'https://example.com/test.jpg',
          resource_type: 'image',
          format: 'jpg',
          width: 100,
          height: 100,
          bytes: 1000,
          duration: null,
        }
      })
    },
    posts: {
      create: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'test-post-id',
          content: 'Test post content',
          type: 'text',
          privacy: 'public'
        }
      })
    }
  }
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('CreatePostDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnPostCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <CreatePostDialog 
        open={true} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    expect(screen.getByText('Create Post')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CreatePostDialog 
        open={false} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
  });

  it('allows text post creation', async () => {
    render(
      <CreatePostDialog 
        open={true} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    // Enter content
    const textarea = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(textarea, { target: { value: 'Test post content' } });
    
    // Click post button
    const postButton = screen.getByText('Post');
    fireEvent.click(postButton);
    
    // Wait for async operations
    await screen.findByText('Post created successfully!');
    
    expect(mockOnPostCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error when content is empty', () => {
    render(
      <CreatePostDialog 
        open={true} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    // Click post button without entering content
    const postButton = screen.getByText('Post');
    fireEvent.click(postButton);
    
    expect(screen.getByText('Please enter some content for your post')).toBeInTheDocument();
  });

  it('detects hashtags and mentions', () => {
    render(
      <CreatePostDialog 
        open={true} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    // Enter content with hashtags and mentions
    const textarea = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(textarea, { target: { value: 'Check out #Web3 and @john' } });
    
    // Check that hashtags and mentions are detected
    expect(screen.getByText('#Web3')).toBeInTheDocument();
    expect(screen.getByText('@john')).toBeInTheDocument();
  });

  it('handles post type selection', () => {
    render(
      <CreatePostDialog 
        open={true} 
        onClose={mockOnClose} 
        onPostCreated={mockOnPostCreated} 
      />
    );
    
    // Check default post type
    expect(screen.getByText('Text')).toHaveClass('Mui-selected');
    
    // Change to image post type
    const imageButton = screen.getByLabelText('image post');
    fireEvent.click(imageButton);
    
    expect(screen.getByText('Photo')).toHaveClass('Mui-selected');
  });
});
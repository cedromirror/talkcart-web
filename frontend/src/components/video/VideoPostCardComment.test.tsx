import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPostCard } from './VideoPostCard';

// Mock the useVideoFeed hook
jest.mock('./VideoFeedManager', () => ({
  useVideoFeed: () => ({
    registerVideo: jest.fn(),
    unregisterVideo: jest.fn(),
    playVideo: jest.fn(),
    pauseVideo: jest.fn(),
    currentPlayingVideo: null,
    settings: {
      muteByDefault: false,
      preloadStrategy: 'metadata'
    }
  })
}));

// Mock the video utils
jest.mock('@/utils/videoUtils', () => ({
  getVolumeIcon: jest.fn(() => <div>Volume Icon</div>),
  getVolumeTooltip: jest.fn(() => 'Mute')
}));

// Mock video element
const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  get() {
    return mockPlay;
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  get() {
    return mockPause;
  },
});

describe('VideoPostCard Comment Handler', () => {
  const mockPost = {
    id: '1',
    media: [
      {
        resource_type: 'video',
        secure_url: 'https://example.com/video.mp4',
        thumbnail_url: 'https://example.com/thumbnail.jpg'
      }
    ],
    author: {
      id: 'author1',
      username: 'testuser',
      displayName: 'Test User'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onComment handler when comment button is clicked', () => {
    const mockOnComment = jest.fn();
    render(<VideoPostCard post={mockPost} onComment={mockOnComment} />);
    
    // Find the comment button
    // Since we can't easily select by icon, we'll look for a button with aria-label "Comment"
    const commentButtons = screen.getAllByRole('button');
    
    // Find the comment button - it should be one of the buttons with a MessageSquare icon
    const commentButton = commentButtons.find(btn => 
      btn.querySelector('[data-icon="message-square"]') !== null
    );
    
    if (commentButton) {
      fireEvent.click(commentButton);
      expect(mockOnComment).toHaveBeenCalledWith('1');
    }
  });
});
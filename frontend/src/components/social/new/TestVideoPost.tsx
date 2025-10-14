import React from 'react';
import PostListItem from './PostListItem';

// Mock post data with a valid Cloudinary video URL
const mockPost = {
  id: 'test-video-post',
  author: {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg'
  },
  content: 'This is a test video post',
  media: [
    {
      id: 'video123',
      public_id: 'talkcart/test-video',
      secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
      resource_type: 'video',
      format: 'mp4',
      bytes: 1024000,
      width: 1920,
      height: 1080,
      duration: 30.5
    }
  ],
  createdAt: new Date().toISOString(),
  likeCount: 10,
  commentCount: 5,
  shareCount: 2,
  isLiked: false
};

const TestVideoPost: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Video Post Rendering</h1>
      <PostListItem 
        post={mockPost} 
        onBookmark={() => console.log('Bookmark clicked')}
        onLike={() => console.log('Like clicked')}
        onShare={() => console.log('Share clicked')}
        onComment={() => console.log('Comment clicked')}
      />
    </div>
  );
};

export default TestVideoPost;
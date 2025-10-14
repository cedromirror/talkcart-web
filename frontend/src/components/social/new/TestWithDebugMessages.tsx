import React from 'react';
import PostListItem from './PostListItem';

// Test post with the exact duplicate path issue
const testPost = {
  id: 'test-post-1',
  author: {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg'
  },
  content: 'Test post with duplicate path issue',
  media: [
    {
      id: 'video1',
      public_id: 'talkcart/file_1760459532573_hmjwxi463j',
      secure_url: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
      resource_type: 'video',
      format: 'mp4',
      bytes: 1024000,
      width: 1920,
      height: 1080,
      duration: 30.5
    }
  ],
  createdAt: new Date().toISOString(),
  likeCount: 5,
  commentCount: 2,
  shareCount: 1,
  isLiked: false
};

const TestWithDebugMessages: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test with Debug Messages</h1>
      <p>This test uses our updated PostListItem component with debug messages.</p>
      <PostListItem 
        post={testPost} 
        onBookmark={() => console.log('Bookmark clicked')}
        onLike={() => console.log('Like clicked')}
        onShare={() => console.log('Share clicked')}
        onComment={() => console.log('Comment clicked')}
      />
    </div>
  );
};

export default TestWithDebugMessages;
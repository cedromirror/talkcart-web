import React from 'react';
import PostListItem from './PostListItem';

// Mock post data with various problematic cases
const mockPosts = [
  // Case 1: Duplicate path issue (the main problem we're trying to solve)
  {
    id: 'duplicate-path-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This post has a duplicate path issue',
    media: [
      {
        id: 'video1',
        public_id: 'talkcart/file_1760446946793_ix9n9oc37qk',
        secure_url: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk',
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
  },
  
  // Case 2: Valid local URL
  {
    id: 'valid-local-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This post has a valid local URL',
    media: [
      {
        id: 'video2',
        public_id: 'talkcart/file_1760459532573_hmjwxi463j',
        secure_url: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
        resource_type: 'video',
        format: 'mp4',
        bytes: 2048000,
        width: 1280,
        height: 720,
        duration: 45.2
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 8,
    commentCount: 3,
    shareCount: 2,
    isLiked: true
  },
  
  // Case 3: Cloudinary URL
  {
    id: 'cloudinary-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This post has a Cloudinary URL',
    media: [
      {
        id: 'video3',
        public_id: 'demo/video/upload/v1234567890/sample.mp4',
        secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
        resource_type: 'video',
        format: 'mp4',
        bytes: 4096000,
        width: 3840,
        height: 2160,
        duration: 120.8
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 15,
    commentCount: 7,
    shareCount: 5,
    isLiked: false
  },
  
  // Case 4: Missing URL
  {
    id: 'missing-url-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This post is missing a URL',
    media: [
      {
        id: 'video4',
        public_id: 'talkcart/missing-file',
        resource_type: 'video',
        format: 'mp4'
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    isLiked: false
  },
  
  // Case 5: Invalid URL format
  {
    id: 'invalid-url-post',
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    content: 'This post has an invalid URL format',
    media: [
      {
        id: 'video5',
        public_id: 'talkcart/invalid-url',
        secure_url: 'invalid-url-format',
        resource_type: 'video',
        format: 'mp4'
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    isLiked: false
  }
];

const DetailedTestVideoPost: React.FC = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Detailed Video Post Rendering Test</h1>
      <p>This test renders various problematic video post scenarios to verify the fixes.</p>
      
      {mockPosts.map((post, index) => (
        <div key={post.id} style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px' }}>
          <h2>Test Case {index + 1}: {post.content}</h2>
          <PostListItem 
            post={post} 
            onBookmark={() => console.log('Bookmark clicked for', post.id)}
            onLike={() => console.log('Like clicked for', post.id)}
            onShare={() => console.log('Share clicked for', post.id)}
            onComment={() => console.log('Comment clicked for', post.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default DetailedTestVideoPost;
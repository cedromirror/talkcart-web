import React from 'react';
import DebugPostListItem from '@/components/social/new/DebugPostListItem';
import { Box } from '@mui/material';

// Mock post data with the problematic case
const mockPost = {
  id: 'debug-post-1',
  author: {
    id: 'user123',
    username: 'debuguser',
    displayName: 'Debug User',
    avatar: 'https://example.com/avatar.jpg'
  },
  content: 'Debug post with duplicate path issue',
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
};

const DebugPostsPage: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <h1>Debug Posts Page</h1>
      <p>Check the browser console for detailed debugging information.</p>
      <DebugPostListItem 
        post={mockPost} 
        onBookmark={() => console.log('Bookmark clicked')}
        onLike={() => console.log('Like clicked')}
        onShare={() => console.log('Share clicked')}
        onComment={() => console.log('Comment clicked')}
      />
    </Box>
  );
};

export default DebugPostsPage;
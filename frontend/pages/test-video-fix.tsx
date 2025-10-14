import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import PostListItem from '@/components/social/new/PostListItem';

const TestVideoFixPage = () => {
  // Test data with the exact error case from the console
  const testPost = {
    id: 'test-video-post',
    author: {
      id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
      avatar: ''
    },
    content: 'This is a test post with a video',
    media: [
      {
        id: 'video1',
        public_id: 'talkcart/file_1760459532573_hmjwxi463j',
        secure_url: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
        resource_type: 'video',
        format: 'mp4'
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    isLiked: false
  };

  // Test data with duplicate path issue
  const testPostWithDuplicatePath = {
    id: 'test-video-post-duplicate',
    author: {
      id: 'user2',
      username: 'testuser2',
      displayName: 'Test User 2',
      avatar: ''
    },
    content: 'This is a test post with a video that has duplicate path issue',
    media: [
      {
        id: 'video2',
        public_id: 'talkcart/file_1760459532573_hmjwxi463j',
        secure_url: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
        resource_type: 'video',
        format: 'mp4'
      }
    ],
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    isLiked: false
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Video Fix Test Page
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Test 1: Normal video URL
      </Typography>
      <Box sx={{ mb: 4 }}>
        <PostListItem 
          post={testPost} 
          onBookmark={() => {}} 
          onLike={() => {}} 
          onShare={() => {}} 
          onComment={() => {}} 
        />
      </Box>
      
      <Typography variant="h6" gutterBottom>
        Test 2: Video URL with duplicate path (should be fixed)
      </Typography>
      <Box sx={{ mb: 4 }}>
        <PostListItem 
          post={testPostWithDuplicatePath} 
          onBookmark={() => {}} 
          onLike={() => {}} 
          onShare={() => {}} 
          onComment={() => {}} 
        />
      </Box>
    </Container>
  );
};

export default TestVideoFixPage;
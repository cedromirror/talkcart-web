const express = require('express');
const router = express.Router();

// Simple test endpoint that doesn't use mongoose
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

router.get('/posts', (req, res) => {
  // Return mock posts data
  const mockPosts = [
    {
      _id: '1',
      content: 'Test post 1',
      author: {
        _id: 'user1',
        username: 'testuser',
        displayName: 'Test User',
        avatar: 'https://via.placeholder.com/50'
      },
      media: [],
      createdAt: new Date().toISOString(),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      privacy: 'public'
    },
    {
      _id: '2',
      content: 'Test post 2 with media',
      author: {
        _id: 'user2',
        username: 'testuser2',
        displayName: 'Test User 2',
        avatar: 'https://via.placeholder.com/50'
      },
      media: [{
        url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
        resource_type: 'image',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg'
      }],
      createdAt: new Date().toISOString(),
      likeCount: 5,
      commentCount: 2,
      shareCount: 1,
      privacy: 'public'
    }
  ];
  
  res.json({
    success: true,
    data: mockPosts,
    pagination: {
      page: 1,
      limit: 20,
      total: mockPosts.length,
      pages: 1
    }
  });
});

module.exports = router;

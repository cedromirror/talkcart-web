import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { normalizePostData, normalizeUrl, isValidUrl } from '@/utils/crossPlatformUtils';

// Test component to verify post rendering
const PostRenderingTest: React.FC = () => {
  // Sample post data
  const samplePost = {
    _id: '507f1f77bcf86cd799439011',
    content: 'Test post with media',
    author: {
      _id: '507f1f77bcf86cd799439012',
      username: 'testuser',
      displayName: 'Test User'
    },
    media: [
      {
        _id: '507f1f77bcf86cd799439013',
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
        url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
        resource_type: 'image',
        public_id: 'sample'
      },
      {
        _id: '507f1f77bcf86cd799439014',
        secure_url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
        url: 'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
        resource_type: 'video',
        public_id: 'sample-video'
      }
    ],
    likes: [],
    views: 0
  };

  // Normalize the post data
  const normalizedPost = normalizePostData(samplePost);

  // Test media URL validation
  const testMediaUrls = normalizedPost.media.map(media => {
    const url = media.secure_url || media.url;
    const normalized = normalizeUrl(url);
    const valid = isValidUrl(normalized || '');
    return {
      original: url,
      normalized,
      valid,
      resourceType: media.resource_type
    };
  });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Post Rendering Test
      </Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Post Data Normalization Test
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
            {JSON.stringify(normalizedPost, null, 2)}
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Media URL Validation Test
          </Typography>
          {testMediaUrls.map((test, index) => (
            <Box key={index} sx={{ mb: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
              <Typography variant="subtitle2">
                Media {index + 1} ({test.resourceType})
              </Typography>
              <Typography variant="body2">
                <strong>Original URL:</strong> {test.original}
              </Typography>
              <Typography variant="body2">
                <strong>Normalized URL:</strong> {test.normalized}
              </Typography>
              <Typography variant="body2" color={test.valid ? 'success.main' : 'error.main'}>
                <strong>Valid:</strong> {test.valid ? '✅ YES' : '❌ NO'}
              </Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Placeholder Image Test
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <img 
                src="/images/placeholder-video-new.svg" 
                alt="Video placeholder" 
                style={{ width: 100, height: 100, objectFit: 'cover' }}
                onError={(e) => console.error('Video placeholder failed to load:', e)}
                onLoad={() => console.log('Video placeholder loaded successfully')}
              />
              <Typography variant="caption" display="block">
                Video Placeholder
              </Typography>
            </Box>
            <Box>
              <img 
                src="/images/placeholder-image-new.svg" 
                alt="Image placeholder" 
                style={{ width: 100, height: 100, objectFit: 'cover' }}
                onError={(e) => console.error('Image placeholder failed to load:', e)}
                onLoad={() => console.log('Image placeholder loaded successfully')}
              />
              <Typography variant="caption" display="block">
                Image Placeholder
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PostRenderingTest;
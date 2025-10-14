import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

const VideoTestPage: React.FC = () => {
  const [showVideo, setShowVideo] = useState(false);
  
  // Test URLs
  const testUrls = [
    // This should work - a known sample video
    'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    // Our problematic local URL
    'http://localhost:8000/uploads/talkcart/talkcart/file_1760446946793_ix9n9oc37qk',
    // Our fixed local URL
    'http://localhost:8000/uploads/talkcart/file_1760446946793_ix9n9oc37qk'
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4">Video Test Page</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This page tests video playback with different URLs to identify issues.
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={() => setShowVideo(!showVideo)}
        sx={{ mb: 2 }}
      >
        {showVideo ? 'Hide Videos' : 'Show Videos'}
      </Button>
      
      {showVideo && (
        <Box>
          {testUrls.map((url, index) => (
            <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
              <Typography variant="h6">Test {index + 1}</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>URL: {url}</Typography>
              <video 
                controls 
                style={{ width: '100%', maxWidth: '600px' }}
                onError={(e) => {
                  console.error(`Video ${index + 1} error:`, e);
                }}
                onLoadedData={(e) => {
                  console.log(`Video ${index + 1} loaded:`, e);
                }}
              >
                <source src={url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default VideoTestPage;
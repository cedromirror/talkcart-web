import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Button, Paper, List, ListItem, ListItemText } from '@mui/material';

const TestPostsApiPage = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runApiTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    setError(null);
    
    try {
      const response = await fetch('/api/test-posts');
      const data = await response.json();
      
      if (data.success) {
        setTestResults(data);
      } else {
        setError(data.error || 'Failed to fetch posts');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Test Posts API Page
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Testing API endpoint to fetch posts with media
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={runApiTest}
        disabled={isTesting}
        sx={{ mb: 2 }}
      >
        {isTesting ? 'Testing...' : 'Run API Test'}
      </Button>
      
      {error && (
        <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="h6">Error:</Typography>
          <Typography variant="body1">{error}</Typography>
        </Paper>
      )}
      
      {testResults && (
        <Paper elevation={3} sx={{ p: 2, mb: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            API Test Results:
          </Typography>
          <Typography variant="body1">
            Found {testResults.count} posts with media
          </Typography>
          
          {testResults.posts && testResults.posts.map((post: any, index: number) => (
            <Box key={post.id || index} sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
              <Typography variant="subtitle1">
                Post {index + 1}: {post.content?.substring(0, 50)}{post.content?.length > 50 ? '...' : ''}
              </Typography>
              <Typography variant="body2">
                Author: {post.author?.displayName || post.author?.username}
              </Typography>
              <Typography variant="body2">
                Media count: {post.media?.length || 0}
              </Typography>
              
              {post.media && post.media.map((media: any, mediaIndex: number) => (
                <Box key={media.id || mediaIndex} sx={{ mt: 1, p: 1, bgcolor: '#f5f5f5' }}>
                  <Typography variant="body2">
                    Media {mediaIndex + 1}:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Type: {media.resource_type}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    URL: {media.secure_url}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Public ID: {media.public_id}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Paper>
      )}
      
      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
        Manual Verification Steps:
      </Typography>
      
      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Open the browser console (F12) and look for any errors
        </Typography>
        <Typography component="li" variant="body1">
          Check the Network tab to see the API request to /api/test-posts
        </Typography>
        <Typography component="li" variant="body1">
          Verify that the response contains posts with media information
        </Typography>
        <Typography component="li" variant="body1">
          Check if the URLs in the media objects are valid and accessible
        </Typography>
      </Box>
    </Container>
  );
};

export default TestPostsApiPage;
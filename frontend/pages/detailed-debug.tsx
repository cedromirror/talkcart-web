import React, { useState } from 'react';
import { Box, Typography, Container, Button, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

const DetailedDebugPage = () => {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Our URL normalization function (copied from PostListItem)
  const normalizeMediaUrl = (urlString: string): string | null => {
    try {
      if (!urlString) return null;
      
      // Handle already valid absolute URLs
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        // Fix duplicate talkcart path issue
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          console.log('🔧 Fixing duplicate talkcart path in URL:', urlString);
          const fixedUrl = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
          console.log('✅ Fixed URL:', fixedUrl);
          return fixedUrl;
        }
        return urlString;
      }
      
      // Handle relative URLs by converting to absolute
      if (urlString.startsWith('/')) {
        // Check for malformed URLs with duplicate path segments
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          console.log('🔧 Fixing duplicate talkcart path in relative URL:', urlString);
          urlString = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
          console.log('✅ Fixed relative URL:', urlString);
        }
        
        // For development, use localhost:8000 as the base
        // For production, this should be handled by the backend
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev ? 'http://localhost:8000' : '';
        
        if (baseUrl) {
          return `${baseUrl}${urlString}`;
        }
        return urlString;
      }
      
      return null;
    } catch (e) {
      console.error('❌ Error in normalizeMediaUrl:', e);
      // Try one more time with basic validation for edge cases
      if (urlString && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
        return urlString;
      }
      return null;
    }
  };

  // URL validation function
  const isValidUrl = (urlString: string): boolean => {
    try {
      if (!urlString) return false;
      
      // Handle Cloudinary URLs with special characters
      if (urlString.includes('cloudinary.com')) {
        // Cloudinary URLs are generally valid even with special characters
        return urlString.startsWith('http://') || urlString.startsWith('https://');
      }
      
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const runDetailedDebug = async () => {
    setIsTesting(true);
    setDebugResults(null);
    setError(null);
    setDebugResults({ steps: ['Starting detailed debug...'] });
    
    try {
      // Step 1: Test URL normalization with various inputs
      const testUrls = [
        'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
        'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
        '/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
        '/uploads/talkcart/normal_file.mp4',
        'https://res.cloudinary.com/dqhawepog/video/upload/v1234567890/sample.mp4',
        'invalid-url'
      ];
      
      const normalizationResults: any[] = [];
      
      testUrls.forEach((url, index) => {
        const normalized = normalizeMediaUrl(url);
        const isValid = normalized ? isValidUrl(normalized) : false;
        
        normalizationResults.push({
          input: url,
          normalized,
          isValid,
          index
        });
        
        setDebugResults((prev: any) => ({
          ...prev,
          steps: [...prev.steps, `Tested URL ${index + 1}: ${url} -> ${normalized}`]
        }));
      });
      
      // Step 2: Try to fetch posts from the API
      setDebugResults((prev: any) => ({
        ...prev,
        steps: [...prev.steps, 'Fetching posts from API...']
      }));
      
      let postsData = null;
      try {
        const response = await fetch('http://localhost:8000/api/posts');
        postsData = await response.json();
      } catch (fetchError) {
        setDebugResults((prev: any) => ({
          ...prev,
          steps: [...prev.steps, `Failed to fetch posts: ${fetchError.message}`]
        }));
      }
      
      // Step 3: Analyze posts with media
      let postsWithMedia: any[] = [];
      if (postsData?.success && postsData?.data?.posts) {
        postsWithMedia = postsData.data.posts.filter((post: any) => 
          post.media && post.media.length > 0
        );
        
        setDebugResults((prev: any) => ({
          ...prev,
          steps: [...prev.steps, `Found ${postsWithMedia.length} posts with media`]
        }));
      } else {
        setDebugResults((prev: any) => ({
          ...prev,
          steps: [...prev.steps, 'No posts data received from API']
        }));
      }
      
      // Step 4: Test actual media URLs from posts
      const mediaUrlTests: any[] = [];
      if (postsWithMedia.length > 0) {
        postsWithMedia.slice(0, 3).forEach((post: any, postIndex: number) => {
          post.media.forEach((media: any, mediaIndex: number) => {
            const originalUrl = media.secure_url || media.url;
            const normalizedUrl = normalizeMediaUrl(originalUrl);
            const isValid = normalizedUrl ? isValidUrl(normalizedUrl) : false;
            
            mediaUrlTests.push({
              postId: post.id,
              postIndex,
              mediaIndex,
              originalUrl,
              normalizedUrl,
              isValid,
              mediaType: media.resource_type
            });
            
            setDebugResults((prev: any) => ({
              ...prev,
              steps: [...prev.steps, `Post ${postIndex + 1} Media ${mediaIndex + 1}: ${originalUrl} -> ${normalizedUrl}`]
            }));
          });
        });
      }
      
      // Compile final results
      setDebugResults({
        steps: [...debugResults?.steps || [], 'Debug completed'],
        normalizationResults,
        postsWithMedia: postsWithMedia.slice(0, 3),
        mediaUrlTests
      });
      
    } catch (err: any) {
      setError(err.message || 'Failed during debug process');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Detailed Debug Page
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Comprehensive debugging of video rendering issues
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={runDetailedDebug}
        disabled={isTesting}
        sx={{ mb: 2 }}
      >
        {isTesting ? 'Running Debug...' : 'Run Detailed Debug'}
      </Button>
      
      {error && (
        <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="h6">Error:</Typography>
          <Typography variant="body1">{error}</Typography>
        </Paper>
      )}
      
      {debugResults && (
        <Paper elevation={3} sx={{ p: 2, mb: 4, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom>
            Debug Results:
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Execution Steps:
          </Typography>
          <List>
            {debugResults.steps.map((step: string, index: number) => (
              <ListItem key={index}>
                <ListItemText primary={`${index + 1}. ${step}`} />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {debugResults.normalizationResults && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                URL Normalization Tests:
              </Typography>
              <List>
                {debugResults.normalizationResults.map((result: any) => (
                  <ListItem key={result.index}>
                    <ListItemText 
                      primary={`Input: ${result.input}`} 
                      secondary={
                        <>
                          <div>Normalized: {result.normalized || 'null'}</div>
                          <div>Valid: {result.isValid ? '✅ Yes' : '❌ No'}</div>
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          {debugResults.mediaUrlTests && debugResults.mediaUrlTests.length > 0 && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Actual Media URL Tests:
              </Typography>
              <List>
                {debugResults.mediaUrlTests.map((test: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`Post ${test.postIndex + 1} Media ${test.mediaIndex + 1} (${test.mediaType})`} 
                      secondary={
                        <>
                          <div>Original: {test.originalUrl}</div>
                          <div>Normalized: {test.normalizedUrl || 'null'}</div>
                          <div>Valid: {test.isValid ? '✅ Yes' : '❌ No'}</div>
                        </>
                      } 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      )}
      
      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
        Manual Debugging Steps:
      </Typography>
      
      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Open browser console (F12) and check for log messages from our debugging
        </Typography>
        <Typography component="li" variant="body1">
          Look for "🔧 Fixing duplicate talkcart path" messages to confirm normalization is working
        </Typography>
        <Typography component="li" variant="body1">
          Check Network tab for requests to media URLs
        </Typography>
        <Typography component="li" variant="body1">
          Verify response status codes for media requests (200 = success, 404 = not found)
        </Typography>
        <Typography component="li" variant="body1">
          Check if files in uploads directory contain valid media data
        </Typography>
      </Box>
    </Container>
  );
};

export default DetailedDebugPage;
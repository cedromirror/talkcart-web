import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Card, CardContent, Alert } from '@mui/material';
import { testImageUrl } from '@/utils/mediaDebugUtils';

const MediaDebugPage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [testResult, setTestResult] = useState<{success: boolean, error?: string, info?: any} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestImage = async () => {
    if (!imageUrl) {
      setTestResult({ success: false, error: 'Please enter an image URL' });
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await testImageUrl(imageUrl);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: `Test failed: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Media Debugging Tool
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Image URL
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL to test"
            />
            <Button 
              variant="contained" 
              onClick={handleTestImage}
              disabled={isLoading}
            >
              {isLoading ? 'Testing...' : 'Test'}
            </Button>
          </Box>
          
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'}>
              <Typography variant="subtitle2">
                Test Result: {testResult.success ? 'Success' : 'Failed'}
              </Typography>
              {testResult.error && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error: {testResult.error}
                </Typography>
              )}
              {testResult.info && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Info: {JSON.stringify(testResult.info, null, 2)}
                  </Typography>
                </Box>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Common Issues and Solutions
          </Typography>
          
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body1">
                <strong>Blank images</strong> - Check if the image URL is accessible and not blocked by CORS
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Placeholder showing</strong> - The original image failed to load, check the URL and network
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Image not visible</strong> - Check CSS styles like display, visibility, and opacity
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>CORS issues</strong> - Images from external domains may need to be proxied
              </Typography>
            </li>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default MediaDebugPage;
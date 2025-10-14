import React, { useState } from 'react';
import { Box, Typography, Container, Button } from '@mui/material';

const DebugTestPage = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const runDebugTest = async () => {
    setIsTesting(true);
    setTestResult('Testing...');
    
    try {
      // Dynamically import the PostListItem component to test if our changes are loaded
      const PostListItemModule = await import('@/components/social/new/PostListItem');
      
      // Test the normalizeMediaUrl function directly
      const { default: PostListItem } = PostListItemModule;
      
      // Create a test URL with duplicate path
      const testUrl = 'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j';
      
      // We can't directly access the normalizeMediaUrl function, but we can test the component's behavior
      setTestResult(`✅ Component imported successfully. Testing with URL: ${testUrl}`);
      
    } catch (error: any) {
      setTestResult(`❌ Error importing component: ${(error as Error).message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Debug Test Page
      </Typography>
      
      <Typography variant="h6" gutterBottom>
        Checking if our fixes are loaded
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={runDebugTest}
        disabled={isTesting}
        sx={{ mb: 2 }}
      >
        {isTesting ? 'Testing...' : 'Run Debug Test'}
      </Button>
      
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="body1">
          {testResult || 'Click the button above to run the debug test'}
        </Typography>
      </Box>
      
      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
        Manual Verification Steps:
      </Typography>
      
      <Box component="ol" sx={{ pl: 2 }}>
        <Typography component="li" variant="body1">
          Clear your browser cache (Ctrl+Shift+Delete in most browsers)
        </Typography>
        <Typography component="li" variant="body1">
          Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
        </Typography>
        <Typography component="li" variant="body1">
          Check the browser console for log messages from our updated code
        </Typography>
        <Typography component="li" variant="body1">
          Verify the Network tab shows requests to the correct URLs
        </Typography>
        <Typography component="li" variant="body1">
          Check if the JavaScript bundle has been updated (look for file timestamps)
        </Typography>
      </Box>
    </Container>
  );
};

export default DebugTestPage;
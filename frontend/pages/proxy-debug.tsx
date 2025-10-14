import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function ProxyDebug() {
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string | null>(null);

  const testProxy = async () => {
    try {
      // Test the proxy by making a fetch request to the uploads path
      const response = await fetch('/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9', {
        method: 'HEAD' // Just check if the file exists, don't download it
      });
      
      if (response.ok) {
        setTestResult(`✅ Proxy working correctly - Status: ${response.status}`);
        setTestError(null);
      } else {
        setTestResult(`❌ Proxy failed - Status: ${response.status}`);
        setTestError(`Status text: ${response.statusText}`);
      }
    } catch (error) {
      setTestResult('❌ Proxy test failed with error');
      setTestError(error instanceof Error ? error.message : String(error));
      console.error('Proxy test error:', error);
    }
  };

  // Run the test automatically when the component mounts
  useEffect(() => {
    testProxy();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Proxy Debug Test
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Test Result:</Typography>
        <Typography variant="body1">{testResult}</Typography>
        {testError && (
          <Typography variant="body2" color="error">
            Error: {testError}
          </Typography>
        )}
      </Box>
      
      <Button variant="contained" onClick={testProxy}>
        Run Test Again
      </Button>
      
      <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="h6">Debug Information</Typography>
        <Typography variant="body2">
          This test checks if the Next.js proxy is correctly forwarding requests from:
          <br />
          <code>/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9</code>
          <br />
          to:
          <br />
          <code>http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9</code>
        </Typography>
      </Box>
    </Box>
  );
}
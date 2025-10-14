import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function TestProxy() {
  const [proxyStatus, setProxyStatus] = useState<string>('Testing...');
  const [proxyError, setProxyError] = useState<string | null>(null);

  useEffect(() => {
    // Test if the proxy is working by trying to fetch a known file
    fetch('/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9')
      .then(response => {
        if (response.ok) {
          setProxyStatus(`✅ Proxy working - Status: ${response.status}`);
        } else {
          setProxyStatus(`❌ Proxy failed - Status: ${response.status}`);
          setProxyError(`Response: ${response.statusText}`);
        }
      })
      .catch(error => {
        setProxyStatus('❌ Proxy failed with error');
        setProxyError(error.message);
      });
  }, []);

  const testApiRoute = async () => {
    try {
      const response = await fetch('/api/proxy-test');
      const data = await response.json();
      setProxyStatus(`✅ API route working - ${data.message}`);
    } catch (error) {
      setProxyStatus('❌ API route failed');
      setProxyError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Proxy Test
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Proxy Status:</Typography>
        <Typography variant="body1">{proxyStatus}</Typography>
        {proxyError && (
          <Typography variant="body2" color="error">
            Error: {proxyError}
          </Typography>
        )}
      </Box>
      
      <Button variant="contained" onClick={testApiRoute}>
        Test API Route
      </Button>
    </Box>
  );
}
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { convertToProxyUrl } from '@/utils/urlConverter';

export default function TestUrlConversion() {
  const [testResults, setTestResults] = useState<any[]>([]);

  const testUrls = [
    'http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
    '/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9',
    'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    '/cloudinary/demo/image/upload/sample.jpg',
    'http://localhost:8000/uploads/other/file.jpg',
    '/uploads/other/file.jpg'
  ];

  const runTests = () => {
    const results = testUrls.map(url => {
      const converted = convertToProxyUrl(url);
      const proxied = proxyCloudinaryUrl(url);
      return {
        original: url,
        converted,
        proxied,
        success: converted.startsWith('/uploads/') || converted.startsWith('/cloudinary/') || converted.includes('placeholder'),
        proxiedSuccess: proxied.startsWith('/uploads/') || proxied.startsWith('/cloudinary/') || proxied.includes('placeholder')
      };
    });
    setTestResults(results);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        URL Conversion Test
      </Typography>
      
      <Button variant="contained" onClick={runTests} sx={{ mb: 3 }}>
        Run Tests
      </Button>

      {testResults.map((result, index) => (
        <Box 
          key={index} 
          sx={{ 
            p: 2, 
            mb: 2, 
            border: '1px solid #ccc', 
            borderRadius: 1,
            bgcolor: result.success && result.proxiedSuccess ? 'success.light' : 'error.light'
          }}
        >
          <Typography variant="body1">
            <strong>Original:</strong> {result.original}
          </Typography>
          <Typography variant="body1">
            <strong>Converted:</strong> {result.converted}
          </Typography>
          <Typography variant="body1">
            <strong>Proxied:</strong> {result.proxied}
          </Typography>
          <Typography variant="body1">
            <strong>Status:</strong> {result.success && result.proxiedSuccess ? '✅ PASS' : '❌ FAIL'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
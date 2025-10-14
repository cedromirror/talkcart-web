import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';

export default function TestImageProxy() {
  const [imageUrl, setImageUrl] = useState('http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9');
  const [extractedPath, setExtractedPath] = useState('');
  const [testResult, setTestResult] = useState('');

  const extractPath = () => {
    const match = imageUrl.match(/\/uploads\/.*/);
    if (match) {
      const path = match[0];
      setExtractedPath(path);
      setTestResult(`✅ Success! Extracted: ${path}`);
    } else {
      setTestResult('❌ Failed to extract /uploads path');
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Image Proxy Test
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Test Path Extraction
        </Typography>
        <TextField
          fullWidth
          label="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={extractPath} sx={{ mb: 2 }}>
          Extract Path
        </Button>
        {testResult && (
          <Typography sx={{ mb: 2 }}>{testResult}</Typography>
        )}
      </Paper>

      {extractedPath && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            2. Test Image Loading
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Extracted path: <code>{extractedPath}</code>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            This will be proxied through Next.js to: http://localhost:8000{extractedPath}
          </Typography>
          <Box sx={{ border: '2px solid #ddd', p: 2, borderRadius: 1 }}>
            <img
              src={extractedPath}
              alt="Test"
              style={{ maxWidth: '100%', height: 'auto' }}
              onLoad={() => console.log('✅ Image loaded successfully!')}
              onError={(e) => console.error('❌ Image failed to load:', e)}
            />
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Network Verification
        </Typography>
        <Typography variant="body2" paragraph>
          Open browser DevTools Network tab and check:
        </Typography>
        <ul>
          <li>Request URL should be: <code>http://localhost:4000/uploads/...</code></li>
          <li>Status should be: <code>200 OK</code></li>
          <li>Type should be: <code>image/jpeg</code> or similar</li>
        </ul>
      </Paper>
    </Box>
  );
}

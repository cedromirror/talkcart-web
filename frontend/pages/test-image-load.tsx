import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';

export default function TestImageLoad() {
  const [imageStatus, setImageStatus] = useState<string>('Loading...');
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageStatus('✅ Image loaded successfully');
      setImageError(null);
    };
    
    img.onerror = (e) => {
      setImageStatus('❌ Image failed to load');
      setImageError(`Error: ${JSON.stringify(e)}`);
    };
    
    // Test the proxied URL
    img.src = '/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9';
  }, []);

  const testWithFetch = async () => {
    try {
      const response = await fetch('/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9');
      if (response.ok) {
        setImageStatus('✅ Image loaded successfully via fetch');
      } else {
        setImageStatus(`❌ Fetch failed with status ${response.status}`);
      }
    } catch (error) {
      setImageStatus('❌ Fetch failed with error');
      setImageError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Image Load Test
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Direct Image Test:</Typography>
        <Typography variant="body1">{imageStatus}</Typography>
        {imageError && (
          <Typography variant="body2" color="error">
            Error: {imageError}
          </Typography>
        )}
      </Box>
      
      <Button variant="contained" onClick={testWithFetch}>
        Test with Fetch
      </Button>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Image Element Test:</Typography>
        <img 
          src="/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9" 
          alt="Test" 
          style={{ width: '200px', height: '200px', objectFit: 'cover' }}
          onError={(e) => {
            console.error('Image element error:', e);
          }}
          onLoad={(e) => {
            console.log('Image element loaded:', e);
          }}
        />
      </Box>
    </Box>
  );
}
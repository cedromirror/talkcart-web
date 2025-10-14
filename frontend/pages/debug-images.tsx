import { useState } from 'react';
import { Box, Button, Typography, TextField, CircularProgress } from '@mui/material';

export default function DebugImages() {
  const [testUrl, setTestUrl] = useState('http://localhost:8000/uploads/talkcart/talkcart/file_1760163879851_tt3fdqqim9');
  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBackendConnectivity = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-backend');
      const result = await response.json();
      setBackendStatus(result);
    } catch (error) {
      setBackendStatus({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  const testImageProxy = async () => {
    if (!testUrl) return;
    
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(testUrl)}`;
    console.log('Testing proxy URL:', proxyUrl);
    
    // Open in new tab to see what happens
    window.open(proxyUrl, '_blank');
  };

  return (
    <Box sx={{ p: 4, maxWidth: '800px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Image Loading Debug Page
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          1. Test Backend Connectivity
        </Typography>
        <Button 
          variant="contained" 
          onClick={testBackendConnectivity}
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Test Backend (localhost:8000)'}
        </Button>
        
        {backendStatus && (
          <Box sx={{ 
            p: 2, 
            bgcolor: backendStatus.success ? 'success.light' : 'error.light',
            borderRadius: 1,
            mb: 2
          }}>
            <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {JSON.stringify(backendStatus, null, 2)}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          2. Test Image URLs
        </Typography>
        
        <TextField
          fullWidth
          label="Image URL to test"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Button 
          variant="contained" 
          onClick={testImageProxy}
          disabled={!testUrl}
          sx={{ mb: 2, mr: 2 }}
        >
          Test Proxy URL (opens in new tab)
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          3. Direct Image Tests
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          {/* Test direct backend URL */}
          <Box sx={{ border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>Direct Backend URL:</Typography>
            <img 
              src={testUrl} 
              alt="Direct backend test"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
              onLoad={() => console.log('Direct URL loaded successfully')}
              onError={(e) => {
                console.error('Direct URL failed:', testUrl);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </Box>

          {/* Test proxy URL */}
          <Box sx={{ border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>Proxy URL:</Typography>
            <img 
              src={`/api/proxy-image?url=${encodeURIComponent(testUrl)}`}
              alt="Proxy test"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
              onLoad={() => console.log('Proxy URL loaded successfully')}
              onError={(e) => {
                console.error('Proxy URL failed:', `/api/proxy-image?url=${encodeURIComponent(testUrl)}`);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </Box>

          {/* Test placeholder */}
          <Box sx={{ border: '1px solid #ccc', p: 2, borderRadius: 1 }}>
            <Typography variant="body2" gutterBottom>Placeholder:</Typography>
            <img 
              src="/images/placeholder-image-new.png"
              alt="Placeholder test"
              style={{ width: '150px', height: '150px', objectFit: 'contain' }}
              onLoad={() => console.log('Placeholder loaded successfully')}
              onError={() => console.error('Placeholder failed to load')}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2">
          <strong>Instructions:</strong><br />
          1. Click "Test Backend" to check if localhost:8000 is accessible<br />
          2. Check the image boxes below - at least one should show an image<br />
          3. Open browser console to see detailed loading logs<br />
          4. If proxy works but direct doesn't, it's a CORS issue<br />
          5. If nothing works, check if backend is running on port 8000
        </Typography>
      </Box>
    </Box>
  );
}
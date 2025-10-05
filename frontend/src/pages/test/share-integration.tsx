import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { api } from '@/lib/api';

const ShareIntegrationTest: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useWebSocket();
  const [testPosts, setTestPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    loadTestPosts();
  }, []);

  const loadTestPosts = async () => {
    setIsLoading(true);
    try {
      const response: any = await api.posts.getAll({ feedType: 'public', limit: 3 });
      if (response.success) {
        setTestPosts(response.data.posts || []);
        addTestResult('✅ Successfully loaded test posts');
      } else {
        addTestResult('❌ Failed to load test posts');
      }
    } catch (error: any) {
      addTestResult(`❌ Error loading test posts: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testShareFunctionality = async () => {
    if (testPosts.length === 0) {
      addTestResult('❌ No test posts available');
      return;
    }

    const testPost = testPosts[0];
    addTestResult(`🧪 Testing share functionality on post: ${testPost._id}`);

    try {
      // Test basic share
      const shareResponse: any = await api.posts.share(testPost._id);
      if (shareResponse.success) {
        addTestResult(`✅ Basic share successful - New count: ${shareResponse.data.shareCount}`);
      } else {
        addTestResult(`❌ Basic share failed: ${shareResponse.message}`);
      }
    } catch (error: any) {
      addTestResult(`❌ Share test error: ${error.message}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🔄 Share Functionality Integration Test
      </Typography>

      {/* Status Overview */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          System Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color={isAuthenticated ? 'success.main' : 'error.main'}>
                  {isAuthenticated ? '✅' : '❌'} Authentication
                </Typography>
                <Typography variant="body2">
                  {isAuthenticated ? `Logged in as ${user?.username}` : 'Not authenticated'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color={isConnected ? 'success.main' : 'error.main'}>
                  {isConnected ? '✅' : '❌'} WebSocket
                </Typography>
                <Typography variant="body2">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color={testPosts.length > 0 ? 'success.main' : 'warning.main'}>
                  {testPosts.length > 0 ? '✅' : '⚠️'} Test Data
                </Typography>
                <Typography variant="body2">
                  {testPosts.length} posts loaded
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  🧪 Tests
                </Typography>
                <Typography variant="body2">
                  {testResults.length} results
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Authentication Warning */}
      {!isAuthenticated && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          Please log in to test share functionality. Some features require authentication.
        </Alert>
      )}

      {/* Test Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Test Controls
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={loadTestPosts}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            Reload Test Posts
          </Button>
          <Button
            variant="outlined"
            onClick={testShareFunctionality}
            disabled={!isAuthenticated || testPosts.length === 0}
          >
            Test Share API
          </Button>
          <Button
            variant="text"
            onClick={clearResults}
          >
            Clear Results
          </Button>
        </Box>
      </Paper>

      {/* Test Results */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Test Results
        </Typography>
        <Box sx={{ 
          maxHeight: 300, 
          overflow: 'auto', 
          bgcolor: 'grey.50', 
          p: 2, 
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.875rem'
        }}>
          {testResults.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No test results yet. Run some tests to see results here.
            </Typography>
          ) : (
            testResults.map((result, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                {result}
              </Typography>
            ))
          )}
        </Box>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* Live PostCard Tests */}
      <Typography variant="h5" gutterBottom>
        Live PostCard Share Tests
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        These are real PostCard components with share functionality. Click the share buttons to test.
      </Typography>

      {testPosts.slice(0, 3).map((post) => (
        <Box key={post._id} sx={{ mb: 3 }}>
          <PostCard
            post={post}
            onBookmark={(postId) => addTestResult(`PostCard bookmark clicked: ${postId}`)}
          />
        </Box>
      ))}

      {/* Implementation Summary */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          📋 Implementation Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              ✅ Backend Features
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Share endpoints with Socket.IO broadcasting</li>
              <li>Real-time share count updates</li>
              <li>Share with followers functionality</li>
              <li>Share with specific users</li>
              <li>External platform sharing tracking</li>
              <li>Share analytics and history</li>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              ✅ Frontend Features
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>PostCard share button with loading states</li>
              <li>Advanced ShareModal with multiple options</li>
              <li>Real-time share count updates</li>
              <li>Optimistic UI updates with rollback</li>
              <li>WebSocket integration for live updates</li>
              <li>Cross-platform data consistency</li>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ShareIntegrationTest;
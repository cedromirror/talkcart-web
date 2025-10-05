import React from 'react';
import { Container, Typography, Box, Card, CardContent, CircularProgress } from '@mui/material';
import Layout from '@/components/layout/Layout';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const TrendingVerificationPage: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndTestPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch trending posts using the API
        const response: any = await api.posts.getTrending({ limit: 30 });
        
        if (response?.success && response?.data?.posts) {
          // Set all posts
          setPosts(response.data.posts.slice(0, 10));
          
          // Apply the same filtering as in our components
          const filtered = response.data.posts.filter((post: any) => 
            (post.likeCount || post.likes || 0) >= 200 && 
            (post.commentCount || post.comments || 0) >= 20 && 
            (post.shareCount || post.shares || 0) >= 10
          );
          
          setFilteredPosts(filtered.slice(0, 10));
        } else {
          setError(response?.message || response?.error || 'Failed to load posts');
        }
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        setError(err?.message || 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchAndTestPosts();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Typography color="error">Error: {error}</Typography>
            </CardContent>
          </Card>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Trending Posts Filtering Verification
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6">All Trending Posts (First 10)</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {posts.map((post) => (
              <Card key={post.id || post._id} sx={{ p: 2 }}>
                <Typography variant="body2" noWrap>{post.content}</Typography>
                <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                  <Typography variant="caption">
                    Likes: {post.likeCount || post.likes || 0}
                  </Typography>
                  <Typography variant="caption">
                    Comments: {post.commentCount || post.comments || 0}
                  </Typography>
                  <Typography variant="caption">
                    Shares: {post.shareCount || post.shares || 0}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
        
        <Box>
          <Typography variant="h6">
            Filtered Posts (200+ likes, 20+ comments, 10+ shares) - {filteredPosts.length} posts
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <Card key={post.id || post._id} sx={{ p: 2, border: '2px solid #4caf50' }}>
                  <Typography variant="body2" noWrap>{post.content}</Typography>
                  <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                    <Typography variant="caption">
                      Likes: {post.likeCount || post.likes || 0}
                    </Typography>
                    <Typography variant="caption">
                      Comments: {post.commentCount || post.comments || 0}
                    </Typography>
                    <Typography variant="caption">
                      Shares: {post.shareCount || post.shares || 0}
                    </Typography>
                  </Box>
                </Card>
              ))
            ) : (
              <Card sx={{ p: 2 }}>
                <Typography>No posts meet the filtering criteria</Typography>
              </Card>
            )}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default TrendingVerificationPage;
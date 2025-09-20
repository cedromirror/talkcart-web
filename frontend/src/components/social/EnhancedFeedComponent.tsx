import React from 'react';
import { Container, Typography, Stack, Card, CardContent, Button, Box } from '@mui/material';
import { MessageCircle, Heart, Share, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';

export default function EnhancedFeedComponent() {
  const { user } = useAuth();

  // Removed mock posts. Consider rendering real posts list component here.
  const mockPosts: any[] = [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom className="font-bold">
            Social Feed
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.displayName || user?.username || 'User'}! Here's what's happening in your network.
          </Typography>
        </Box>

        {/* Posts */}
        <Stack spacing={3}>
          {mockPosts.map((post) => (
            <Card key={post.id} elevation={2}>
              <CardContent>
                <Stack spacing={3}>
                  {/* Post Header */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      {post.author.displayName.charAt(0)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {post.author.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{post.author.username} • {post.timestamp}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Post Content */}
                  <Typography variant="body1">
                    {post.content}
                  </Typography>

                  {/* Post Actions */}
                  <Stack direction="row" spacing={3}>
                    <Button
                      variant="text"
                      startIcon={<Heart size={18} />}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {post.likes}
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<MessageCircle size={18} />}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {post.comments}
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<Share size={18} />}
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {post.shares}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Load More */}
        <Box textAlign="center">
          <Button variant="outlined" size="large">
            Load More Posts
          </Button>
        </Box>

        {/* Coming Soon Features */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <EmptyState
              icon={<TrendingUp size={48} className="text-blue-500" />}
              title="More Features Coming Soon"
              description="We're working on advanced feed algorithms, real-time updates, media sharing, and much more!"
            />
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
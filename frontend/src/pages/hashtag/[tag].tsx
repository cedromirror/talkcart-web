import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
  alpha,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { 
  Hash, 
  TrendingUp, 
  Users, 
  BarChart,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { Post } from '@/types/social';
import { useRouter } from 'next/router';

const HashtagPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { tag } = router.query;
  
  // Mock posts for hashtag
  const hashtagPosts: Post[] = [
    {
      id: '1',
      type: 'image',
      content: `Exploring the amazing world of #${tag}! This technology is revolutionizing everything. #Web3 #Blockchain`,
      author: {
        username: 'digital_creator',
        displayName: 'Digital Creator',
        avatar: '',
        isVerified: true,
        id: '1',
      },
      media: [
        {
          resource_type: 'image',
          secure_url: '',
        }
      ],
      createdAt: new Date().toISOString(),
      likes: 2450,
      comments: 320,
      shares: 180,
      views: 12000,
      isLiked: false,
      isBookmarked: false,
    },
    {
      id: '2',
      type: 'video',
      content: `Just discovered a new #${tag} project that's absolutely incredible! The future is bright. #NFT #Crypto`,
      author: {
        username: 'web3_pioneer',
        displayName: 'Web3 Pioneer',
        avatar: '',
        isVerified: true,
        id: '2',
      },
      media: [
        {
          resource_type: 'video',
          secure_url: '',
          thumbnail_url: '',
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      likes: 1890,
      comments: 240,
      shares: 120,
      views: 8900,
      isLiked: true,
      isBookmarked: false,
    },
    {
      id: '3',
      type: 'image',
      content: `Behind the scenes of my latest #${tag} collection creation process. #DigitalArt #NFT`,
      author: {
        username: 'artistic_vision',
        displayName: 'Artistic Vision',
        avatar: '',
        isVerified: false,
        id: '3',
      },
      media: [
        {
          resource_type: 'image',
          secure_url: '',
        }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      likes: 3560,
      comments: 420,
      shares: 280,
      views: 21000,
      isLiked: false,
      isBookmarked: true,
    },
  ];

  const handleBookmarkPost = (postId: string) => {
    console.log('Bookmark post:', postId);
  };

  // Format large numbers (e.g., 1.2K, 3.4M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (!tag) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading hashtag...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box 
                sx={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Hash size={32} color={theme.palette.primary.main} />
              </Box>
              <Box>
                <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                  #{tag}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Trending hashtag
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                  }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUp size={24} color={theme.palette.primary.main} style={{ marginBottom: 8 }} />
                    <Typography variant="h4" fontWeight={700}>
                      125K
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Posts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    bgcolor: alpha(theme.palette.info.main, 0.05)
                  }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Users size={24} color={theme.palette.info.main} style={{ marginBottom: 8 }} />
                    <Typography variant="h4" fontWeight={700}>
                      8.9K
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      People
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    height: '100%',
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    bgcolor: alpha(theme.palette.success.main, 0.05)
                  }}
                >
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <BarChart size={24} color={theme.palette.success.main} style={{ marginBottom: 8 }} />
                    <Typography variant="h4" fontWeight={700}>
                      #12
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Trending
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button 
                variant="contained" 
                size="large"
                sx={{ 
                  borderRadius: 3, 
                  px: 4, 
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                  }
                }}
              >
                Follow #{tag}
              </Button>
            </Box>
          </CardContent>
        </Card>
        
        {/* Posts */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={700}>
              Recent Posts
            </Typography>
            <Chip 
              label="Most Recent" 
              size="small" 
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                fontWeight: 600
              }} 
            />
          </Box>
          
          {hashtagPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onBookmark={handleBookmarkPost}
            />
          ))}
        </Box>
      </Container>
    </Layout>
  );
};

export default HashtagPage;
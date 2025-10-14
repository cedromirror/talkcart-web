import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Eye,
  Users,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import UserAvatar from '@/components/common/UserAvatar';
import { Post } from '@/types/social';

interface TrendingPost {
  id: string;
  title: string;
  author: {
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  engagement: {
    likes: number;
    comments: number;
    views: number;
  };
  thumbnail?: string;
  timestamp: string;
  isLive?: boolean;
}

export const TrendingPosts: React.FC = () => {
  const theme = useTheme();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Format relative time
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now.getTime() - postTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return postTime.toLocaleDateString();
  };

  // Fetch trending posts from the API
  const fetchTrendingPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the dedicated trending endpoint
      const response: any = await api.posts.getTrending({
        limit: 5,
        timeRange: 'week' // Get trending posts from the past week
      });
      
      if (response?.success && response?.data?.posts) {
        // Transform the posts data to match our TrendingPost interface
        const trending = response.data.posts
          .map((post: Post) => ({
            id: post.id,
            title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
            author: {
              username: post.author?.username || 'Unknown',
              avatar: post.author?.avatar,
              isVerified: post.author?.isVerified,
            },
            engagement: {
              likes: post.likeCount || post.likes || 0,
              comments: post.commentCount || post.comments || 0,
              views: post.views || 0,
            },
            thumbnail: post.media && post.media.length > 0 
              ? post.media[0].thumbnail_url || post.media[0].secure_url 
              : undefined,
            timestamp: post.createdAt,
            isLive: false, // We'll set the first post as live for demonstration
          }))
          .sort((a: TrendingPost, b: TrendingPost) => 
            (b.engagement.likes + b.engagement.comments + b.engagement.views) - 
            (a.engagement.likes + a.engagement.comments + a.engagement.views)
          );
        
        // Mark the first post as live
        if (trending.length > 0) {
          trending[0].isLive = true;
        }
        
        setTrendingPosts(trending);
      } else {
        throw new Error('Failed to fetch trending posts');
      }
    } catch (err: any) {
      console.error('Error fetching trending posts:', err);
      setError(err.message || 'Failed to load trending posts');
      
      // Fallback to mock data if API fails
      const mockTrending: TrendingPost[] = [
        {
          id: '1',
          title: 'Exciting new NFT collection launch!',
          author: {
            username: 'crypto_artist',
            avatar: '',
            isVerified: true,
          },
          engagement: {
            likes: 12500,
            comments: 342,
            views: 45600,
          },
          thumbnail: '',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isLive: true,
        },
        {
          id: '2',
          title: 'Marketplace update: New features released',
          author: {
            username: 'talkcart_team',
            avatar: '',
            isVerified: true,
          },
          engagement: {
            likes: 8900,
            comments: 127,
            views: 23400,
          },
          thumbnail: '',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '3',
          title: 'How to secure your crypto wallet',
          author: {
            username: 'security_expert',
            avatar: '',
            isVerified: false,
          },
          engagement: {
            likes: 6700,
            comments: 89,
            views: 18900,
          },
          thumbnail: '',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ];
      setTrendingPosts(mockTrending);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingPosts();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Card 
        variant="outlined" 
        sx={{ 
          borderRadius: 3, 
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          bgcolor: 'background.paper'
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingUp size={20} color={theme.palette.primary.main} />
            <Typography variant="h6" fontWeight={700}>
              Trending Posts
            </Typography>
          </Box>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        bgcolor: 'background.paper'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUp size={20} color={theme.palette.primary.main} />
          <Typography variant="h6" fontWeight={700}>
            Trending Posts
          </Typography>
          <Chip 
            label="Live" 
            size="small" 
            color="error" 
            sx={{ 
              height: 20, 
              fontSize: '0.7rem',
              fontWeight: 700
            }} 
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trendingPosts.map((post) => (
            <Card 
              key={post.id}
              sx={{ 
                display: 'flex',
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  bgcolor: alpha(theme.palette.primary.main, 0.02)
                }
              }}
              onClick={() => window.open(`/post/${post.id}`, '_blank')}
            >
              {post.thumbnail ? (
                <CardMedia
                  component="img"
                  sx={{ width: 80, height: 80, objectFit: 'cover' }}
                  image={post.thumbnail}
                  alt={post.title}
                />
              ) : (
                <Box 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <TrendingUp size={24} color={theme.palette.primary.main} />
                </Box>
              )}
              
              <Box sx={{ flex: 1, p: 1.5 }}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  sx={{ 
                    mb: 0.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {post.title}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <UserAvatar
                    src={post.author.avatar}
                    alt={post.author.username}
                    size={20}
                    isVerified={post.author.isVerified}
                    sx={{ fontSize: '0.6rem' }}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    @{post.author.username}
                  </Typography>
                  {post.isLive && (
                    <Chip 
                      label="LIVE" 
                      size="small" 
                      color="error" 
                      sx={{ 
                        height: 16, 
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        minWidth: 0,
                        px: 0.5
                      }} 
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Heart size={14} color={theme.palette.error.main} fill={theme.palette.error.main} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.engagement.likes)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MessageSquare size={14} color={theme.palette.info.main} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.engagement.comments)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Eye size={14} color={theme.palette.grey[500]} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.engagement.views)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={14} color={theme.palette.grey[500]} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(post.timestamp)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrendingPosts;
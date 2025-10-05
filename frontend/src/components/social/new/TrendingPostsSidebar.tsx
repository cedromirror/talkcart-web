import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  Avatar,
} from '@mui/material';
import { 
  Heart, 
  MessageSquare, 
  Share, 
  TrendingUp,
  Play,
  Image as ImageIcon,
  Eye,
  BarChart,
  Music,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface TrendingPost {
  id: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  media: Array<{
    secure_url: string;
    resource_type: string;
    thumbnail_url?: string;
  }>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementScore: number;
  createdAt: string;
  isViral?: boolean; // Added to highlight viral content
  views?: number; // Added views metric
}

interface TrendingPostsResponse {
  success: boolean;
  data?: {
    posts: TrendingPost[];
  };
  error?: string;
  message?: string;
}

const TrendingPostsSidebar: React.FC = () => {
  const theme = useTheme();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { onPostLikeUpdate, onPostShareUpdate, onPostUpdate } = useWebSocket();

  // Fetch trending posts
  const fetchTrendingPosts = async () => {
    try {
      setLoading(true);
      console.log('Fetching trending posts...');
      
      // First, test if the posts API is working by checking health endpoint
      try {
        const healthResponse = await api.posts.health();
        console.log('Posts API health check:', healthResponse);
      } catch (healthError) {
        console.error('Posts API health check failed:', healthError);
      }
      
      const response = await api.posts.getTrending({ limit: 15 }) as TrendingPostsResponse; // Fetch more to ensure we have enough after filtering
      console.log('Trending posts response:', response);
      
      if (response.success && response.data?.posts) {
        // Filter posts based on criteria: 200+ likes, 20+ comments, 10+ shares
        const filteredPosts = response.data.posts.filter(post => 
          post.likeCount >= 200 && 
          post.commentCount >= 20 && 
          post.shareCount >= 10
        );
        
        // Sort posts by engagement score
        const sortedPosts = filteredPosts.sort((a: TrendingPost, b: TrendingPost) => 
          (b.engagementScore || 0) - (a.engagementScore || 0)
        );
        
        // Limit to 5 posts
        setTrendingPosts(sortedPosts.slice(0, 5));
      } else {
        setError(response.message || response.error || 'Failed to load trending posts');
      }
    } catch (err: any) {
      console.error('Error fetching trending posts:', err);
      // Check if it's an HttpError with status 404 (Not Found)
      if (err?.status === 404) {
        setError('Trending posts feature is not available');
        // In development, we could use mock data as a fallback
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for trending posts in development');
          const mockPosts: TrendingPost[] = [
            {
              id: '1',
              content: 'This is a mock trending post #trending #mock',
              author: {
                username: 'mockuser',
                displayName: 'Mock User',
                avatar: '',
                isVerified: true
              },
              media: [],
              likeCount: 42,
              commentCount: 5,
              shareCount: 3,
              engagementScore: 120,
              createdAt: new Date().toISOString(),
              isViral: true,
              views: 1200
            },
            {
              id: '2',
              content: 'Another mock post for testing #demo #test',
              author: {
                username: 'testuser',
                displayName: 'Test User',
                avatar: '',
                isVerified: false
              },
              media: [],
              likeCount: 28,
              commentCount: 2,
              shareCount: 1,
              engagementScore: 85,
              createdAt: new Date().toISOString(),
              views: 450
            }
          ];
          setTrendingPosts(mockPosts);
        }
      } else {
        setError(err?.message || 'Failed to load trending posts');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update post engagement metrics in real-time
  const updatePostMetrics = useCallback((postId: string, updates: Partial<TrendingPost>) => {
    setTrendingPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId ? { ...post, ...updates } : post
      )
    );
  }, []);

  // Listen for real-time like updates
  useEffect(() => {
    const unsubscribe = onPostLikeUpdate((data) => {
      if (data.postId) {
        updatePostMetrics(data.postId, { 
          likeCount: data.likeCount,
          isViral: data.likeCount > 100 // Highlight as viral if likes exceed 100
        });
      }
    });

    return unsubscribe;
  }, [onPostLikeUpdate, updatePostMetrics]);

  // Listen for real-time share updates
  useEffect(() => {
    const unsubscribe = onPostShareUpdate((data) => {
      if (data.postId) {
        updatePostMetrics(data.postId, { 
          shareCount: data.shareCount,
          isViral: data.shareCount > 50 // Highlight as viral if shares exceed 50
        });
      }
    });

    return unsubscribe;
  }, [onPostShareUpdate, updatePostMetrics]);

  // Listen for general post updates
  useEffect(() => {
    const unsubscribe = onPostUpdate((data) => {
      if (data.postId) {
        // For general updates, we might want to refresh the entire list
        // or update specific metrics based on the update type
        if (data.type === 'comment') {
          updatePostMetrics(data.postId, { 
            commentCount: (data.data?.commentCount as number) || 0
          });
        }
      }
    });

    return unsubscribe;
  }, [onPostUpdate, updatePostMetrics]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTrendingPosts();
    
    // Refresh trending posts every 5 minutes
    const interval = setInterval(() => {
      fetchTrendingPosts();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

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

  // Extract hashtags from content
  const extractHashtags = (content: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.slice(0, 3) : [];
  };

  // Format date
  const formatDate = (date: string): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp size={20} style={{ marginRight: 8 }} />
            <Typography variant="h6" component="h2" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
              Trending Posts
            </Typography>
          </Box>
          <IconButton size="small" onClick={fetchTrendingPosts} disabled={loading}>
            <RefreshCw size={18} />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 0 }} />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 0 }}>
            {error}
          </Alert>
        ) : trendingPosts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 0 }}>
            No trending posts found
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {trendingPosts.slice(0, 3).map((post) => (
              <Box 
                key={post.id}
                sx={{ 
                  cursor: 'pointer',
                  borderRadius: 2,
                  p: 0,
                  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderColor: theme.palette.primary.main
                  }
                }}
                onClick={() => window.location.href = `/post/${post.id}`}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar 
                    src={post.author?.avatar || ''} 
                    sx={{ width: 24, height: 24, fontSize: '0.7rem' }}
                  >
                    {post.author?.displayName?.charAt(0) || post.author?.username?.charAt(0) || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                      {post.author?.displayName || post.author?.username || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(post.createdAt)}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 1,
                    lineHeight: 1.4,
                    maxHeight: 40,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    fontSize: '0.8rem' // Reduced from 0.85rem
                  }}
                >
                  {post.content}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Heart size={14} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.likeCount || 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <MessageSquare size={14} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.commentCount || 0)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Share size={14} />
                    <Typography variant="caption" fontWeight={600}>
                      {formatNumber(post.shareCount || 0)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingPostsSidebar;
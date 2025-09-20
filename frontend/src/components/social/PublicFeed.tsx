import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
  Skeleton,
  Fade,
  Container,
  Grid,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  Clock,
  ThumbsUp,
  RefreshCw,
  Filter,
  Eye,
  Grid3X3,
  List,
  Users,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PostCard from './PostCard';
import { formatTextWithMentions } from '@/utils/mentionUtils';
import toast from 'react-hot-toast';

interface PublicFeedProps {
  showHeader?: boolean;
  maxPosts?: number;
  contentFilter?: string;
  sortBy?: 'recent' | 'trending' | 'popular';
  onPostClick?: (postId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  query?: string;
}

/**
 * PublicFeed component displays all public posts that everyone can see
 * No authentication required - perfect for showcasing platform content
 */
export const PublicFeed: React.FC<PublicFeedProps> = ({
  showHeader = true,
  maxPosts = 20,
  contentFilter = 'all',
  sortBy = 'recent',
  onPostClick,
  onHashtagClick,
  query
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeSort, setActiveSort] = useState(sortBy);
  const [activeFilter, setActiveFilter] = useState(contentFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch public posts
  const { 
    data: postsData, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['public-posts', activeSort, activeFilter, maxPosts, (query || '').trim()],
    queryFn: async () => {
      try {
        const response = await api.posts.getPublicPosts({
          sortBy: activeSort,
          contentType: activeFilter,
          limit: maxPosts,
          search: (query || '').trim() || undefined,
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching public posts:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    retry: 2,
  });

  const posts = postsData?.data?.posts || [];
  const pagination = postsData?.data?.pagination;

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Feed refreshed!');
    } catch (error) {
      toast.error('Failed to refresh feed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort options
  const sortOptions = [
    { value: 'recent', label: 'Recent', icon: <Clock size={16} />, color: '#96ceb4' },
    { value: 'trending', label: 'Trending', icon: <TrendingUp size={16} />, color: '#45b7d1' },
    { value: 'popular', label: 'Popular', icon: <ThumbsUp size={16} />, color: '#ff6b6b' },
  ];

  // Content filter options
  const filterOptions = [
    { value: 'all', label: 'All', icon: '📱', color: '#667eea' },
    { value: 'text', label: 'Text', icon: '📝', color: '#f093fb' },
    { value: 'image', label: 'Images', icon: '📸', color: '#4facfe' },
    { value: 'video', label: 'Videos', icon: '🎥', color: '#43e97b' },
    { value: 'audio', label: 'Audio', icon: '🎤', color: '#fa709a' },
  ];

  // Loading skeleton
  const renderSkeleton = () => (
    <Box>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box flex={1}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            </Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  // Error state
  if (error) {
    return (
      <Container maxWidth="md">
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Try Again
            </Button>
          }
        >
          Failed to load public posts. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {showHeader && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 3, 
            background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Globe color={theme.palette.primary.main} size={24} />
            <Typography variant="h5" fontWeight={600}>
              Public Feed
            </Typography>
            <Chip 
              label="Everyone can see" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Discover amazing content from the TalkCart community. All posts shown here are public and visible to everyone.
          </Typography>
        </Paper>
      )}

      {/* Controls */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          {/* Sort Tabs */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Sort:
            </Typography>
            {sortOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                icon={option.icon}
                clickable
                variant={activeSort === option.value ? 'filled' : 'outlined'}
                color={activeSort === option.value ? 'primary' : 'default'}
                onClick={() => setActiveSort(option.value as any)}
                size="small"
              />
            ))}
          </Box>

          {/* Controls */}
          <Box display="flex" alignItems="center" gap={1}>
            {/* Content Filter */}
            <Box display="flex" alignItems="center" gap={1}>
              {filterOptions.map((option) => (
                <Tooltip key={option.value} title={option.label}>
                  <Chip
                    label={option.icon}
                    clickable
                    variant={activeFilter === option.value ? 'filled' : 'outlined'}
                    color={activeFilter === option.value ? 'primary' : 'default'}
                    onClick={() => setActiveFilter(option.value)}
                    size="small"
                    sx={{ minWidth: 'auto', px: 1 }}
                  />
                </Tooltip>
              ))}
            </Box>

            {/* View Mode Toggle */}
            <Box display="flex" alignItems="center">
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <List size={16} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <Grid3X3 size={16} />
              </IconButton>
            </Box>

            {/* Refresh Button */}
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isRefreshing || isRefetching}
              color="primary"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Posts Content */}
      {isLoading ? (
        renderSkeleton()
      ) : posts.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
          <Sparkles size={48} color={theme.palette.text.secondary} style={{ marginBottom: 16 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No public posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Be the first to share something amazing with the community!
          </Typography>
        </Paper>
      ) : (
        <Fade in={true}>
          <Box>
            {viewMode === 'grid' ? (
              <Grid container spacing={2}>
                {posts.map((post: any) => (
                  <Grid item xs={12} sm={6} md={4} key={post.id || post._id}>
                    <PostCard
                      post={post}
                      onPostClick={onPostClick}
                      onHashtagClick={onHashtagClick}
                      compact={true}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box>
                {posts.map((post: any, index: number) => (
                  <Fade in={true} timeout={300 + index * 100} key={post.id || post._id}>
                    <Box mb={2}>
                      <PostCard
                        post={post}
                        onPostClick={onPostClick}
                        onHashtagClick={onHashtagClick}
                      />
                    </Box>
                  </Fade>
                ))}
              </Box>
            )}

            {/* Pagination Info */}
            {pagination && (
              <Paper elevation={0} sx={{ p: 2, mt: 3, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {posts.length} of {pagination.totalPosts} public posts
                  {pagination.hasNextPage && (
                    <span> • Load more posts by refreshing or changing filters</span>
                  )}
                </Typography>
              </Paper>
            )}
          </Box>
        </Fade>
      )}
    </Container>
  );
};

export default PublicFeed;
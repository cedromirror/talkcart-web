import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Divider,
  Button,
  TextField,
  Tabs,
  Tab,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  Fab,
  Tooltip,
  Badge,
} from '@mui/material';
import { 
  MoreHorizontal, 
  Heart, 
  MessageSquare, 
  Share, 
  Bookmark, 
  Image, 
  Video,
  Smile, 
  Hash, 
  TrendingUp, 
  Clock, 
  BookmarkCheck,
  AlertCircle,
  Plus,
  RefreshCw,
  Home,
  Compass,
  Search,
  User,
  Bell,
  Mail,
  Zap,
  Award,
  Users,
  Filter,
  Sliders
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import usePosts from '@/hooks/usePosts';

import WhoToFollow from './WhoToFollow';
import { CreatePostDialog } from './CreatePostDialog';
import { PostCardEnhanced } from './PostCardEnhanced';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import TrendingProducts from './TrendingProducts';
import TrendingPostsSidebar from './TrendingPostsSidebar';
import TrendingPosts from './TrendingPosts';
import UserAchievements from './UserAchievements';
import { VideoFeedProvider } from '@/components/video/VideoFeedManager'; // Import VideoFeedProvider

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feed-tabpanel-${index}`}
      aria-labelledby={`feed-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `feed-tab-${index}`,
    'aria-controls': `feed-tabpanel-${index}`,
  };
}

const SocialPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [postContent, setPostContent] = useState('');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize usePosts with the appropriate feed type based on active tab
  const getFeedType = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: return 'for-you';
      case 1: return 'following';
      case 2: return 'recent';
      case 3: return 'bookmarks';
      default: return 'for-you';
    }
  };
  
  const { posts, loading, error, fetchPosts, fetchBookmarkedPosts, likePost, bookmarkPost, sharePost } = usePosts();
  
  const router = useRouter();
  
  // Handle tab change and fetch posts for the new feed type
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const feedType = getFeedType(newValue);
    
    // Handle bookmarked posts specially
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
  };
  
  // Handle post submit
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Post content:', postContent);
    setPostContent('');
    // In a real app, you would send this to your API
    // After successful post, refresh the feed
    const feedType = getFeedType(activeTab);
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
  };
  
  // Handle post interactions
  const handleBookmarkPost = (postId: string) => {
    bookmarkPost(postId);
  };
  
  // Handle refresh for current feed
  const handleRefresh = () => {
    const feedType = getFeedType(activeTab);
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
  };
  
  // Fetch posts when activeTab changes
  useEffect(() => {
    const feedType = getFeedType(activeTab);
    
    // Handle bookmarked posts specially
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
  }, [activeTab, fetchPosts, fetchBookmarkedPosts, user?.id]);
  
  return (
    <Layout>
      {/* Main content area - TikTok style feed */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        height: { xs: 'auto', md: 'calc(100vh - 64px)' },
        overflow: 'hidden'
      }}>
        {/* Left sidebar - Hidden on mobile */}
        <Box sx={{ 
          width: { md: 300 }, 
          display: { xs: 'none', md: 'block' },
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          overflowY: 'auto',
          p: 2
        }}>
          <TrendingProducts />
          <Box sx={{ mt: 2 }}>
            <WhoToFollow limit={4} />
          </Box>
          <Box sx={{ mt: 2 }}>
            <TrendingPosts />
          </Box>
        </Box>
        
        {/* Main feed area */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Top navigation for mobile */}
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' },
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            bgcolor: theme.palette.background.paper
          }}>
            <Typography variant="h6" fontWeight={700}>
              TalkCart
            </Typography>
            <IconButton onClick={() => setCreatePostOpen(true)}>
              <Plus size={24} />
            </IconButton>
          </Box>
          
          {/* Feed tabs - Only show on desktop */}
          <Box sx={{ 
            display: { xs: 'none', md: 'block' },
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            bgcolor: theme.palette.background.paper
          }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                  height: 3
                }
              }}
            >
              <Tab label="For You" {...a11yProps(0)} />
              <Tab label="Following" {...a11yProps(1)} />
              <Tab label="Recent" {...a11yProps(2)} />
              <Tab label="Bookmarks" {...a11yProps(3)} />
            </Tabs>
          </Box>
          
          {/* Feed controls */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            bgcolor: theme.palette.background.paper
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {activeTab === 0 && 'For You'}
                {activeTab === 1 && 'Following'}
                {activeTab === 2 && 'Recent'}
                {activeTab === 3 && 'Bookmarks'}
              </Typography>
              <Chip 
                label={`${posts.length} posts`} 
                size="small" 
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontWeight: 600
                }} 
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Refresh feed">
                <IconButton onClick={handleRefresh}>
                  <RefreshCw size={20} />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Filter posts">
                <IconButton onClick={() => setShowFilters(!showFilters)}>
                  <Filter size={20} />
                </IconButton>
              </Tooltip>
              
              <Button 
                variant="contained" 
                startIcon={<Plus size={18} />}
                onClick={() => setCreatePostOpen(true)}
                sx={{ 
                  borderRadius: 3, 
                  px: 2, 
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                  }
                }}
              >
                Create
              </Button>
            </Box>
          </Box>
          
          {/* Feed content - TikTok style vertical scroll */}
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto',
            p: { xs: 1, md: 2 }
          }}>
            {/* Wrap the feed content with VideoFeedProvider for auto play/pause functionality */}
            <VideoFeedProvider
              initialSettings={{
                enabled: true,
                threshold: 0.6,
                pauseOnScroll: true,
                muteByDefault: true,
                preloadStrategy: 'metadata',
                maxConcurrentVideos: 2,
                scrollPauseDelay: 150,
                viewTrackingThreshold: 3,
                autoplayOnlyOnWifi: false,
                respectReducedMotion: true,
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : error ? (
                <Box sx={{ textAlign: 'center', my: 8 }}>
                  <AlertCircle size={56} color={theme.palette.error.main} style={{ marginBottom: 20 }} />
                  <Typography color="error" variant="h6" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<RefreshCw size={18} />}
                    sx={{ mt: 2, borderRadius: 2, px: 4 }}
                    onClick={handleRefresh}
                  >
                    Try Again
                  </Button>
                </Box>
              ) : posts.length === 0 ? (
                <Box sx={{ textAlign: 'center', my: 8 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No posts found
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Be the first to post something!
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={<Plus size={20} />}
                    onClick={() => setCreatePostOpen(true)}
                    sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                  >
                    Create Your First Post
                  </Button>
                </Box>
              ) : (
                posts.map((post) => (
                  <PostCardEnhanced 
                    key={post.id} 
                    post={post} 
                    onBookmark={handleBookmarkPost}
                    onLike={likePost}
                    onShare={sharePost}
                    onComment={(postId) => {
                      // Navigate to the post detail page with focus on comments
                      router.push(`/post/${postId}?focus=comments`);
                    }}
                  />
                ))
              )}
            </VideoFeedProvider>
          </Box>
        </Box>
        
        {/* Right sidebar - Hidden on mobile */}
        <Box sx={{ 
          width: { md: 300 }, 
          display: { xs: 'none', md: 'block' },
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          overflowY: 'auto',
          p: 2
        }}>
          <Box sx={{ 
            position: 'sticky', 
            top: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<Bell size={18} />}
                    sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                  >
                    Notifications
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<Mail size={18} />}
                    sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                  >
                    Messages
                  </Button>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<Plus size={18} />}
                    onClick={() => setCreatePostOpen(true)}
                    sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
                  >
                    Create Post
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            <TrendingPostsSidebar />
            
            <UserAchievements />
            
            <WhoToFollow limit={5} />
          </Box>
        </Box>
      </Box>

      {/* Bottom navigation for mobile - TikTok style */}
      <Box sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'space-around',
        alignItems: 'center',
        p: 1,
        bgcolor: theme.palette.background.paper,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        zIndex: 1000
      }}>
        <IconButton>
          <Home size={24} />
        </IconButton>
        <IconButton>
          <Compass size={24} />
        </IconButton>
        <IconButton 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus size={24} />
        </IconButton>
        <IconButton>
          <Search size={24} />
        </IconButton>
        <IconButton>
          <User size={24} />
        </IconButton>
      </Box>

      {/* Adjust for bottom navigation on mobile */}
      <Box sx={{ height: { xs: 60, md: 0 } }} />

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={() => {
          const feedType = getFeedType(activeTab);
          if (feedType === 'bookmarks' && user?.id) {
            fetchBookmarkedPosts(user.id);
          } else {
            fetchPosts({ feedType });
          }
          setCreatePostOpen(false);
        }}
      />
    </Layout>
  );
};

export default SocialPage;
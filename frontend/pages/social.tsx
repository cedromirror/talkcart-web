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
  Users, 
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
  ShoppingCart
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import usePosts from '@/hooks/usePosts';

import WhoToFollow from '@/components/social/new/WhoToFollow';
import { CreatePostDialog } from '@/components/social/new/CreatePostDialog';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { VideoFeedProvider } from '@/components/video/VideoFeedManager';
import TrendingProducts from '@/components/social/new/TrendingProducts';
import TrendingPostsSidebar from '@/components/social/new/TrendingPostsSidebar';
import { useRouter } from 'next/router';

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
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [postContent, setPostContent] = useState('');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  
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
  
  // Navigation handlers with error handling
  const handleNavigation = (path: string) => {
    router.push(path).catch((err) => {
      console.error(`Failed to navigate to ${path}:`, err);
      // Fallback to showing an alert if navigation fails
      alert(`Unable to navigate to ${path}. Please try again.`);
    });
  };
  
  // Handle profile navigation with proper user context
  const handleProfileNavigation = () => {
    if (!user) {
      // If user is not authenticated, redirect to login
      handleNavigation('/auth/login?redirect=/profile');
      return;
    }
    
    // If user has a username, go to their profile page
    if (user.username) {
      handleNavigation(`/profile/${user.username}`);
    } else {
      // Fallback to generic profile page
      handleNavigation('/profile');
    }
  };
  
  return (
    <Layout>
      {/* Main content area - Enhanced TikTok-style feed with vibrant design */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        height: { xs: 'auto', md: 'calc(100vh - 64px)' },
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
      }}>
        {/* Left sidebar - Hidden on mobile - Enhanced user discovery features */}
        <Box sx={{
          width: { md: 280 },
          display: { xs: 'none', md: 'block' },
          borderRight: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          overflowY: 'auto',
          p: 2,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)'
        }}>
          <WhoToFollow limit={5} />
          <Box sx={{ mt: 3 }}>
            <TrendingPostsSidebar />
          </Box>
        </Box>
        
        {/* Main feed area - Enhanced with vibrant design and better spacing */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          maxWidth: { md: 'calc(100% - 560px)' }, // Adjusted for wider sidebars
          p: { xs: 0, md: 2 }
        }}>
          {/* Top navigation for mobile - Enhanced design */}
          <Box sx={{
            display: { xs: 'flex', md: 'none' },
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2.5,
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            bgcolor: `linear-gradient(90deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  T
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                TalkCart
              </Typography>
            </Box>
            <Fab
              size="small"
              onClick={() => setCreatePostOpen(true)}
              sx={{
                bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  bgcolor: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Plus size={20} />
            </Fab>
          </Box>

          {/* Feed tabs - Enhanced design for desktop */}
          <Box sx={{
            display: { xs: 'none', md: 'block' },
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            mx: 2,
            mt: 2,
            mb: 1
          }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  height: 4,
                  borderRadius: 2
                },
                '& .MuiTab-root': {
                  fontWeight: 700,
                  fontSize: '1rem',
                  textTransform: 'none',
                  minHeight: 56,
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    color: theme.palette.primary.main
                  },
                  '&.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 800
                  }
                }
              }}
            >
              <Tab label="✨ For You" {...a11yProps(0)} />
              <Tab label="👥 Following" {...a11yProps(1)} />
              <Tab label="🕒 Recent" {...a11yProps(2)} />
              <Tab label="🔖 Bookmarks" {...a11yProps(3)} />
            </Tabs>
          </Box>
          
          {/* Feed content - Enhanced TikTok-style vertical scroll */}
          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 1, md: 2 },
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: alpha(theme.palette.divider, 0.1),
              borderRadius: 3
            },
            '&::-webkit-scrollbar-thumb': {
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              borderRadius: 3,
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.8)
              }
            }
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  {posts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onBookmark={handleBookmarkPost}
                      onLike={likePost}
                      onShare={sharePost}
                    />
                  ))}
                </VideoFeedProvider>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Right sidebar - Enhanced marketplace and trending features */}
        <Box sx={{
          width: { md: 320 },
          display: { xs: 'none', md: 'block' },
          borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          overflowY: 'auto',
          p: 2,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)',
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.primary.main, 0.3),
            borderRadius: 2
          }
        }}>
          <TrendingProducts />
          <Box sx={{ mt: 3 }}>
            {/* Quick Actions - Enhanced design */}
            <Card variant="outlined" sx={{
              borderRadius: 4,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
              backdropFilter: 'blur(10px)'
            }}>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 2,
                    bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      ⚡
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '1.1rem'
                  }}>
                    Quick Actions
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setCreatePostOpen(true)}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.95rem',
                      py: 1.2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      '&:hover': {
                        bgcolor: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Create Post
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Users size={18} />}
                    onClick={() => handleNavigation('/people')}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Find Friends
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Hash size={18} />}
                    onClick={() => handleNavigation('/explore')}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                      color: theme.palette.secondary.main,
                      '&:hover': {
                        borderColor: theme.palette.secondary.main,
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Explore Topics
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Bookmark size={18} />}
                    onClick={() => setActiveTab(3)} // Switch to bookmarks tab
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      color: theme.palette.warning.main,
                      '&:hover': {
                        borderColor: theme.palette.warning.main,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Saved Posts
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Navigation sidebar - Enhanced design */}
            <Card variant="outlined" sx={{
              borderRadius: 4,
              boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.1)}`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
              backdropFilter: 'blur(10px)',
              mt: 3
            }}>
              <CardContent sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 2,
                    bgcolor: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      🧭
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{
                    background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '1.1rem'
                  }}>
                    Navigation
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Bell size={18} />}
                    onClick={() => handleNavigation('/notifications')}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
                      color: theme.palette.info.main,
                      '&:hover': {
                        borderColor: theme.palette.info.main,
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Notifications
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Mail size={18} />}
                    onClick={() => handleNavigation('/messages')}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      color: theme.palette.success.main,
                      '&:hover': {
                        borderColor: theme.palette.success.main,
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Messages
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShoppingCart size={18} />}
                    onClick={() => handleNavigation('/marketplace')}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      color: theme.palette.warning.main,
                      '&:hover': {
                        borderColor: theme.palette.warning.main,
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Marketplace
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<User size={18} />}
                    onClick={handleProfileNavigation}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      py: 1,
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Profile
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Bottom navigation for mobile - Enhanced vibrant TikTok-style */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'space-around',
        alignItems: 'center',
        p: 1.5,
        bgcolor: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        boxShadow: `0 -4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
      }}>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Home size={24} />
        </IconButton>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Compass size={24} />
        </IconButton>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconButton
            onClick={() => setCreatePostOpen(true)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              border: `3px solid ${theme.palette.background.paper}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                transform: 'scale(1.1)',
                boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.6)}`
              },
              '&:active': {
                transform: 'scale(0.95)'
              }
            }}
          >
            <Plus size={28} />
          </IconButton>
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: theme.palette.secondary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.3)}`
            }}
          >
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.7rem' }}>
              +
            </Typography>
          </Box>
        </Box>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.info.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Search size={24} />
        </IconButton>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.success.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
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
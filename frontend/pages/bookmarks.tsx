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
  Tabs,
  Tab,
} from '@mui/material';
import { 
  Bookmark, 
  Grid as GridIcon, 
  List, 
  Filter,
  Sliders,
  Trash2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { VideoFeedProvider } from '@/components/video/VideoFeedManager';
import { Post } from '@/types/social';

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
      id={`bookmarks-tabpanel-${index}`}
      aria-labelledby={`bookmarks-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `bookmarks-tab-${index}`,
    'aria-controls': `bookmarks-tabpanel-${index}`,
  };
}

const BookmarksPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Mock bookmarked posts
  const bookmarkedPosts: Post[] = [
    {
      id: '1',
      type: 'image',
      content: 'Incredible NFT artwork just dropped! This piece is absolutely stunning. #NFT #DigitalArt #Crypto',
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
      isBookmarked: true,
    },
    {
      id: '2',
      type: 'video',
      content: 'The future of decentralized social media is here! Web3 is changing everything. #Web3 #SocialMedia #Blockchain',
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
      isBookmarked: true,
    },
    {
      id: '3',
      type: 'image',
      content: 'Behind the scenes of my latest NFT collection creation process. #Art #Process #NFT',
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBookmarkPost = (postId: string) => {
    console.log('Remove bookmark for post:', postId);
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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bookmark size={24} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={700}>
              Bookmarks
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="small"
              sx={{ 
                bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: viewMode === 'grid' ? 'primary.main' : 'text.secondary'
              }}
              onClick={() => setViewMode('grid')}
            >
              <GridIcon size={20} />
            </IconButton>
            <IconButton 
              size="small"
              sx={{ 
                bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: viewMode === 'list' ? 'primary.main' : 'text.secondary'
              }}
              onClick={() => setViewMode('list')}
            >
              <List size={20} />
            </IconButton>
          </Box>
        </Box>
        
        {/* Stats */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  {bookmarkedPosts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saved Posts
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Collections
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  2
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tags
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        {/* Content Tabs */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
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
              <Tab label="All Bookmarks" {...a11yProps(0)} />
              <Tab label="Collections" {...a11yProps(1)} />
              <Tab label="Tags" {...a11yProps(2)} />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              {viewMode === 'grid' ? (
                <Grid container spacing={3} sx={{ p: 3 }}>
                  {bookmarkedPosts.map((post) => (
                    <Grid item xs={12} sm={6} md={4} key={post.id}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          height: '100%', 
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                          },
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => window.open(`/post/${post.id}`, '_blank')}
                      >
                        {post.media && post.media.length > 0 && (
                          <Box 
                            sx={{ 
                              height: 200, 
                              bgcolor: alpha(theme.palette.grey[300], 0.3),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {post.media[0].resource_type === 'image' ? (
                              <Bookmark size={40} color={theme.palette.text.secondary} />
                            ) : (
                              <Bookmark size={40} color={theme.palette.text.secondary} />
                            )}
                          </Box>
                        )}
                        <CardContent sx={{ p: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mb: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {post.content}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Bookmark size={16} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
                              <Typography variant="caption" fontWeight={600}>
                                Saved
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookmarkPost(post.id);
                              }}
                            >
                              <Trash2 size={16} color={theme.palette.error.main} />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ p: 2 }}>
                  {/* Wrap PostCard components with VideoFeedProvider */}
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
                    {bookmarkedPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        onBookmark={handleBookmarkPost}
                      />
                    ))}
                  </VideoFeedProvider>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {[
                    { name: 'NFT Art', count: 12, color: 'primary' },
                    { name: 'Web3', count: 8, color: 'secondary' },
                    { name: 'Tutorials', count: 5, color: 'info' },
                  ].map((collection, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          height: 150,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: `${collection.color}.main`,
                            bgcolor: alpha(theme.palette[collection.color as 'primary'].main, 0.05)
                          }
                        }}
                        onClick={() => window.open(`/collection/${collection.name.toLowerCase().replace(' ', '-')}`, '_blank')}
                      >
                        <Bookmark size={32} color={theme.palette[collection.color as 'primary'].main} fill={theme.palette[collection.color as 'primary'].main} />
                        <Typography variant="h6" fontWeight={600} sx={{ mt: 1, mb: 0.5 }}>
                          {collection.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {collection.count} items
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { tag: '#NFT', count: 12 },
                    { tag: '#Crypto', count: 8 },
                    { tag: '#Web3', count: 15 },
                    { tag: '#DigitalArt', count: 7 },
                    { tag: '#Blockchain', count: 5 },
                    { tag: '#Metaverse', count: 9 },
                  ].map((tag, index) => (
                    <Chip
                      key={index}
                      label={`${tag.tag} (${tag.count})`}
                      size="medium"
                      onClick={() => window.open(`/hashtag/${tag.tag.substring(1)}`, '_blank')}
                      sx={{ 
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        fontWeight: 500,
                        px: 2,
                        py: 1,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2)
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default BookmarksPage;
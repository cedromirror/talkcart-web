import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import usePosts from '@/hooks/usePosts';

import WhoToFollow from '@/components/social/WhoToFollow';
import { CreatePostDialog } from '@/components/social/CreatePostDialog';
import PostCard from '@/components/social/PostCard';

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
  const { posts, loading, error, fetchPosts, likePost, bookmarkPost, sharePost } = usePosts();
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle post submit
  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Post content:', postContent);
    setPostContent('');
    // In a real app, you would send this to your API
    // After successful post, refresh the feed
    fetchPosts();
  };
  
  // Handle post interactions
  const handleBookmarkPost = (postId: string) => {
    bookmarkPost(postId);
  };
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Left Sidebar */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trending Topics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {['NFT', 'Ethereum', 'Web3', 'DeFi', 'Blockchain'].map((topic, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUp size={16} color={theme.palette.primary.main} style={{ marginRight: 8 }} />
                      <Typography 
                        variant="body2" 
                        color="primary"
                        sx={{ 
                          fontWeight: 500,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => window.location.href = `/hashtag/${topic}`}
                      >
                        #{topic}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {Math.floor(Math.random() * 1000) + 100} posts
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
            
            {/* Who to Follow (Left Sidebar only) */}
            <Box sx={{ mt: 3 }}>
              <WhoToFollow limit={4} />
            </Box>

          </Grid>
          
          {/* Main Content */}
          <Grid item xs={12} md={6}>
            {/* Create Post */}
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setCreatePostOpen(true)}
                  sx={{ 
                    py: 2, 
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    color: 'text.secondary',
                    borderColor: 'divider'
                  }}
                >
                  What's happening?
                </Button>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Box>
                    <IconButton 
                      color="primary" 
                      size="small"
                      onClick={() => setCreatePostOpen(true)}
                    >
                      <Image size={20} />
                    </IconButton>
                    <IconButton 
                      color="primary" 
                      size="small"
                      onClick={() => setCreatePostOpen(true)}
                    >
                      <Video size={20} />
                    </IconButton>
                    <IconButton color="primary" size="small">
                      <Smile size={20} />
                    </IconButton>
                    <IconButton color="primary" size="small">
                      <Hash size={20} />
                    </IconButton>
                  </Box>
                  <Button 
                    variant="contained" 
                    onClick={() => setCreatePostOpen(true)}
                  >
                    Create Post
                  </Button>
                </Box>
              </CardContent>
            </Card>
            
            {/* Feed Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                aria-label="feed tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab 
                  icon={<TrendingUp size={16} />} 
                  label="For You" 
                  {...a11yProps(0)} 
                  sx={{ textTransform: 'none' }}
                />
                <Tab 
                  icon={<Users size={16} />} 
                  label="Following" 
                  {...a11yProps(1)} 
                  sx={{ textTransform: 'none' }}
                />
                <Tab 
                  icon={<Clock size={16} />} 
                  label="Latest" 
                  {...a11yProps(2)} 
                  sx={{ textTransform: 'none' }}
                />
                <Tab 
                  icon={<BookmarkCheck size={16} />} 
                  label="Bookmarked" 
                  {...a11yProps(3)} 
                  sx={{ textTransform: 'none' }}
                />
              </Tabs>
            </Box>
            
            {/* Feed Content */}
            <TabPanel value={activeTab} index={0}>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box sx={{ textAlign: 'center', my: 4 }}>
                  <AlertCircle size={48} color={theme.palette.error.main} style={{ marginBottom: 16 }} />
                  <Typography color="error" variant="h6">
                    {error}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={() => fetchPosts()}
                  >
                    Try Again
                  </Button>
                </Box>
              ) : posts.length === 0 ? (
                <Box sx={{ textAlign: 'center', my: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No posts found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Be the first to post something!
                  </Typography>
                </Box>
              ) : (
                posts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onBookmark={handleBookmarkPost}
                  />
                ))
              )}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Follow some accounts to see their posts here
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  When you follow someone, their posts will appear in your Following feed
                </Typography>
                <Button variant="contained">Discover People</Button>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              {posts
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onBookmark={handleBookmarkPost}
                  />
                ))}
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              {posts.filter(post => post.isBookmarked).length > 0 ? (
                posts.filter(post => post.isBookmarked).map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onBookmark={handleBookmarkPost}
                  />
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    No bookmarked posts yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Bookmark posts to save them for later
                  </Typography>
                  <Button 
                    variant="contained"
                    onClick={() => setActiveTab(0)}
                  >
                    Explore Feed
                  </Button>
                </Box>
              )}
            </TabPanel>
          </Grid>
          
          {/* Right Sidebar */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>


            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Events
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {[
                  { name: 'NFT Showcase', date: '2023-06-20', time: '3:00 PM UTC' },
                  { name: 'DeFi Workshop', date: '2023-06-25', time: '5:00 PM UTC' },
                  { name: 'Web3 Hackathon', date: '2023-07-01', time: '10:00 AM UTC' },
                ].map((event, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">
                      {event.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} • {event.time}
                    </Typography>
                  </Box>
                ))}
                <Button 
                  variant="outlined" 
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  View All Events
                </Button>
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Popular Hashtags
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {['NFT', 'Ethereum', 'Web3', 'DeFi', 'Blockchain', 'Crypto', 'Bitcoin', 'Metaverse', 'DAO', 'Gaming'].map((tag, index) => (
                    <Chip
                      key={index}
                      label={`#${tag}`}
                      clickable
                      onClick={() => window.location.href = `/hashtag/${tag}`}
                      sx={{ 
                        borderRadius: 4,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={() => {
          fetchPosts();
          setCreatePostOpen(false);
        }}
      />
    </Layout>
  );
};

export default SocialPage;
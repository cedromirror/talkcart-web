import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  Search, 
  Compass, 
  TrendingUp, 
  Hash, 
  Users, 
  Video, 
  Image as ImageIcon, 
  ShoppingCart,
  Zap,
  Globe,
  Music,
  BookOpen,
  Award,
  Star
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import usePosts from '@/hooks/usePosts';
import useStreaming from '@/hooks/useStreaming';
import useMarketplace from '@/hooks/useMarketplace';

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
      id={`explore-tabpanel-${index}`}
      aria-labelledby={`explore-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `explore-tab-${index}`,
    'aria-controls': `explore-tabpanel-${index}`,
  };
}

const ExplorePage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { posts, loading: postsLoading, error: postsError, fetchPosts } = usePosts();
  const { liveStreams, popularStreams, loading: streamsLoading, error: streamsError } = useStreaming();
  const { products, loading: productsLoading, error: productsError } = useMarketplace();
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle search (kept for other resources)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For posts, PublicFeed below will receive query via state prop; 
    // here you could also trigger other searches (streams, marketplace, etc.).
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Trending topics
  const trendingTopics = [
    { name: 'NFT', count: 12500 },
    { name: 'Crypto', count: 8700 },
    { name: 'Web3', count: 6300 },
    { name: 'Metaverse', count: 4200 },
    { name: 'DeFi', count: 3800 },
    { name: 'Blockchain', count: 3500 },
    { name: 'DAO', count: 2900 },
    { name: 'Gaming', count: 2700 },
  ];
  
  // Suggested people
  const suggestedPeople = [
    {
      id: 'user1',
      username: 'cryptoexpert',
      displayName: 'Crypto Expert',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: true,
      followers: 12500,
    },
    {
      id: 'user2',
      username: 'nftcreator',
      displayName: 'NFT Creator',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true,
      followers: 8700,
    },
    {
      id: 'user3',
      username: 'web3dev',
      displayName: 'Web3 Developer',
      avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
      isVerified: false,
      followers: 6300,
    },
    {
      id: 'user4',
      username: 'metaverseartist',
      displayName: 'Metaverse Artist',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      isVerified: true,
      followers: 4200,
    },
  ];
  
  // Categories
  const categories = [
    { name: 'NFTs', icon: <ImageIcon size={24} />, color: theme.palette.primary.main },
    { name: 'Crypto', icon: <Zap size={24} />, color: theme.palette.warning.main },
    { name: 'Gaming', icon: <Video size={24} />, color: theme.palette.success.main },
    { name: 'Social', icon: <Globe size={24} />, color: theme.palette.info.main },
    { name: 'Music', icon: <Music size={24} />, color: theme.palette.error.main },
    { name: 'Art', icon: <BookOpen size={24} />, color: theme.palette.secondary.main },
    { name: 'Collectibles', icon: <Award size={24} />, color: '#9c27b0' },
    { name: 'Premium', icon: <Star size={24} />, color: '#ff9800' },
  ];
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Explore
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Discover trending content, creators, and communities in the Web3 space
          </Typography>
          
          {/* Search Bar */}
          <Box 
            component="form" 
            onSubmit={handleSearch}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mt: 3,
              mb: 2,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search for content, people, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
            <Button 
              variant="contained" 
              type="submit"
              sx={{ ml: 2, borderRadius: 2, px: 3 }}
            >
              Search
            </Button>
          </Box>
        </Box>
        
        {/* Categories */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Categories
          </Typography>
          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={6} sm={3} md={1.5} key={category.name}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: alpha(category.color, 0.1),
                        color: category.color,
                        margin: '0 auto 8px',
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {category.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="explore tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab 
              label="All" 
              icon={<Compass size={18} />} 
              iconPosition="start" 
              {...a11yProps(0)} 
            />
            <Tab 
              label="Trending" 
              icon={<TrendingUp size={18} />} 
              iconPosition="start" 
              {...a11yProps(1)} 
            />
            <Tab 
              label="People" 
              icon={<Users size={18} />} 
              iconPosition="start" 
              {...a11yProps(2)} 
            />
            <Tab 
              label="Tags" 
              icon={<Hash size={18} />} 
              iconPosition="start" 
              {...a11yProps(3)} 
            />
            <Tab 
              label="Streams" 
              icon={<Video size={18} />} 
              iconPosition="start" 
              {...a11yProps(4)} 
            />
            <Tab 
              label="Marketplace" 
              icon={<ShoppingCart size={18} />} 
              iconPosition="start" 
              {...a11yProps(5)} 
            />
          </Tabs>
        </Box>
        
        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={4}>
            {/* Featured Content */}
            <Grid item xs={12} md={8}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Featured Content
              </Typography>
              
              {postsLoading ? (
                <Box sx={{ mt: 2 }}>
                  {[1, 2, 3].map((item) => (
                    <Card key={item} sx={{ mb: 3, borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box sx={{ ml: 2 }}>
                            <Skeleton variant="text" width={120} />
                            <Skeleton variant="text" width={80} />
                          </Box>
                        </Box>
                        <Skeleton variant="text" />
                        <Skeleton variant="text" />
                        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 1 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                posts.slice(0, 3).map((post) => (
                  <Card key={post.id} sx={{ mb: 3, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar src={post.author.avatar} />
                        <Box sx={{ ml: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {post.author.name}
                            </Typography>
                            {post.author.isVerified && (
                              <Chip 
                                label="Verified" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            @{post.author.username} • {formatDate(post.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" paragraph>
                        {post.content}
                      </Typography>
                      {post.media && post.media.length > 0 && (
                        <CardMedia
                          component="img"
                          height="300"
                          image={post.media[0]}
                          alt="Post media"
                          sx={{ borderRadius: 2, mb: 2 }}
                        />
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Button variant="outlined" size="small">
                          View Post
                        </Button>
                        <Box>
                          <Chip 
                            label={`${post.likes} Likes`} 
                            size="small" 
                            sx={{ mr: 1 }} 
                          />
                          <Chip 
                            label={`${post.comments} Comments`} 
                            size="small" 
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Live Streams
                </Typography>
                
                <Grid container spacing={3}>
                  {streamsLoading ? (
                    [1, 2, 3].map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item}>
                        <Card sx={{ borderRadius: 2 }}>
                          <Skeleton variant="rectangular" height={160} />
                          <CardContent>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Skeleton variant="circular" width={24} height={24} />
                              <Skeleton variant="text" width={100} sx={{ ml: 1 }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    liveStreams.slice(0, 3).map((stream) => (
                      <Grid item xs={12} sm={6} md={4} key={stream.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[4],
                            }
                          }}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              height="160"
                              image={stream.thumbnail}
                              alt={stream.title}
                            />
                            <Chip 
                              label="LIVE" 
                              color="error" 
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8,
                                fontWeight: 600,
                              }}
                            />
                            <Chip 
                              label={`${stream.viewerCount} watching`} 
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                bottom: 8, 
                                right: 8,
                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                color: 'white',
                              }}
                            />
                          </Box>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} noWrap>
                              {stream.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Avatar 
                                src={stream.creator.avatar} 
                                sx={{ width: 24, height: 24 }}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                {stream.creator.displayName}
                              </Typography>
                              {stream.creator.isVerified && (
                                <Chip 
                                  label="Verified" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ ml: 1, height: 16, fontSize: '0.625rem' }}
                                />
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </Box>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Marketplace Highlights
                </Typography>
                
                <Grid container spacing={3}>
                  {productsLoading ? (
                    [1, 2, 3].map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item}>
                        <Card sx={{ borderRadius: 2 }}>
                          <Skeleton variant="rectangular" height={160} />
                          <CardContent>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    products.slice(0, 3).map((product) => (
                      <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[4],
                            }
                          }}
                        >
                          <CardMedia
                            component="img"
                            height="160"
                            image={product.images[0]}
                            alt={product.name}
                          />
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle1" fontWeight={600} noWrap>
                                {product.name}
                              </Typography>
                              {product.isNFT && (
                                <Chip 
                                  label="NFT" 
                                  size="small" 
                                  color="primary" 
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              by {product.vendor.displayName}
                            </Typography>
                            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                              {product.currency === 'ETH' 
                                ? `${product.price} ETH` 
                                : `$${product.price.toFixed(2)}`}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </Box>
            </Grid>
            
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 80 }}>
                {/* Trending Topics */}
                <Card sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Trending Topics
                    </Typography>
                    <List>
                      {trendingTopics.map((topic, index) => (
                        <Box 
                          key={topic.name}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            py: 1,
                            borderBottom: index < trendingTopics.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ mr: 2, fontWeight: 600 }}
                            >
                              #{index + 1}
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              #{topic.name}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {topic.count.toLocaleString()} posts
                          </Typography>
                        </Box>
                      ))}
                    </List>
                  </CardContent>
                </Card>
                
                {/* Suggested People */}
                <Card sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Suggested People
                    </Typography>
                    {suggestedPeople.map((person, index) => (
                      <Box 
                        key={person.id}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: index < suggestedPeople.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={person.avatar} />
                          <Box sx={{ ml: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight={600}>
                                {person.displayName}
                              </Typography>
                              {person.isVerified && (
                                <Chip 
                                  label="Verified" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              @{person.username}
                            </Typography>
                          </Box>
                        </Box>
                        <Button 
                          variant="outlined" 
                          size="small"
                          sx={{ borderRadius: 2 }}
                        >
                          Follow
                        </Button>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Trending Content
          </Typography>
          
          {/* Trending content implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            People to Follow
          </Typography>
          
          {/* People search implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Popular Tags
          </Typography>
          
          {/* Tags implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Live Streams
          </Typography>
          
          {/* Streams implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Marketplace
          </Typography>
          
          {/* Marketplace implementation */}
        </TabPanel>
      </Container>
    </Layout>
  );
};

// Helper component for the trending topics list
const List: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {children}
    </Box>
  );
};

export default ExplorePage;
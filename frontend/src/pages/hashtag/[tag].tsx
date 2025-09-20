import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import { Hash as HashtagIcon } from 'lucide-react';
import Layout from '@/components/layout/Layout';

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
      id={`hashtag-tabpanel-${index}`}
      aria-labelledby={`hashtag-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `hashtag-tab-${index}`,
    'aria-controls': `hashtag-tabpanel-${index}`,
  };
}

const HashtagPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { tag } = router.query;
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Fetch hashtag data
  useEffect(() => {
    if (tag) {
      setLoading(true);
      
      // Mock data - in a real app, you would fetch from API
      setTimeout(() => {
        setPosts([
          {
            id: '1',
            content: 'This is a post about #' + tag + ' with some interesting content',
            author: {
              id: 'user1',
              username: 'johndoe',
              displayName: 'John Doe',
              avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
            },
            createdAt: new Date().toISOString(),
            likeCount: 24,
            commentCount: 5
          },
          {
            id: '2',
            content: 'Another post discussing #' + tag + ' from a different perspective',
            author: {
              id: 'user2',
              username: 'janedoe',
              displayName: 'Jane Doe',
              avatar: 'https://randomuser.me/api/portraits/women/1.jpg'
            },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            likeCount: 15,
            commentCount: 2
          },
          {
            id: '3',
            content: `Check out this amazing #${tag} project I've been working on!`,
            author: {
              id: 'user3',
              username: 'alexsmith',
              displayName: 'Alex Smith',
              avatar: 'https://randomuser.me/api/portraits/men/2.jpg'
            },
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            likeCount: 42,
            commentCount: 8
          }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [tag]);
  
  if (!tag) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6">Hashtag not found</Typography>
          </Box>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            sx={{
              bgcolor: theme.palette.primary.main,
              width: 64,
              height: 64,
              mr: 2
            }}
          >
            <HashtagIcon size={32} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={600}>
              #{tag}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {posts.length} posts
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="hashtag tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Top" {...a11yProps(0)} />
            <Tab label="Latest" {...a11yProps(1)} />
            <Tab label="People" {...a11yProps(2)} />
            <Tab label="Media" {...a11yProps(3)} />
          </Tabs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TabPanel value={activeTab} index={0}>
              {posts.map(post => (
                <Card key={post.id} sx={{ mb: 3, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar src={post.author.avatar} sx={{ mr: 1.5 }} />
                      <Box>
                        <Typography variant="subtitle1">
                          {post.author.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{post.author.username}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" paragraph>
                      {post.content}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(post.createdAt).toLocaleString()}
                      </Typography>
                      <Box>
                        <Chip 
                          label={`${post.likeCount} likes`} 
                          size="small" 
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          label={`${post.commentCount} comments`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              {posts
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(post => (
                  <Card key={post.id} sx={{ mb: 3, borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar src={post.author.avatar} sx={{ mr: 1.5 }} />
                        <Box>
                          <Typography variant="subtitle1">
                            {post.author.displayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            @{post.author.username}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" paragraph>
                        {post.content}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(post.createdAt).toLocaleString()}
                        </Typography>
                        <Box>
                          <Chip 
                            label={`${post.likeCount} likes`} 
                            size="small" 
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={`${post.commentCount} comments`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                  People who frequently post about #{tag} will appear here
                </Typography>
              </Paper>
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                  Media posts with #{tag} will appear here
                </Typography>
              </Paper>
            </TabPanel>
          </>
        )}
      </Container>
    </Layout>
  );
};

export default HashtagPage;
import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import { Search as SearchIcon, X as CloseIcon, User, Hash as HashtagIcon, FileText, Video } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useSearch } from '@/hooks/useSearch';
import { SearchResult } from '@/services/searchApi';

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
      id={`search-tabpanel-${index}`}
      aria-labelledby={`search-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `search-tab-${index}`,
    'aria-controls': `search-tabpanel-${index}`,
  };
}

const SearchPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { q: queryParam } = router.query;
  const [activeTab, setActiveTab] = useState(0);
  
  // Initialize search with the query parameter
  const {
    query,
    setQuery,
    results,
    loading,
    searching,
    search,
    total
  } = useSearch({
    initialQuery: typeof queryParam === 'string' ? queryParam : '',
    autoSearch: false
  });
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Filter results based on the selected tab
    const types = ['all', 'user', 'post', 'hashtag', 'video'];
    const selectedType = types[newValue];
    
    if (selectedType === 'all') {
      search({ query });
    } else {
      search({ query, types: [selectedType as any] });
    }
  };
  
  // Perform search when query parameter changes
  useEffect(() => {
    if (typeof queryParam === 'string' && queryParam) {
      setQuery(queryParam);
      search({ query: queryParam });
    }
  }, [queryParam]);
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      search({ query });
    }
  };
  
  // Get filtered results based on active tab
  const getFilteredResults = () => {
    if (activeTab === 0) return results;
    
    const types = ['all', 'user', 'post', 'hashtag', 'video'];
    const selectedType = types[activeTab];
    
    return results.filter(result => 
      selectedType === 'all' || result.type === selectedType
    );
  };
  
  // Render result item based on type
  const renderResultItem = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        return (
          <ListItem 
            button 
            onClick={() => router.push(result.url)}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
            }}
          >
            <ListItemAvatar>
              <Avatar src={result.imageUrl} alt={result.title}>
                {result.title.charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText 
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {result.title}
                  {result.metadata?.isVerified && (
                    <Chip 
                      label="Verified" 
                      size="small" 
                      color="primary" 
                      sx={{ ml: 1, height: 20 }} 
                    />
                  )}
                </Box>
              }
              secondary={result.subtitle}
            />
          </ListItem>
        );
        
      case 'post':
        return (
          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FileText size={16} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Post
                </Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                {result.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {result.subtitle}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={`View Post`} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  onClick={() => router.push(result.url)}
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        );
        
      case 'hashtag':
        return (
          <ListItem 
            button 
            onClick={() => router.push(result.url)}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                <HashtagIcon size={20} />
              </Avatar>
            </ListItemAvatar>
            <ListItemText 
              primary={result.title}
              secondary={`${result.metadata?.postCount || 0} posts`}
            />
          </ListItem>
        );
        
      case 'video':
        return (
          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <Box 
              sx={{ 
                height: 140, 
                backgroundImage: `url(${result.imageUrl || '/images/video-placeholder.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                cursor: 'pointer'
              }}
              onClick={() => router.push(result.url)}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8, 
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 1,
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}
              >
                {result.metadata?.duration || '00:00'}
              </Box>
            </Box>
            <CardContent>
              <Typography variant="body1" gutterBottom>
                {result.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {result.subtitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                {result.metadata?.viewCount || 0} views
              </Typography>
            </CardContent>
          </Card>
        );
        
      default:
        return (
          <ListItem 
            button 
            onClick={() => router.push(result.url)}
            sx={{ 
              borderRadius: 1,
              mb: 1,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
            }}
          >
            <ListItemText 
              primary={result.title}
              secondary={result.subtitle}
            />
          </ListItem>
        );
    }
  };
  
  const filteredResults = getFilteredResults();
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search TalkCart..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={20} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton 
                    edge="end" 
                    onClick={() => setQuery('')}
                    size="small"
                  >
                    <CloseIcon size={16} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </Box>
        
        {searching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : results.length > 0 ? (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                aria-label="search tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="All" {...a11yProps(0)} />
                <Tab label="People" {...a11yProps(1)} />
                <Tab label="Posts" {...a11yProps(2)} />
                <Tab label="Hashtags" {...a11yProps(3)} />
                <Tab label="Videos" {...a11yProps(4)} />
              </Tabs>
            </Box>
            
            <TabPanel value={activeTab} index={0}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {total} results for "{queryParam}"
              </Typography>
              
              <Grid container spacing={3}>
                {filteredResults.map((result) => (
                  <Grid item xs={12} md={result.type === 'video' ? 4 : 12} key={`${result.type}-${result.id}`}>
                    {renderResultItem(result)}
                  </Grid>
                ))}
              </Grid>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {filteredResults.length} people for "{queryParam}"
              </Typography>
              
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <List>
                  {filteredResults.map((result) => (
                    <React.Fragment key={`user-${result.id}`}>
                      {renderResultItem(result)}
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {filteredResults.length} posts for "{queryParam}"
              </Typography>
              
              {filteredResults.map((result) => (
                <Box key={`post-${result.id}`}>
                  {renderResultItem(result)}
                </Box>
              ))}
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {filteredResults.length} hashtags for "{queryParam}"
              </Typography>
              
              <Paper variant="outlined" sx={{ borderRadius: 2 }}>
                <List>
                  {filteredResults.map((result) => (
                    <React.Fragment key={`hashtag-${result.id}`}>
                      {renderResultItem(result)}
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </TabPanel>
            
            <TabPanel value={activeTab} index={4}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found {filteredResults.length} videos for "{queryParam}"
              </Typography>
              
              <Grid container spacing={3}>
                {filteredResults.map((result) => (
                  <Grid item xs={12} sm={6} md={4} key={`video-${result.id}`}>
                    {renderResultItem(result)}
                  </Grid>
                ))}
              </Grid>
            </TabPanel>
          </>
        ) : query ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No results found for "{query}"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try different keywords or check your spelling
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              Search for content across TalkCart
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Find people, posts, hashtags, videos and more
            </Typography>
          </Box>
        )}
      </Container>
    </Layout>
  );
};

export default SearchPage;
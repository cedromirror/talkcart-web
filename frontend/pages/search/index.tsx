import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Card,
  CardContent,
  Avatar,
  Button,
  Divider,
  Chip,
  Grid,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { Search, User, ShoppingBag, Hash, FileText, Wallet } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Define search result types
interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'product' | 'hashtag' | 'article' | 'nft';
  title: string;
  description?: string;
  image?: string;
  url?: string;
  metadata?: Record<string, any>;
}

const SearchPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated, user } = useAuth();
  
  // Get query from URL
  const { q } = router.query;
  const [searchQuery, setSearchQuery] = useState<string>((q as string) || '');
  
  // Search state
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  // Filter types
  const filterTypes = ['all', 'users', 'posts', 'products', 'hashtags', 'articles', 'nfts'];
  
  // Handle search submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    // Update URL without reloading the page
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`, undefined, { shallow: true });
    
    setIsSearching(true);
    
    try {
      // Call search API
      const response = await api.search.query({
        query: searchQuery,
        type: filterTypes[activeTab] !== 'all' ? filterTypes[activeTab] : undefined
      });
      
      if (response?.data?.results) {
        setResults(response.data.results);
      } else {
        // Mock data for development
        console.log('Using mock search results');
        const mockResults: SearchResult[] = [
          {
            id: 'user1',
            type: 'user',
            title: 'Alex Johnson',
            description: '@alexj • Blockchain developer & NFT enthusiast',
            image: 'https://randomuser.me/api/portraits/men/32.jpg'
          },
          {
            id: 'user2',
            type: 'user',
            title: 'Sophia Chen',
            description: '@sophiac • Digital artist & crypto investor',
            image: 'https://randomuser.me/api/portraits/women/44.jpg'
          },
          {
            id: 'post1',
            type: 'post',
            title: 'Just launched my new NFT collection! #NFT #Web3',
            description: 'Posted by @alexj • 2 hours ago',
            image: 'https://picsum.photos/seed/nft1/200/200'
          },
          {
            id: 'product1',
            type: 'product',
            title: 'Crypto Art Print - Limited Edition',
            description: '$120.00 • 5 available',
            image: 'https://picsum.photos/seed/product1/200/200'
          },
          {
            id: 'hashtag1',
            type: 'hashtag',
            title: '#NFT',
            description: '1,243 posts • Trending'
          },
          {
            id: 'article1',
            type: 'article',
            title: 'The Future of Web3 and NFTs',
            description: 'Published 3 days ago • 5 min read',
            image: 'https://picsum.photos/seed/article1/200/200'
          },
          {
            id: 'nft1',
            type: 'nft',
            title: 'Cosmic Voyager #42',
            description: '0.5 ETH • Created by @sophiac',
            image: 'https://picsum.photos/seed/nft2/200/200'
          }
        ];
        
        setResults(mockResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Set empty results
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Filter results when tab changes
  useEffect(() => {
    if (activeTab === 0) {
      // "All" tab - show all results
      setFilteredResults(results);
    } else {
      // Filter by type
      const type = filterTypes[activeTab];
      setFilteredResults(results.filter(result => result.type === type.slice(0, -1))); // Remove 's' from type
    }
  }, [activeTab, results]);
  
  // Initial search when query is in URL
  useEffect(() => {
    if (q) {
      setSearchQuery(q as string);
      handleSearch();
    }
  }, [q]);
  
  // Render icon based on result type
  const renderIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User size={20} />;
      case 'post':
        return <FileText size={20} />;
      case 'product':
        return <ShoppingBag size={20} />;
      case 'hashtag':
        return <Hash size={20} />;
      case 'article':
        return <FileText size={20} />;
      case 'nft':
        return <Wallet size={20} />;
      default:
        return <Search size={20} />;
    }
  };

  return (
    <AppLayout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Search
        </Typography>
        
        {/* Search Form */}
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search for users, posts, products, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null
            }}
            sx={{ 
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </Box>
        
        {/* Filter Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" />
            <Tab label="Users" />
            <Tab label="Posts" />
            <Tab label="Products" />
            <Tab label="Hashtags" />
            <Tab label="Articles" />
            <Tab label="NFTs" />
          </Tabs>
        </Box>
        
        {/* Search Results */}
        {isSearching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredResults.length > 0 ? (
          <Grid container spacing={2}>
            {filteredResults.map((result) => (
              <Grid item xs={12} key={result.id}>
                <Card 
                  sx={{ 
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: theme.shadows[4]
                    }
                  }}
                  onClick={() => {
                    // Navigate based on result type
                    switch (result.type) {
                      case 'user':
                        router.push(`/profile/${result.id}`);
                        break;
                      case 'post':
                        router.push(`/social/post/${result.id}`);
                        break;
                      case 'product':
                        router.push(`/marketplace/product/${result.id}`);
                        break;
                      case 'hashtag':
                        router.push(`/social/hashtag/${result.title.replace('#', '')}`);
                        break;
                      case 'article':
                        router.push(`/blog/article/${result.id}`);
                        break;
                      case 'nft':
                        router.push(`/marketplace/nft/${result.id}`);
                        break;
                    }
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                    {result.image ? (
                      <Avatar 
                        src={result.image} 
                        alt={result.title}
                        variant={result.type === 'user' ? 'circular' : 'rounded'}
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          mr: 2,
                          borderRadius: result.type === 'user' ? undefined : 1
                        }}
                      />
                    ) : (
                      <Avatar 
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          mr: 2, 
                          bgcolor: theme.palette.primary.main
                        }}
                      >
                        {renderIcon(result.type)}
                      </Avatar>
                    )}
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {result.title}
                        </Typography>
                        <Chip 
                          label={result.type.charAt(0).toUpperCase() + result.type.slice(1)} 
                          size="small" 
                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                      {result.description && (
                        <Typography variant="body2" color="text.secondary">
                          {result.description}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : searchQuery ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No results found for "{searchQuery}"
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try different keywords or check your spelling
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Enter a search term to find users, posts, products, and more
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try searching for usernames, hashtags, or keywords
            </Typography>
          </Box>
        )}
      </Box>
    </AppLayout>
  );
};

export default SearchPage;
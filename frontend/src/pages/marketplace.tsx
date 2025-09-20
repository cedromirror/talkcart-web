import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Skeleton,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { Search, Filter, ShoppingCart, Tag, Wallet, AlertCircle } from 'lucide-react';
import BuyModal from '@/components/marketplace/BuyModal';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import useMarketplace from '@/hooks/useMarketplace';

// Product type definition
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  isNFT: boolean;
  createdAt: string;
}

const MarketplacePage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    products, 
    categories, 
    pagination, 
    loading, 
    error, 
    fetchProducts, 
    fetchCategories 
  } = useMarketplace();

  // Buy Now modal state
  const [buyOpen, setBuyOpen] = useState(false);
  const [buyProduct, setBuyProduct] = useState<any | null>(null);
  
  // Initialize state from query
  const initialQuery = (key: string, fallback = '') => (typeof router.query[key] === 'string' ? (router.query[key] as string) : fallback);
  const initialBool = (key: string) => (router.query[key] === 'true');

  // Filter states
  const [searchQuery, setSearchQuery] = useState(initialQuery('search', ''));
  const [selectedCategory, setSelectedCategory] = useState(initialQuery('category', 'all') || 'all');
  const [minPrice, setMinPrice] = useState(initialQuery('minPrice', ''));
  const [maxPrice, setMaxPrice] = useState(initialQuery('maxPrice', ''));
  const [isNFTOnly, setIsNFTOnly] = useState(initialBool('isNFT'));
  const [featuredOnly, setFeaturedOnly] = useState(initialBool('featured'));
  const [sortBy, setSortBy] = useState<'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured'>(
    (initialQuery('sortBy', 'newest') as any) || 'newest'
  );
  
  // Pagination
  const [page, setPage] = useState(Number(initialQuery('page', '1')) || 1);
  
  const syncQuery = (nextPage: number) => {
    const q: any = {
      page: nextPage,
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      isNFT: isNFTOnly || undefined,
      featured: featuredOnly || undefined,
      sortBy,
    };
    Object.keys(q).forEach(k => (q[k] === undefined ? delete q[k] : null));
    router.replace({ pathname: '/marketplace', query: q }, undefined, { shallow: true });
  };

  const triggerFetch = (overridePage?: number) => {
    const nextPage = overridePage ?? page;
    syncQuery(nextPage);
    fetchProducts({
      page: nextPage,
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      isNFT: isNFTOnly || undefined,
      featured: featuredOnly || undefined,
      sortBy,
    });
  };

  // Initial fetch on mount and when router is ready
  useEffect(() => {
    if (!router.isReady) return;
    triggerFetch(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    triggerFetch(1);
  };
  
  // Handle filter changes
  const handleCategoryChange = (e: any) => {
    setSelectedCategory(e.target.value);
    setPage(1);
    setTimeout(() => triggerFetch(1));
  };
  
  // Handle pagination
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    triggerFetch(value);
  };
  
  // Format price
  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    } else if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price} ${currency}`;
  };
  

  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Marketplace
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover unique digital and physical items from our community
          </Typography>
        </Box>
        
        {/* Search and Filters */}
        <Card variant="outlined" sx={{ mb: 4, p: 2, borderRadius: 2 }}>
          <Box component="form" onSubmit={handleSearch}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="category-select-label">Category</InputLabel>
                  <Select
                    labelId="category-select-label"
                    value={selectedCategory}
                    label="Category"
                    onChange={handleCategoryChange}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Min Price"
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Max Price"
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel id="sort-by-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-by-label"
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => {
                      setSortBy(e.target.value as any);
                      setPage(1);
                      setTimeout(() => triggerFetch(1));
                    }}
                  >
                    <MenuItem value="newest">Newest</MenuItem>
                    <MenuItem value="priceAsc">Price: Low to High</MenuItem>
                    <MenuItem value="priceDesc">Price: High to Low</MenuItem>
                    <MenuItem value="sales">Top Sales</MenuItem>
                    <MenuItem value="views">Most Viewed</MenuItem>
                    <MenuItem value="featured">Featured</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControlLabel
                  control={<Switch checked={isNFTOnly} onChange={(e) => { setIsNFTOnly(e.target.checked); setPage(1); setTimeout(() => triggerFetch(1)); }} />}
                  label="NFT only"
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <FormControlLabel
                  control={<Switch checked={featuredOnly} onChange={(e) => { setFeaturedOnly(e.target.checked); setPage(1); setTimeout(() => triggerFetch(1)); }} />}
                  label="Featured"
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  sx={{ height: '100%' }}
                >
                  <Filter size={20} />
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Card>
        
        {/* Products Grid */}
        {error && (
          <Box sx={{ textAlign: 'center', my: 4 }}>
            <AlertCircle size={48} color={theme.palette.error.main} style={{ marginBottom: 16 }} />
            <Typography color="error" variant="h6">{error}</Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => fetchProducts()}
            >
              Try Again
            </Button>
          </Box>
        )}
        
        <Grid container spacing={3}>
          {loading ? (
            // Loading skeletons
            Array.from(new Array(8)).map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton variant="text" height={28} width="80%" />
                    <Skeleton variant="text" height={20} width="60%" />
                    <Skeleton variant="text" height={24} width="40%" sx={{ mt: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Skeleton variant="rectangular" height={36} width="48%" />
                      <Skeleton variant="rectangular" height={36} width="48%" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : products.length === 0 ? (
            <Box sx={{ textAlign: 'center', width: '100%', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No products found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Try adjusting your search or filters
              </Typography>
            </Box>
          ) : (
            products.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4],
                  }
                }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.images[0] || 'https://via.placeholder.com/300x300?text=No+Image'}
                    alt={product.name}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h2" noWrap>
                        {product.name}
                      </Typography>
                      {product.isNFT && (
                        <Chip 
                          label="NFT" 
                          size="small" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        by {product.vendor.displayName}
                      </Typography>
                      {product.vendor.isVerified && (
                        <Chip 
                          label="Verified" 
                          size="small" 
                          variant="outlined"
                          color="primary"
                          sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                        />
                      )}
                    </Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {product.description}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                      {formatPrice(product.price, product.currency)}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button 
                        component={Link}
                        href={`/marketplace/${product.id}`}
                        variant="outlined" 
                        startIcon={<Tag size={16} />}
                        sx={{ flexGrow: 1, mr: 1 }}
                      >
                        Details
                      </Button>
                      <Button 
                        variant="contained" 
                        startIcon={product.isNFT ? <Wallet size={16} /> : <ShoppingCart size={16} />}
                        sx={{ flexGrow: 1 }}
                        onClick={() => { setBuyProduct(product); setBuyOpen(true); }}
                      >
                        {product.isNFT ? 'Buy NFT' : 'Buy Now'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
        
        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination 
              count={pagination.pages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
              size="large"
            />
          </Box>
        )}
      </Container>

      {/* Buy Now modal */}
      <BuyModal open={buyOpen} onClose={() => setBuyOpen(false)} product={buyProduct} />
    </Layout>
  );
};

export default MarketplacePage;
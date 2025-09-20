import React, { useEffect, useState, useCallback } from 'react';
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
  Paper,
  Stack,
  Badge,
  Rating,
  Divider,
  Alert,
  Fab,
  Tooltip,
} from '@mui/material';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Tag, 
  Wallet, 
  AlertCircle, 
  TrendingUp,
  Eye,
  Star,
  BadgeCheck,
  Plus,
  SortAsc,
  SortDesc,
  Grid3x3,
  List,
  RefreshCcw,
  FilterX
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import useMarketplace from '@/hooks/useMarketplace';
import toast from 'react-hot-toast';

// Enhanced Product type definition matching backend
interface Product {
  id: string;
  _id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
  };
  isNFT: boolean;
  featured: boolean;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: string;
  createdAt: string;
  updatedAt: string;
}

// Categories are fetched from API via useMarketplace; remove hardcoded fallback

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: <TrendingUp size={16} /> },
  { value: 'priceAsc', label: 'Price: Low to High', icon: <SortAsc size={16} /> },
  { value: 'priceDesc', label: 'Price: High to Low', icon: <SortDesc size={16} /> },
  { value: 'sales', label: 'Best Selling', icon: <TrendingUp size={16} /> },
  { value: 'views', label: 'Most Viewed', icon: <Eye size={16} /> },
  { value: 'featured', label: 'Featured Items', icon: <Star size={16} /> },
];

const MarketplacePage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    joinMarketplace, 
    leaveMarketplace, 
    onProductUpdate, 
    onProductSale, 
    onNewProduct 
  } = useWebSocket();
  const { 
    products, 
    categories, 
    pagination, 
    loading, 
    error, 
    fetchProducts, 
    fetchCategories 
  } = useMarketplace();
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Enhanced filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    isNFT: false,
    featured: false,
    sortBy: 'newest' as 'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured',
    page: 1,
  });

  // Initialize from URL params
  useEffect(() => {
    if (!router.isReady) return;
    
    const query = router.query;
    setFilters(prev => ({
      ...prev,
      search: (query.search as string) || '',
      category: (query.category as string) || 'all',
      minPrice: (query.minPrice as string) || '',
      maxPrice: (query.maxPrice as string) || '',
      isNFT: query.isNFT === 'true',
      featured: query.featured === 'true',
      sortBy: (query.sortBy as any) || 'newest',
      page: parseInt((query.page as string) || '1'),
    }));
  }, [router.isReady, router.query]);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: typeof filters) => {
    const query: any = { ...newFilters };
    
    // Remove default/empty values
    if (query.search === '') delete query.search;
    if (query.category === 'all') delete query.category;
    if (query.minPrice === '') delete query.minPrice;
    if (query.maxPrice === '') delete query.maxPrice;
    if (!query.isNFT) delete query.isNFT;
    if (!query.featured) delete query.featured;
    if (query.sortBy === 'newest') delete query.sortBy;
    if (query.page === 1) delete query.page;

    router.push({ pathname: '/marketplace', query }, undefined, { shallow: true });
  }, [router]);

  // Fetch products when filters change
  const handleFiltersChange = useCallback((newFilters: Partial<typeof filters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
    
    fetchProducts({
      page: updatedFilters.page,
      search: updatedFilters.search || undefined,
      category: updatedFilters.category !== 'all' ? updatedFilters.category : undefined,
      minPrice: updatedFilters.minPrice || undefined,
      maxPrice: updatedFilters.maxPrice || undefined,
      isNFT: updatedFilters.isNFT || undefined,
      featured: updatedFilters.featured || undefined,
      sortBy: updatedFilters.sortBy,
    });
  }, [filters, fetchProducts, updateURL]);

  // Join marketplace for real-time updates
  useEffect(() => {
    joinMarketplace();
    
    return () => {
      leaveMarketplace();
    };
  }, [joinMarketplace, leaveMarketplace]);

  // Real-time product updates
  useEffect(() => {
    const unsubscribeUpdate = onProductUpdate((data: any) => {
      console.log('Product updated:', data);
      // Optionally refresh the product list or update specific product
      // For now, just refresh to get latest data
      handleFiltersChange({});
    });

    const unsubscribeSale = onProductSale((data: any) => {
      console.log('Product sold:', data);
      toast.success(`🎉 ${data.productName} was just sold!`);
      // Refresh to show updated sales count
      handleFiltersChange({});
    });

    const unsubscribeNew = onNewProduct((data: any) => {
      console.log('New product added:', data);
      toast.success(`🆕 New ${data.product.category} item: ${data.product.name}`);
      // Refresh to show new product
      handleFiltersChange({});
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeSale();
      unsubscribeNew();
    };
  }, [onProductUpdate, onProductSale, onNewProduct, handleFiltersChange]);

  // Initial load
  useEffect(() => {
    if (!router.isReady) return;
    
    fetchProducts({
      page: filters.page,
      search: filters.search || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      isNFT: filters.isNFT || undefined,
      featured: filters.featured || undefined,
      sortBy: filters.sortBy,
    });
    
    fetchCategories();
  }, [router.isReady]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFiltersChange({});
  };
  
  // Handle pagination
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    const newFilters = { ...filters, page: value };
    setFilters(newFilters);
    updateURL(newFilters);
    
    fetchProducts({
      page: value,
      search: filters.search || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      isNFT: filters.isNFT || undefined,
      featured: filters.featured || undefined,
      sortBy: filters.sortBy,
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters = {
      search: '',
      category: 'all',
      minPrice: '',
      maxPrice: '',
      isNFT: false,
      featured: false,
      sortBy: 'newest' as const,
      page: 1,
    };
    setFilters(defaultFilters);
    updateURL(defaultFilters);
    fetchProducts({ sortBy: 'newest' });
  };
  
  // Format price with proper currency symbols
  const formatPrice = (price: number, currency: string) => {
    const formatMap: { [key: string]: string } = {
      'USD': `$${price.toFixed(2)}`,
      'ETH': `${price} ETH`,
      'BTC': `${price} BTC`,
      'USDC': `${price} USDC`,
      'USDT': `${price} USDT`,
    };
    return formatMap[currency] || `${price} ${currency}`;
  };

  // Get proper image URL
  const getImageUrl = (images: Product['images']) => {
    if (!images || images.length === 0) {
      return 'https://via.placeholder.com/400x400?text=No+Image';
    }
    
    const firstImage = images[0];
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.secure_url || firstImage.url || 'https://via.placeholder.com/400x400?text=No+Image';
  };

  // Check if filters are applied
  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.minPrice || 
                          filters.maxPrice || filters.isNFT || filters.featured || filters.sortBy !== 'newest';
  
  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
            <Grid item xs={12} md={8}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                🛍️ Marketplace
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Discover unique digital and physical items from our verified community
              </Typography>
              
              {/* Stats Bar */}
              <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={16} color={theme.palette.primary.main} />
                  <Typography variant="body2" color="text.secondary">
                    {pagination.total} Products
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Star size={16} color={theme.palette.warning.main} />
                  <Typography variant="body2" color="text.secondary">
                    Featured Items Available
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeCheck size={16} color={theme.palette.success.main} />
                  <Typography variant="body2" color="text.secondary">
                    Verified Sellers
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              {/* Selling disabled: hide create button for all users */}
              {false && user && (
                <Button
                  component={Link}
                  href="/marketplace/create"
                  variant="contained"
                  size="large"
                  startIcon={<Plus size={20} />}
                  sx={{ 
                    mb: 2,
                    borderRadius: 2,
                    px: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    }
                  }}
                >
                  Sell Your Item
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
        
        {/* Enhanced Search and Filters */}
        <Paper elevation={2} sx={{ mb: 4, p: 3, borderRadius: 3 }}>
          {/* Main Search Row */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search products, creators, or NFTs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={20} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleFiltersChange({ category: e.target.value })}
                  >
                    <MenuItem value="all">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Grid3x3 size={16} />
                        All Categories
                      </Box>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Tag size={16} />
                          {category}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth
                  label="Min Price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              
              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth
                  label="Max Price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  InputProps={{
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={filters.sortBy}
                    label="Sort By"
                    onChange={(e) => handleFiltersChange({ sortBy: e.target.value as any })}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {option.icon}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Filter Toggles and Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch 
                    checked={filters.isNFT} 
                    onChange={(e) => handleFiltersChange({ isNFT: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Wallet size={16} />
                    NFTs Only
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={filters.featured} 
                    onChange={(e) => handleFiltersChange({ featured: e.target.checked })}
                    color="secondary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Star size={16} />
                    Featured
                  </Box>
                }
              />
              
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterX size={16} />}
                  onClick={clearFilters}
                  sx={{ borderRadius: 2 }}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {/* View Mode Toggle */}
              <Box sx={{ display: 'flex', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Button
                  size="small"
                  variant={viewMode === 'grid' ? 'contained' : 'text'}
                  onClick={() => setViewMode('grid')}
                  sx={{ minWidth: 40, borderRadius: '4px 0 0 4px' }}
                >
                  <Grid3x3 size={16} />
                </Button>
                <Button
                  size="small"
                  variant={viewMode === 'list' ? 'contained' : 'text'}
                  onClick={() => setViewMode('list')}
                  sx={{ minWidth: 40, borderRadius: '0 4px 4px 0' }}
                >
                  <List size={16} />
                </Button>
              </Box>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCcw size={16} />}
                onClick={() => handleFiltersChange({})}
                disabled={loading}
              >
                Refresh
              </Button>
            </Stack>
          </Box>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Active filters:
                </Typography>
                {filters.search && <Chip label={`"${filters.search}"`} size="small" variant="outlined" />}
                {filters.category !== 'all' && <Chip label={filters.category} size="small" variant="outlined" />}
                {filters.minPrice && <Chip label={`Min: $${filters.minPrice}`} size="small" variant="outlined" />}
                {filters.maxPrice && <Chip label={`Max: $${filters.maxPrice}`} size="small" variant="outlined" />}
                {filters.isNFT && <Chip label="NFT" size="small" color="primary" />}
                {filters.featured && <Chip label="Featured" size="small" color="secondary" />}
                {filters.sortBy !== 'newest' && <Chip label={SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label} size="small" variant="outlined" />}
              </Stack>
            </Box>
          )}
        </Paper>
        
        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={() => fetchProducts()}>
                Try Again
              </Button>
            }
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <strong>Error loading products:</strong> {error}
          </Alert>
        )}
        
        {/* Products Grid/List */}
        <Box sx={{ mb: 4 }}>
          {loading ? (
            <Grid container spacing={3}>
              {Array.from(new Array(12)).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                  <Card sx={{ height: 400, borderRadius: 2 }}>
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
              ))}
            </Grid>
          ) : products.length === 0 ? (
            <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
              <AlertCircle size={64} color={theme.palette.text.disabled} style={{ marginBottom: 16 }} />
              <Typography variant="h5" gutterBottom color="text.secondary">
                No products found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {hasActiveFilters 
                  ? 'Try adjusting your filters or search terms' 
                  : 'Be the first to list a product on our marketplace!'
                }
              </Typography>
              {hasActiveFilters ? (
                <Button variant="outlined" onClick={clearFilters} startIcon={<FilterX size={16} />}>
                  Clear All Filters
                </Button>
              ) : user && (
                <Button 
                  component={Link} 
                  href="/marketplace/create" 
                  variant="contained" 
                  startIcon={<Plus size={16} />}
                >
                  Create First Product
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} md={viewMode === 'grid' ? 4 : 12} lg={viewMode === 'grid' ? 3 : 12} key={product.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: viewMode === 'list' ? 'row' : 'column',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                      }
                    }}
                  >
                    {/* Featured Badge */}
                    {product.featured && (
                      <Chip
                        label="Featured"
                        size="small"
                        color="secondary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          zIndex: 1,
                          fontWeight: 600,
                        }}
                      />
                    )}

                    {/* NFT Badge */}
                    {product.isNFT && (
                      <Chip
                        label="NFT"
                        size="small"
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          fontWeight: 600,
                        }}
                      />
                    )}

                    <CardMedia
                      component="img"
                      height={viewMode === 'list' ? 150 : 200}
                      sx={{ 
                        width: viewMode === 'list' ? 200 : '100%',
                        objectFit: 'cover',
                      }}
                      image={getImageUrl(product.images)}
                      alt={product.name}
                    />
                    
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      {/* Product Title & Category */}
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="h6" component="h3" noWrap sx={{ fontWeight: 600 }}>
                          {product.name}
                        </Typography>
                        <Chip 
                          label={product.category} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mt: 0.5 }}
                        />
                      </Box>

                      {/* Vendor Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          by {product.vendor.displayName || product.vendor.username}
                        </Typography>
                        {product.vendor.isVerified && (
                          <Tooltip title="Verified Seller">
                            <BadgeCheck size={16} color={theme.palette.success.main} style={{ marginLeft: 4 }} />
                          </Tooltip>
                        )}
                      </Box>

                      {/* Description */}
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
                          minHeight: 40,
                        }}
                      >
                        {product.description}
                      </Typography>

                      {/* Stats Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {(product.rating || 0) > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Rating value={product.rating} size="small" readOnly />
                            <Typography variant="caption" color="text.secondary">
                              ({product.reviewCount})
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Eye size={12} />
                          <Typography variant="caption" color="text.secondary">
                            {product.views || 0}
                          </Typography>
                        </Box>
                        
                        {(product.sales || 0) > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TrendingUp size={12} />
                            <Typography variant="caption" color="text.secondary">
                              {product.sales} sold
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Price */}
                      <Typography variant="h6" color="primary" fontWeight="bold" sx={{ mb: 2 }}>
                        {formatPrice(product.price, product.currency)}
                      </Typography>

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1}>
                        <Button
                          component={Link}
                          href={`/marketplace/${product.id}`}
                          variant="outlined"
                          size="small"
                          sx={{ flex: 1, borderRadius: 1.5 }}
                        >
                          View Details
                        </Button>
                        <Button
                          component={Link}
                          href={`/marketplace/${product.id}`}
                          variant="contained"
                          size="small"
                          startIcon={product.isNFT ? <Wallet size={16} /> : <ShoppingCart size={16} />}
                          sx={{ flex: 1, borderRadius: 1.5 }}
                        >
                          {product.isNFT ? 'Buy NFT' : 'Add to Cart'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total items)
                </Typography>
                <Pagination
                  count={pagination.pages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Stack>
            </Paper>
          </Box>
        )}

        {/* Floating Action Button for Mobile */}
        {user && (
          <Fab
            component={Link}
            href="/marketplace/create"
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' },
              zIndex: 1000,
            }}
          >
            <Plus size={24} />
          </Fab>
        )}
      </Container>
    </Layout>
  );
};

export default MarketplacePage;
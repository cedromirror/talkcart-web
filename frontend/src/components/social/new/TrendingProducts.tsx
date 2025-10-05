import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Skeleton,
  useTheme,
  alpha,
  Chip,
  IconButton,
} from '@mui/material';
import { TrendingUp, RefreshCw, ShoppingCart, Heart, MessageCircle, Star, ExternalLink } from 'lucide-react';
import api from '@/lib/api';

interface Product {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    public_id: string;
    secure_url: string;
    url: string;
    _id: string;
  }>;
  category: string;
  tags: string[];
  stock: number;
  featured: boolean;
  isNFT: boolean;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  createdAt: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress: string;
  };
}

const TrendingProducts: React.FC = () => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getRandomProducts(2); // Fetch 2 products
      
      if (response?.data?.success && response?.data?.data?.products) {
        setProducts(response.data.data.products);
        console.log('Fetched new trending products:', response.data.data.products.map((p: any) => p.name));
      } else if (response?.success && response?.data?.products) {
        setProducts(response.data.products);
        console.log('Fetched new trending products:', response.data.products.map((p: any) => p.name));
      } else {
        // Fallback to trending products if random products fails
        try {
          const trendingResponse: any = await api.marketplace.getTrendingProducts(2);
          if (trendingResponse?.data?.success && trendingResponse?.data?.data?.products) {
            setProducts(trendingResponse.data.data.products);
          } else if (trendingResponse?.success && trendingResponse?.data?.products) {
            setProducts(trendingResponse.data.products);
          } else {
            throw new Error('No products available');
          }
        } catch (trendingError) {
          // If both endpoints fail, use mock data in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Using mock data for trending products in development');
            const mockProducts: Product[] = [
              {
                id: '1',
                _id: '1',
                name: 'Mock Product 1',
                description: 'This is a mock product for testing',
                price: 29.99,
                currency: 'USD',
                images: [{
                  public_id: 'mock1',
                  secure_url: '/placeholder-product.jpg',
                  url: '/placeholder-product.jpg',
                  _id: 'img1'
                }],
                category: 'Electronics',
                tags: ['mock', 'test'],
                stock: 10,
                featured: true,
                isNFT: false,
                rating: 4.5,
                reviewCount: 12,
                sales: 42,
                views: 120,
                createdAt: new Date().toISOString(),
                vendor: {
                  id: 'vendor1',
                  username: 'mockvendor',
                  displayName: 'Mock Vendor',
                  avatar: '',
                  isVerified: true,
                  walletAddress: '0x123456789'
                }
              },
              {
                id: '2',
                _id: '2',
                name: 'Mock Product 2',
                description: 'This is another mock product for testing',
                price: 49.99,
                currency: 'USD',
                images: [{
                  public_id: 'mock2',
                  secure_url: '/placeholder-product.jpg',
                  url: '/placeholder-product.jpg',
                  _id: 'img2'
                }],
                category: 'Fashion',
                tags: ['mock', 'test'],
                stock: 5,
                featured: false,
                isNFT: true,
                rating: 4.2,
                reviewCount: 8,
                sales: 28,
                views: 85,
                createdAt: new Date().toISOString(),
                vendor: {
                  id: 'vendor2',
                  username: 'testvendor',
                  displayName: 'Test Vendor',
                  avatar: '',
                  isVerified: false,
                  walletAddress: '0x987654321'
                }
              }
            ];
            setProducts(mockProducts);
          } else {
            throw new Error('Failed to fetch trending products');
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching trending products:', err);
      setError(err.message || 'Failed to fetch trending products');
      
      // Use mock data in development when API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Using mock data for trending products in development due to API error');
        const mockProducts: Product[] = [
          {
            id: '1',
            _id: '1',
            name: 'Mock Product 1',
            description: 'This is a mock product for testing',
            price: 29.99,
            currency: 'USD',
            images: [{
              public_id: 'mock1',
              secure_url: '/placeholder-product.jpg',
              url: '/placeholder-product.jpg',
              _id: 'img1'
            }],
            category: 'Electronics',
            tags: ['mock', 'test'],
            stock: 10,
            featured: true,
            isNFT: false,
            rating: 4.5,
            reviewCount: 12,
            sales: 42,
            views: 120,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor1',
              username: 'mockvendor',
              displayName: 'Mock Vendor',
              avatar: '',
              isVerified: true,
              walletAddress: '0x123456789'
            }
          },
          {
            id: '2',
            _id: '2',
            name: 'Mock Product 2',
            description: 'This is another mock product for testing',
            price: 49.99,
            currency: 'USD',
            images: [{
              public_id: 'mock2',
              secure_url: '/placeholder-product.jpg',
              url: '/placeholder-product.jpg',
              _id: 'img2'
            }],
            category: 'Fashion',
            tags: ['mock', 'test'],
            stock: 5,
            featured: false,
            isNFT: true,
            rating: 4.2,
            reviewCount: 8,
            sales: 28,
            views: 85,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor2',
              username: 'testvendor',
              displayName: 'Test Vendor',
              avatar: '',
              isVerified: false,
              walletAddress: '0x987654321'
            }
          }
        ];
        setProducts(mockProducts);
        setError(null); // Clear error when using mock data
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial products
    fetchTrendingProducts();
    
    // Fetch new products every 30 seconds instead of 10 seconds to reduce server load
    const interval = setInterval(() => {
      fetchTrendingProducts();
    }, 30000); // Changed from 10000 (10s) to 30000 (30s)

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Get image URL with proper fallbacks
  const getImageUrl = (product: Product) => {
    if (!Array.isArray(product.images) || product.images.length === 0) {
      return '/placeholder-product.jpg';
    }
    
    // Always use the first image for simplicity
    const image = product.images[0];
    
    return image?.secure_url || image?.url || '/placeholder-product.jpg';
  };

  if (error) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={20} style={{ marginRight: 8 }} />
              <Typography variant="h6" fontWeight={700}>
                Trending Products
              </Typography>
            </Box>
            <IconButton size="small" onClick={fetchTrendingProducts} disabled={loading}>
              <RefreshCw size={18} />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 0 }} />
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp size={20} style={{ marginRight: 8 }} />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
              Trending Products
            </Typography>
          </Box>
          <IconButton size="small" onClick={fetchTrendingProducts} disabled={loading}>
            <RefreshCw size={18} />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 0 }} />
        
        {loading ? (
          [1, 2].map((item) => (
            <Box key={item} sx={{ mb: 0 }}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Box>
          ))
        ) : (
          products.slice(0, 2).map((product) => (
            <Box 
              key={product.id || product._id} 
              sx={{ 
                mb: 0,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease-in-out',
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                '&:hover': { 
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }
              }}
              onClick={() => window.location.href = `/marketplace/${product.id || product._id}`}
            >
              <CardMedia
                component="img"
                image={getImageUrl(product)}
                alt={product.name}
                sx={{ 
                  width: '100%',
                  height: 160,
                  objectFit: 'cover'
                }}
              />
              <Box sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 8,
                bgcolor: alpha(theme.palette.background.paper, 0.9),
                px: 1,
                py: 0.5,
                borderRadius: 2,
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUp size={12} color={theme.palette.error.main} />
                  <Typography variant="caption" color="error.main" fontWeight={700}>
                    {product.sales} sold
                  </Typography>
                </Box>
              </Box>
              
              {product.isNFT && (
                <Chip
                  label="NFT"
                  size="small"
                  color="secondary"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    fontWeight: 700,
                    height: 20,
                    borderRadius: 1.5,
                    fontSize: '0.6rem'
                  }}
                />
              )}
              
              <Box sx={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                p: 1.5,
                backdropFilter: 'blur(4px)'
              }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5, fontSize: '0.9rem' }}>
                  {product.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                    {product.currency} {product.price?.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Heart size={12} color={theme.palette.error.main} fill={theme.palette.error.main} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {product.reviewCount || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MessageCircle size={12} color={theme.palette.info.main} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {product.views || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star size={12} color={theme.palette.warning.main} fill={theme.palette.warning.main} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {product.rating?.toFixed(1) || '0.0'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingProducts;
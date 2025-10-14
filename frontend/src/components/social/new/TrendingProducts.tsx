import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import api from '@/lib/api';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { convertToProxyUrl } from '@/utils/urlConverter';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getRandomProducts(2); // Fetch 2 products
      
      if (response?.data?.success && response?.data?.data?.products) {
        setProducts(response.data.data.products);
      } else if (response?.success && response?.data?.products) {
        setProducts(response.data.products);
      } else {
        // Fallback to trending products if random products fails
        try {
          const trendingResponse: any = await api.marketplace.getTrendingProducts(2);
          if (trendingResponse?.data?.success && trendingResponse?.data?.data?.products) {
            setProducts(trendingResponse.data.data.products);
          } else if (trendingResponse?.success && trendingResponse?.data?.products) {
            setProducts(trendingResponse.data.products);
          } else {
            // Use mock data in development
            if (process.env.NODE_ENV === 'development') {
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
                    secure_url: '/images/placeholder-image-new.png',
                    url: '/images/placeholder-image-new.png',
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
                    secure_url: '/images/placeholder-image-new.png',
                    url: '/images/placeholder-image-new.png',
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
            }
          }
        } catch (trendingError) {
          // Use mock data in development
          if (process.env.NODE_ENV === 'development') {
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
                  secure_url: '/images/placeholder-image-new.png',
                  url: '/images/placeholder-image-new.png',
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
                  secure_url: '/images/placeholder-image-new.png',
                  url: '/images/placeholder-image-new.png',
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
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching trending products:', err);
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
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
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
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
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
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
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial products
    fetchTrendingProducts();
    
    // Fetch new products every 45 seconds to reduce pressure under slow networks
    const interval = setInterval(() => {
      fetchTrendingProducts();
    }, 45000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Get image URL with proper fallbacks
  const getImageUrl = (product: Product) => {
    if (!Array.isArray(product.images) || product.images.length === 0) {
      return '/images/placeholder-image-new.png';
    }
    
    // Always use the first image for simplicity
    const image = product.images[0];
    const raw = image?.secure_url || image?.url || '/images/placeholder-image-new.png';
    // Proxy Cloudinary or backend uploads similar to post images
    const converted = convertToProxyUrl(raw);
    const proxied = proxyCloudinaryUrl(converted);
    return proxied || converted || '/images/placeholder-image-new.png';
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: 'none' }}>
      <CardContent sx={{ pb: 1, pt: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[1, 2].map((item) => (
              <Box key={item} sx={{ flex: 1 }}>
                <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        ) : (
          // Image-only view - only show product images without any additional information
          <Box sx={{ display: 'flex', gap: 1 }}>
            {products.slice(0, 2).map((product) => (
              <Box 
                key={product.id || product._id} 
                onClick={() => window.location.href = `/marketplace/${product.id || product._id}`}
                style={{ 
                  flex: 1,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 4
                }}
              >
                <img
                  src={getImageUrl(product)}
                  alt={product.name}
                  style={{ 
                    width: '100%',
                    height: 80,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingProducts;
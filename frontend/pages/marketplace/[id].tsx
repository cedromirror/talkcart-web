import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Stack,
  Avatar,
  Divider,
  Alert,
  IconButton,
  Skeleton,
  useTheme,
  alpha,
  Paper,
  Fade,
  Zoom,
  keyframes,
  Dialog,
  CircularProgress
} from '@mui/material';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Wallet, 
  Star, 
  Eye, 
  Share2, 
  Heart,
  ExternalLink,
  Shield,
  Tag,
  CreditCard,
  Truck,
  Zap,
  CheckCircle,
  Lock,
  RotateCcw
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useWebSocket } from '@/contexts/WebSocketContext';
import useMarketplace from '@/hooks/useMarketplace';
import { ProductImage } from '@/types';
import { toast } from 'react-hot-toast';
import { SessionExpiredError } from '@/lib/api';
import BuyModal from '@/components/marketplace/BuyModal';

// Keyframes for animations
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

interface ProductPageProps {}

const ProductPage: React.FC<ProductPageProps> = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const { account, connected } = useWeb3();
  const { fetchProduct, buyProduct, loading } = useMarketplace();
  const { joinProduct, leaveProduct, onProductViewUpdate, onProductSale } = useWebSocket();
  
  const [product, setProduct] = useState<any>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch product data
  useEffect(() => {
    const loadProduct = async () => {
      if (!id || typeof id !== 'string') return;
      
      setProductLoading(true);
      try {
        const productData = await fetchProduct(id);
        setProduct(productData);
      } catch (error) {
        console.error('Error loading product:', error);
        toast.error('Failed to load product');
      } finally {
        setProductLoading(false);
      }
    };

    if (router.isReady && id) {
      loadProduct();
    }
  }, [router.isReady, id, fetchProduct]);

  // Join product for real-time updates
  useEffect(() => {
    if (id && typeof id === 'string') {
      joinProduct(id);
      
      return () => {
        leaveProduct(id);
      };
    }
  }, [id, joinProduct, leaveProduct]);

  // Real-time updates
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const unsubscribeViewUpdate = onProductViewUpdate((data: any) => {
      console.log('Product view updated:', data);
      if (product) {
        setProduct((prev: any) => ({
          ...prev,
          views: data.views
        }));
      }
    });

    const unsubscribeSale = onProductSale((data: any) => {
      console.log('Product sale update:', data);
      if (product && data.productId === id) {
        setProduct((prev: any) => ({
          ...prev,
          sales: data.newSalesCount,
          stock: data.stock
        }));
        toast.success(`🎉 This item was just purchased!`);
      }
    });

    return () => {
      unsubscribeViewUpdate();
      unsubscribeSale();
    };
  }, [id, product, onProductViewUpdate, onProductSale]);

  const handlePurchase = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to make a purchase');
      router.push('/auth/login?next=' + encodeURIComponent(router.asPath));
      return;
    }

    // Check if token exists in localStorage
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      toast.error('Your session has expired. Please log in again.');
      router.push('/auth/login?next=' + encodeURIComponent(router.asPath));
      return;
    }

    if (product?.isNFT && !connected) {
      toast.error('Please connect your wallet to buy NFTs');
      return;
    }

    // Open the buy modal instead of directly purchasing
    setOpenBuyModal(true);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    } else if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price} ${currency}`;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < Math.floor(rating) ? theme.palette.warning.main : 'none'}
        color={i < Math.floor(rating) ? theme.palette.warning.main : theme.palette.grey[400]}
      />
    ));
  };

  if (productLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="text" width="80%" height={40} />
              <Skeleton variant="text" width="60%" height={32} sx={{ my: 2 }} />
              <Skeleton variant="text" width="100%" height={80} sx={{ my: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={56} />
            </Grid>
          </Grid>
        </Container>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Product Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The product you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            component={Link}
            href="/marketplace"
            variant="contained"
            startIcon={<ArrowLeft size={20} />}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              '&:hover': {
                boxShadow: '0 6px 25px rgba(0,0,0,0.15)',
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            Back to Marketplace
          </Button>
        </Container>
      </Layout>
    );
  }

  const isOwner = false; // Since all products show @admin, users can never be owners
  const canPurchase = isAuthenticated && (product.stock > 0 || product.isNFT);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Breadcrumb */}
        <Box sx={{ mb: { xs: 2, md: 3 } }}>
          <Button
            component={Link}
            href="/marketplace"
            startIcon={<ArrowLeft size={20} />}
            sx={{
              mb: 2,
              color: theme.palette.text.secondary,
              fontWeight: 500,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05)
              }
            }}
          >
            Back to Marketplace
          </Button>
        </Box>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Product Images */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                overflow: 'hidden', 
                borderRadius: 3,
                boxShadow: '0 12px 35px rgba(0,0,0,0.12)',
                position: 'relative',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 16px 45px rgba(0,0,0,0.18)',
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardMedia
                component="img"
                height="450"
                image={
                  product.images && product.images.length > 0 
                    ? (typeof product.images[imageIndex] === 'string' 
                        ? product.images[imageIndex] 
                        : product.images[imageIndex]?.secure_url || product.images[imageIndex]?.url)
                    : 'https://via.placeholder.com/600x400?text=No+Image'
                }
                alt={product.name}
                sx={{ 
                  objectFit: 'contain',
                  backgroundColor: '#f8f9fa',
                  p: 2
                }}
              />
              
              {/* Action Buttons Overlay */}
              <Box sx={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                display: 'flex', 
                gap: 1 
              }}>
                <IconButton 
                  onClick={handleShare}
                  sx={{
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(10px)',
                    color: theme.palette.text.primary,
                    width: 44,
                    height: 44,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.95),
                      transform: 'scale(1.05)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  <Share2 size={20} />
                </IconButton>
                <IconButton 
                  onClick={() => setLiked(!liked)}
                  sx={{
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(10px)',
                    color: liked ? theme.palette.error.main : theme.palette.text.primary,
                    width: 44,
                    height: 44,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 0.95),
                      transform: 'scale(1.05)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  <Heart size={20} fill={liked ? theme.palette.error.main : 'none'} />
                </IconButton>
              </Box>
            </Card>
          </Grid>

          {/* Product Details */}
          <Grid item xs={12} md={6}>
            <Fade in timeout={500}>
              <Stack spacing={3}>
                <Box>
                  {/* Vendor Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar 
                      src={product.vendor?.avatar || '/images/default-avatar.png'} 
                      sx={{ width: 32, height: 32 }}
                      imgProps={{
                        onError: (e: any) => {
                          if (e.currentTarget.src !== '/images/default-avatar.png') {
                            e.currentTarget.src = '/images/default-avatar.png';
                          }
                        }
                      }}
                    >
                      {product.vendor?.displayName?.charAt(0) || product.vendor?.username?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {product.vendor?.displayName || product.vendor?.username}
                      </Typography>
                      {product.vendor?.isVerified && (
                        <Chip 
                          icon={<Shield size={12} />} 
                          label="Verified" 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.65rem',
                            '& .MuiChip-icon': { mr: 0.5 }
                          }} 
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Product Title */}
                  <Typography variant="h4" fontWeight={800} gutterBottom>
                    {product.name}
                  </Typography>

                  {/* Rating and Views */}
                  {product.rating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {renderStars(product.rating)}
                        <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                          {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Eye size={16} />
                        <Typography variant="body2">{product.views} views</Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Price */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography 
                        variant="h3" 
                        color="primary" 
                        sx={{ 
                          fontWeight: 800,
                          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          animation: `${pulse} 3s infinite`
                        }}
                      >
                        {formatPrice(product.price, product.currency)}
                      </Typography>
                      {product.discount && product.discount > 0 && (
                        <Typography 
                          variant="h6" 
                          color="text.secondary"
                          sx={{ 
                            textDecoration: 'line-through',
                          }}
                        >
                          {formatPrice(product.price * (100 / (100 - product.discount)), product.currency)}
                        </Typography>
                      )}
                      {product.discount && product.discount > 0 && (
                        <Chip 
                          label={`Save ${product.discount}%`}
                          size="small"
                          sx={{
                            backgroundColor: '#CC0C39',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            height: 24,
                            animation: `${bounce} 2s infinite`
                          }}
                        />
                      )}
                    </Box>
                    
                    {/* Tax Info */}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      inclusive of all taxes
                    </Typography>
                  </Box>
                </Box>

                {/* Stock Info */}
                {!product.isNFT && (
                  <Alert 
                    severity={product.stock > 10 ? "success" : product.stock > 0 ? "warning" : "error"}
                    sx={{ 
                      borderRadius: 2,
                      fontWeight: 500,
                      '& .MuiAlert-icon': {
                        color: product.stock > 10 ? theme.palette.success.main : 
                               product.stock > 0 ? theme.palette.warning.main : 
                               theme.palette.error.main
                      }
                    }}
                    icon={product.stock > 0 ? <CheckCircle size={20} /> : <Lock size={20} />}
                  >
                    {product.stock > 10 ? "In Stock - Ready to ship" : 
                     product.stock > 0 ? `Only ${product.stock} left in stock - order soon` : 
                     "Out of Stock"}
                  </Alert>
                )}

                {/* NFT Details */}
                {product.isNFT && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      borderRadius: 2,
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      borderWidth: 2,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        NFT Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Contract</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 500 }}>
                              {product.contractAddress?.slice(0, 6)}...{product.contractAddress?.slice(-4)}
                            </Typography>
                            <IconButton size="small">
                              <ExternalLink size={16} />
                            </IconButton>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">Token ID</Typography>
                          <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 500 }}>
                            {product.tokenId}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Paper>
                )}

                {/* Features */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {product.freeShipping && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Truck size={18} color="#007600" />
                      <Typography variant="body2" color="#007600" sx={{ fontWeight: 500 }}>
                        FREE Delivery
                      </Typography>
                    </Box>
                  )}
                  {product.fastDelivery && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Zap size={18} color="#007185" />
                      <Typography variant="body2" color="#007185" sx={{ fontWeight: 500 }}>
                        Fast Delivery
                      </Typography>
                    </Box>
                  )}
                  {product.prime && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Shield size={18} color="#007185" />
                      <Typography variant="body2" color="#007185" sx={{ fontWeight: 500 }}>
                        Prime Benefits
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Add to Cart / Purchase Options */}
                <Box sx={{ 
                  position: 'sticky', 
                  bottom: 0, 
                  bgcolor: 'background.paper', 
                  pt: 2,
                  borderRadius: 2
                }}>
                  {isOwner ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      size="large"
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 600
                      }}
                    >
                      This is your product
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {/* Direct Purchase Button - Replaces AddToCartButton */}
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        sx={{
                          backgroundColor: '#FFD814',
                          color: '#0F1111',
                          boxShadow: '0 2px 10px rgba(255, 216, 20, 0.3)',
                          textTransform: 'none',
                          fontWeight: 600,
                          border: '1px solid #FCD200',
                          py: 1.5,
                          borderRadius: 2,
                          '&:hover': {
                            backgroundColor: '#F7CA00',
                            borderColor: '#F2C200',
                            boxShadow: '0 4px 15px rgba(255, 216, 20, 0.4)',
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        onClick={() => handlePurchase()}
                        disabled={!canPurchase || purchasing}
                      >
                        {purchasing ? (
                          <CircularProgress size={16} sx={{ color: '#0F1111' }} />
                        ) : product.isNFT ? (
                          'Buy NFT Now'
                        ) : (
                          'Buy Now'
                        )}
                      </Button>
                      
                      {/* Buy Now: open modal for Stripe/Crypto/NFT */}
                      {canPurchase && (
                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          onClick={() => handlePurchase()}
                          disabled={purchasing}
                          startIcon={product.isNFT ? <Wallet size={20} /> : <CreditCard size={20} />}
                          sx={{ 
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            color: 'white',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            textTransform: 'none',
                            fontWeight: 600,
                            border: 'none',
                            py: 1.5,
                            borderRadius: 2,
                            '&:hover': {
                              boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
                              transform: 'translateY(-2px)',
                              transition: 'all 0.3s ease'
                            }
                          }}
                        >
                          {purchasing ? 'Processing...' : product.isNFT ? 'Buy NFT Now' : 'Buy Now'}
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              </Stack>
            </Fade>
          </Grid>
        </Grid>

        {/* Description & Tags */}
        <Zoom in timeout={600}>
          <Box sx={{ mt: { xs: 3, md: 5 } }}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
              }}
            >
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Description
              </Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                {product.description}
              </Typography>

              {product.tags && product.tags.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {product.tags.map((tag: string, index: number) => (
                      <Chip
                        key={index}
                        label={tag}
                        variant="outlined"
                        size="small"
                        icon={<Tag size={14} />}
                        sx={{
                          borderRadius: 1,
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          '& .MuiChip-icon': {
                            color: theme.palette.primary.main
                          }
                        }}
                      />
                    ))}
                  </Stack>
                </>
              )}
            </Paper>
          </Box>
        </Zoom>
      </Container>

      {/* Buy Modal */}
      <BuyModal
        open={openBuyModal}
        onClose={() => setOpenBuyModal(false)}
        product={product}
        onPurchase={async (paymentMethod, paymentDetails) => {
          setPurchasing(true);
          setOpenBuyModal(false);
          try {
            // Ensure we always pass the paymentMethod parameter and product information
            const requestData = { paymentMethod, paymentDetails, product };
            const result = await buyProduct(product.id, requestData);
            
            if (result) {
              // Refresh product data to show updated stock/sales
              const updatedProduct = await fetchProduct(product.id);
              setProduct(updatedProduct);
              toast.success('Purchase completed successfully!');
            }
          } catch (error) {
            console.error('Purchase error:', error);
            
            // Handle session expiration specifically
            if (error instanceof SessionExpiredError || error?.name === 'SessionExpiredError') {
              toast.error('Your session has expired. Please log in again.');
              router.push('/auth/login?next=' + encodeURIComponent(router.asPath));
            } else {
              // Handle other errors
              toast.error(error instanceof Error ? error.message : 'Failed to purchase product');
            }
          } finally {
            setPurchasing(false);
          }
        }}
        purchasing={purchasing}
      />
    </Layout>
  );
};

export default ProductPage;
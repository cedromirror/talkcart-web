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
  CreditCard
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useCart } from '@/contexts/CartContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import useMarketplace from '@/hooks/useMarketplace';
import { ProductImage } from '@/types';
import { toast } from 'react-hot-toast';
import { SessionExpiredError } from '@/lib/api';
import AddToCartButton from '@/components/cart/AddToCartButton';
import BuyModal from '@/components/marketplace/BuyModal';

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
  const [buyOpen, setBuyOpen] = useState(false);

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

    if (product?.vendor?.id === user?.id) {
      toast.error('You cannot buy your own product');
      return;
    }

    setPurchasing(true);
    try {
      const result = await buyProduct(product.id);
      if (result) {
        // Refresh product data to show updated stock/sales
        const updatedProduct = await fetchProduct(product.id);
        setProduct(updatedProduct);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      
      // Handle session expiration specifically
      if (error instanceof SessionExpiredError || error?.name === 'SessionExpiredError') {
        toast.error('Your session has expired. Please log in again.');
        router.push('/auth/login?next=' + encodeURIComponent(router.asPath));
        return; // Important: return early to avoid further processing
      } else {
        // Handle other errors
        toast.error(error instanceof Error ? error.message : 'Failed to purchase product');
      }
    } finally {
      setPurchasing(false);
    }
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
        toast.success('Link copied to clipboard!');
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
          >
            Back to Marketplace
          </Button>
        </Container>
      </Layout>
    );
  }

  const isOwner = user?.id === product.vendor.id;
  const canPurchase = isAuthenticated && !isOwner && (product.stock > 0 || product.isNFT);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumb */}
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/marketplace"
            startIcon={<ArrowLeft size={20} />}
            sx={{ mb: 2 }}
          >
            Back to Marketplace
          </Button>
        </Box>

        <Grid container spacing={4}>
          {/* Product Images */}
          <Grid item xs={12} md={6}>
            <Card sx={{ overflow: 'hidden', borderRadius: 2 }}>
              <CardMedia
                component="img"
                height="400"
                image={
                  product.images && product.images.length > 0 
                    ? (typeof product.images[imageIndex] === 'string' 
                        ? product.images[imageIndex] 
                        : product.images[imageIndex]?.secure_url || product.images[imageIndex]?.url)
                    : 'https://via.placeholder.com/600x400?text=No+Image'
                }
                alt={product.name}
                sx={{ objectFit: 'cover' }}
              />
              {product.images.length > 1 && (
                <Box sx={{ p: 2, display: 'flex', gap: 1, overflowX: 'auto' }}>
                  {product.images.map((image: ProductImage | string, index: number) => (
                    <Box
                      key={index}
                      component="img"
                      src={
                        typeof image === 'string' 
                          ? image 
                          : image?.secure_url || image?.url || 'https://via.placeholder.com/60x60?text=No+Image'
                      }
                      alt={`${product.name} ${index + 1}`}
                      onClick={() => setImageIndex(index)}
                      sx={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: index === imageIndex ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                        opacity: index === imageIndex ? 1 : 0.7,
                        '&:hover': { opacity: 1 },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Card>
          </Grid>

          {/* Product Details */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              {/* Header */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
                    {product.name}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={handleShare} size="small">
                      <Share2 size={20} />
                    </IconButton>
                    <IconButton size="small">
                      <Heart size={20} />
                    </IconButton>
                  </Stack>
                </Box>

                {/* Chips */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={product.category} size="small" />
                  {product.isNFT && (
                    <Chip 
                      label="NFT" 
                      color="primary" 
                      size="small"
                      icon={<Shield size={16} />}
                    />
                  )}
                  {product.featured && (
                    <Chip label="Featured" color="secondary" size="small" />
                  )}
                </Stack>

                {/* Price */}
                <Typography variant="h3" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
                  {formatPrice(product.price, product.currency)}
                </Typography>

                {/* Rating & Stats */}
                {product.rating > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {renderStars(product.rating)}
                      <Typography variant="body2" sx={{ ml: 0.5 }}>
                        {product.rating} ({product.reviewCount} reviews)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Eye size={16} />
                      <Typography variant="body2">{product.views} views</Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Vendor Info */}
              <Card variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={product.vendor.avatar} 
                    alt={product.vendor.displayName}
                    sx={{ width: 56, height: 56 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{product.vendor.displayName}</Typography>
                      {product.vendor.isVerified && (
                        <Chip label="Verified" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      @{product.vendor.username}
                    </Typography>
                    {product.vendor.walletAddress && (
                      <Typography variant="caption" color="text.secondary">
                        {product.vendor.walletAddress.slice(0, 6)}...{product.vendor.walletAddress.slice(-4)}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    component={Link}
                    href={`/profile/${product.vendor.username}`}
                    variant="outlined"
                    size="small"
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Stock Info */}
              {!product.isNFT && (
                <Alert 
                  severity={product.stock > 10 ? "success" : product.stock > 0 ? "warning" : "error"}
                  sx={{ borderRadius: 2 }}
                >
                  {product.stock > 10 ? "In Stock" : 
                   product.stock > 0 ? `Only ${product.stock} left in stock` : 
                   "Out of Stock"}
                </Alert>
              )}

              {/* NFT Details */}
              {product.isNFT && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>NFT Details</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Contract</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontFamily="monospace">
                            {product.contractAddress?.slice(0, 6)}...{product.contractAddress?.slice(-4)}
                          </Typography>
                          <IconButton size="small">
                            <ExternalLink size={16} />
                          </IconButton>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Token ID</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {product.tokenId}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {/* Add to Cart / Purchase Options */}
              <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 2 }}>
                {isOwner ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
                    size="large"
                  >
                    This is your product
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Add to Cart Button */}
                    <AddToCartButton
                      product={{
                        _id: product._id,
                        name: product.name,
                        price: product.price,
                        currency: product.currency,
                        isNFT: product.isNFT,
                        availability: product.availability
                      }}
                      variant="contained"
                      size="large"
                      fullWidth
                      showQuantityControls={!product.isNFT}
                      disabled={!canPurchase}
                      onAddToCart={() => {
                        // Auto-open cart drawer after adding
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('cart:open'));
                        }
                      }}
                      onViewCart={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('cart:open'));
                        }
                      }}
                    />
                    
                    {/* Buy Now: open modal for Stripe/Crypto/NFT */}
                    {canPurchase && (
                      <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        onClick={() => setBuyOpen(true)}
                        disabled={purchasing}
                        startIcon={product.isNFT ? <Wallet size={20} /> : <CreditCard size={20} />}
                        sx={{ 
                          borderStyle: 'dashed',
                          '&:hover': { borderStyle: 'solid' }
                        }}
                      >
                        {purchasing ? 'Processing...' : product.isNFT ? 'Buy NFT' : 'Buy Now'}
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* Description & Tags */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Description
          </Typography>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
            {product.description}
          </Typography>

          {product.tags && product.tags.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
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
                  />
                ))}
              </Stack>
            </>
          )}
        </Box>
      </Container>

      {/* Buy Now modal */}
      <BuyModal open={buyOpen} onClose={() => setBuyOpen(false)} product={product} />
    </Layout>
  );
};

export default ProductPage;
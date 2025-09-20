import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  IconButton,
  Rating,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Fade,
} from '@mui/material';
import {
  ShoppingCart,
  Heart,
  Share2,
  MoreVertical,
  Eye,
  Verified,
  Shield,
  Truck,
  Clock,
  Star,
  TrendingUp,
  Zap,
  Award,
  MessageCircle,
} from 'lucide-react';
import { useRouter } from 'next/router';
import FollowButton from '@/components/common/FollowButton';
import AddToCartButton from '@/components/cart/AddToCartButton';

interface ProductCardProps {
  product: MarketplaceProduct;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onShare?: (product: MarketplaceProduct) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  condition: string;
  seller: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
    rating: number;
    totalSales: number;
  };
  rating: number;
  reviewCount: number;
  isNFT: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isNew: boolean;
  freeShipping: boolean;
  fastDelivery: boolean;
  inStock: boolean;
  quantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
  favorites: number;
  isFavorited: boolean;
  discount?: {
    percentage: number;
    originalPrice: number;
    endsAt: string;
  };
  auction?: {
    isAuction: boolean;
    currentBid: number;
    minBid: number;
    endsAt: string;
    bidCount: number;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onToggleFavorite,
  onShare,
  variant = 'default',
}) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCardClick = () => {
    router.push(`/marketplace/product/${product.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(product);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getCardHeight = () => {
    switch (variant) {
      case 'compact':
        return 300;
      case 'featured':
        return 450;
      default:
        return 380;
    }
  };

  const getImageHeight = () => {
    switch (variant) {
      case 'compact':
        return 150;
      case 'featured':
        return 250;
      default:
        return 200;
    }
  };

  return (
    <Card
      sx={{
        height: getCardHeight(),
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height={getImageHeight()}
          image={product.images?.[0] || '/images/default-avatar.png'}
          alt={product.title}
          onLoad={() => setImageLoaded(true)}
          sx={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />

        {/* Overlay Badges */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {product.isNew && (
            <Chip
              label="NEW"
              size="small"
              color="success"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
          {product.isFeatured && (
            <Chip
              label="FEATURED"
              size="small"
              color="primary"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
          {product.isTrending && (
            <Chip
              icon={<TrendingUp size={12} />}
              label="TRENDING"
              size="small"
              color="warning"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
          {product.isNFT && (
            <Chip
              label="NFT"
              size="small"
              sx={{
                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          )}
        </Box>

        {/* Top Right Actions */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
          }}
        >
          <Fade in={isHovered}>
            <IconButton
              size="small"
              onClick={handleToggleFavorite}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' },
              }}
            >
              <Heart
                size={16}
                fill={product.isFavorited ? '#f44336' : 'none'}
                color={product.isFavorited ? '#f44336' : '#666'}
              />
            </IconButton>
          </Fade>
          <Fade in={isHovered}>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' },
              }}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Fade>
        </Box>

        {/* Discount Badge */}
        {product.discount && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
            }}
          >
            <Chip
              label={`-${product.discount.percentage}%`}
              size="small"
              color="error"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}

        {/* Quick Stats */}
        <Fade in={isHovered}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              gap: 1,
            }}
          >
            <Chip
              icon={<Eye size={12} />}
              label={product.views}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
            <Chip
              icon={<Heart size={12} />}
              label={product.favorites}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
          </Box>
        </Fade>
      </Box>

      <CardContent sx={{ p: 2, height: 'calc(100% - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Seller Info */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Avatar src={product.seller.avatar} sx={{ width: 24, height: 24 }}>
            {product.seller.displayName[0]}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {product.seller.displayName}
          </Typography>
          {product.seller.isVerified && (
            <Verified size={12} color="#1976d2" />
          )}
          <Box display="flex" alignItems="center" gap={0.5} ml="auto">
            <FollowButton
              user={product.seller}
              variant="button"
              size="small"
              context="marketplace"
            />
            <Star size={12} fill="#ffc107" color="#ffc107" />
            <Typography variant="caption" color="text.secondary">
              {product.seller.rating.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle2"
          fontWeight={600}
          gutterBottom
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            minHeight: '2.4em',
          }}
        >
          {product.title}
        </Typography>

        {/* Rating and Reviews */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Rating value={product.rating} precision={0.1} size="small" readOnly />
          <Typography variant="caption" color="text.secondary">
            ({product.reviewCount})
          </Typography>
        </Box>

        {/* Features */}
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
          {product.freeShipping && (
            <Chip
              icon={<Truck size={10} />}
              label="Free Ship"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20 }}
            />
          )}
          {product.fastDelivery && (
            <Chip
              icon={<Zap size={10} />}
              label="Fast"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20 }}
            />
          )}
          {product.auction?.isAuction && (
            <Chip
              icon={<Clock size={10} />}
              label="Auction"
              size="small"
              variant="outlined"
              color="warning"
              sx={{ fontSize: '0.6rem', height: 20 }}
            />
          )}
        </Box>

        {/* Price */}
        <Box display="flex" alignItems="center" gap={1} mb={2} mt="auto">
          <Typography variant="h6" color="primary" fontWeight={700}>
            {formatPrice(product.price, product.currency)}
          </Typography>
          {product.discount && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textDecoration: 'line-through' }}
            >
              {formatPrice(product.discount.originalPrice, product.currency)}
            </Typography>
          )}
        </Box>

        {/* Action Button */}
        {product.auction?.isAuction ? (
          <Button
            fullWidth
            variant="contained"
            startIcon={<Clock size={16} />}
            onClick={handleAddToCart}
            disabled={!product.inStock}
            sx={{ mt: 'auto' }}
            color="warning"
          >
            Bid {formatPrice(product.auction.minBid, product.currency)}
          </Button>
        ) : (
          <AddToCartButton
            product={{
              _id: product.id,
              name: product.title,
              price: product.price,
              currency: product.currency,
              isNFT: product.isNFT,
              availability: product.inStock ? 'available' : 'unavailable'
            }}
            variant="contained"
            size="medium"
            fullWidth
            showQuantityControls={false}
            onAddToCart={() => onAddToCart?.(product.id)}
            onViewCart={() => {
              // Fire a DOM event that TopBar listens for to open the cart
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('cart:open'));
              }
            }}
          />
        )}
      </CardContent>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleShare}>
          <ListItemIcon>
            <Share2 size={16} />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => router.push(`/marketplace/seller/${product.seller.id}`)}>
          <ListItemIcon>
            <Eye size={16} />
          </ListItemIcon>
          <ListItemText>View Seller</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => router.push(`/marketplace/category/${product.category}`)}>
          <ListItemIcon>
            <Award size={16} />
          </ListItemIcon>
          <ListItemText>Browse Category</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => router.push(`/messages/new?seller=${product.seller.id}`)}>
          <ListItemIcon>
            <MessageCircle size={16} />
          </ListItemIcon>
          <ListItemText>Message Seller</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default ProductCard;
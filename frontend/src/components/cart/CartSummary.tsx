import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Badge,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Palette,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/router';

interface CartSummaryProps {
  variant?: 'minimal' | 'detailed' | 'badge';
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  variant = 'detailed',
  showIcon = true,
  className = '',
  onClick
}) => {
  const { cart } = useCart();
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/cart');
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price.toFixed(4)} ${currency}`;
  };

  // Minimal variant - just a badge
  if (variant === 'badge') {
    return (
      <Tooltip title={`Cart (${cart.totalItems} items) - ${formatPrice(cart.summary?.totalPrice || 0)}`} arrow>
        <IconButton
          onClick={handleClick}
          className={className}
          size="small"
        >
          <Badge badgeContent={cart.totalItems} color="primary" max={99}>
            {showIcon && <ShoppingCart size={20} />}
          </Badge>
        </IconButton>
      </Tooltip>
    );
  }

  // Minimal variant - simple text display
  if (variant === 'minimal') {
    return (
      <Box
        onClick={handleClick}
        className={className}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.7,
          },
        }}
      >
        {showIcon && (
          <Badge badgeContent={cart.totalItems} color="primary" max={99}>
            <ShoppingCart size={16} />
          </Badge>
        )}
        <Typography variant="body2">
          {cart.totalItems} items • {formatPrice(cart.summary?.totalPrice || 0)}
        </Typography>
      </Box>
    );
  }

  // Detailed variant - full cart summary
  return (
    <Paper
      onClick={handleClick}
      className={className}
      sx={{
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showIcon && (
          <Badge badgeContent={cart.totalItems} color="primary" max={99}>
            <ShoppingCart size={24} />
          </Badge>
        )}
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Shopping Cart
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              icon={<Package size={12} />}
              label={`${cart.totalItems} ${cart.totalItems === 1 ? 'item' : 'items'}`}
              size="small"
              variant="outlined"
            />
            
            {cart.summary?.hasNFTs && (
              <Chip
                icon={<Palette size={12} />}
                label="NFTs"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            {formatPrice(cart.summary?.totalPrice || 0)}
          </Typography>
          
          {cart.summary?.hasCryptoItems && (
            <Typography variant="caption" color="text.secondary">
              Crypto items
            </Typography>
          )}
        </Box>
      </Box>
      
      {cart.loading && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Updating...
          </Typography>
        </Box>
      )}
      
      {cart.error && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="error">
            {cart.error}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CartSummary;
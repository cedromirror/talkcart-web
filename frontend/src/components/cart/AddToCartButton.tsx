import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Box,
  TextField,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ShoppingCart,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  price: number;
  currency?: string;
  isNFT: boolean;
  availability: string;
}

interface AddToCartButtonProps {
  product: Product;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  showQuantityControls?: boolean;
  className?: string;
  onAddToCart?: () => void;
  onViewCart?: () => void; // optional callback to open cart drawer
  disabled?: boolean;
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  product,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  showQuantityControls = true,
  className = '',
  onAddToCart,
  onViewCart,
  disabled = false
}) => {
  const { addToCart, isInCart, cart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Check if product is available
  const isAvailable = product.availability === 'available' || product.availability === 'limited';
  const isSold = product.availability === 'sold';
  const isUnavailable = product.availability === 'unavailable';

  // Check if already in cart
  const alreadyInCart = isInCart(product._id);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      router.push(`/auth/login?next=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (!isAvailable || disabled) {
      return;
    }

    setIsAdding(true);

    try {
      const success = await addToCart(product._id, product.isNFT ? 1 : quantity);
      
      if (success) {
        setJustAdded(true);
        if (onAddToCart) {
          onAddToCart();
        }
        
        // Offer quick view cart if callback provided
        if (onViewCart) {
          onViewCart();
        }
        
        // Reset "just added" state after 2 seconds
        setTimeout(() => setJustAdded(false), 2000);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  // If product is sold out
  if (isSold) {
    return (
      <Button
        variant="outlined"
        size={size}
        fullWidth={fullWidth}
        disabled
        className={className}
        startIcon={<AlertCircle size={16} />}
      >
        Sold Out
      </Button>
    );
  }

  // If product is unavailable
  if (isUnavailable || disabled) {
    return (
      <Button
        variant="outlined"
        size={size}
        fullWidth={fullWidth}
        disabled
        className={className}
        startIcon={<AlertCircle size={16} />}
      >
        Unavailable
      </Button>
    );
  }

  // If NFT and already in cart
  if (product.isNFT && alreadyInCart) {
    return (
      <Button
        variant="outlined"
        size={size}
        fullWidth={fullWidth}
        disabled
        className={className}
        startIcon={<Check size={16} />}
        sx={{ color: 'success.main', borderColor: 'success.main' }}
      >
        In Cart
      </Button>
    );
  }

  // Main add to cart button
  return (
    <Box className={className}>
      {/* Quantity Controls (for non-NFT items) */}
      {!product.isNFT && showQuantityControls && !justAdded && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus size={16} />
          </IconButton>
          <TextField
            size="small"
            value={quantity}
            onChange={(e) => {
              const qty = parseInt(e.target.value) || 1;
              handleQuantityChange(qty);
            }}
            sx={{ width: 60 }}
            inputProps={{ min: 1, style: { textAlign: 'center' } }}
          />
          <IconButton
            size="small"
            onClick={() => handleQuantityChange(quantity + 1)}
          >
            <Plus size={16} />
          </IconButton>
        </Box>
      )}

      {/* Add to Cart Button */}
      <Button
        variant={justAdded ? 'outlined' : variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleAddToCart}
        disabled={isAdding || !isAvailable}
        startIcon={
          isAdding ? (
            <CircularProgress size={16} />
          ) : justAdded ? (
            <Check size={16} />
          ) : (
            <ShoppingCart size={16} />
          )
        }
        sx={{
          ...(justAdded && {
            color: 'success.main',
            borderColor: 'success.main',
          }),
          ...(product.isNFT && {
            background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
            '&:hover': {
              background: 'linear-gradient(45deg, #7b1fa2, #512da8)',
            },
          }),
        }}
      >
        {isAdding ? (
          'Adding...'
        ) : justAdded ? (
          'Added to Cart!'
        ) : alreadyInCart && !product.isNFT ? (
          'Add More'
        ) : (
          <>
            {product.isNFT ? 'Add NFT to Cart' : 'Add to Cart'}
            {product.isNFT && (
              <Chip
                size="small"
                label="NFT"
                sx={{
                  ml: 1,
                  height: '20px',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                }}
                icon={<Palette size={12} />}
              />
            )}
          </>
        )}
      </Button>

      {/* Price display */}
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontWeight: 'bold' }}>
            {product.currency === 'USD' ? `$${product.price.toFixed(2)}` : `${product.price.toFixed(4)} ${product.currency}`}
          </span>
          {!product.isNFT && quantity > 1 && (
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              × {quantity} = ${(product.price * quantity).toFixed(2)}
            </span>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AddToCartButton;
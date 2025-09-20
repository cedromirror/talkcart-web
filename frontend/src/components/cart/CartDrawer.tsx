import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Divider,
  TextField,
  Chip,
  Badge,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Coins,
  Palette,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'left' | 'right' | 'top' | 'bottom';
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  anchor = 'right'
}) => {
  const { cart, updateCartItem, removeFromCart, clearCart, checkout } = useCart();
  const router = useRouter();
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart();
    }
  };

  const handleCheckout = async (paymentMethod: 'stripe' | 'crypto' | 'nft') => {
    setProcessingCheckout(true);
    try {
      const result = await checkout(paymentMethod);
      if (result) {
        toast.success('Order placed successfully!');
        onClose();
        router.push('/orders'); // Redirect to orders page
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setProcessingCheckout(false);
    }
  };

  const getPaymentMethodForCart = () => {
    if (!cart.summary) return 'stripe';
    
    // If cart has NFTs, prefer crypto payment
    if (cart.summary.hasNFTs) return 'nft';
    
    // Otherwise default to stripe
    return 'stripe';
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price.toFixed(4)} ${currency}`;
  };

  const currencyTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    cart.items.forEach((item) => {
      const c = item.currency || 'USD';
      const amount = (item.price || 0) * (item.quantity || 1);
      totals[c] = (totals[c] || 0) + amount;
    });
    return totals;
  }, [cart.items]);

  const drawerContent = (
    <Box sx={{ width: 400, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingBag size={24} />
          Shopping Cart
          <Badge badgeContent={cart.totalItems} color="primary" />
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Cart Items */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {cart.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {cart.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {cart.error}
          </Alert>
        )}

        {!cart.loading && !cart.error && cart.items.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ShoppingBag size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
            <Typography variant="body1" color="text.secondary">
              Your cart is empty
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                onClose();
                router.push('/marketplace');
              }}
              sx={{ mt: 2 }}
            >
              Start Shopping
            </Button>
          </Box>
        )}

        {!cart.loading && !cart.error && cart.items.length > 0 && (
          <>
            <List>
              {cart.items.map((item) => (
                <ListItem key={item._id} sx={{ px: 0, py: 1 }}>
                  <ListItemAvatar>
                    <Avatar
                      src={
                        item.productId.images?.[0]?.secure_url || 
                        item.productId.images?.[0]?.url || 
                        '/placeholder-product.png'
                      }
                      alt={item.productId.name}
                      sx={{ width: 60, height: 60 }}
                      variant="rounded"
                    />
                  </ListItemAvatar>
                  <ListItemText
                    sx={{ ml: 2 }}
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" noWrap>
                          {item.productId.name}
                        </Typography>
                        {item.productId.isNFT && (
                          <Chip
                            size="small"
                            label="NFT"
                            color="primary"
                            icon={<Palette size={12} />}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatPrice(item.price, item.currency)}
                        </Typography>
                        {!item.productId.isNFT && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={16} />
                            </IconButton>
                            <TextField
                              size="small"
                              value={item.quantity}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                if (qty >= 1) handleQuantityChange(item._id, qty);
                              }}
                              sx={{ width: 60 }}
                              inputProps={{ min: 1, style: { textAlign: 'center' } }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                            >
                              <Plus size={16} />
                            </IconButton>
                          </Box>
                        )}
                        {item.productId.isNFT && (
                          <Typography variant="caption" color="text.secondary">
                            NFT - Quantity: 1
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveItem(item._id)}
                      color="error"
                      size="small"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Cart Summary */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle1" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Items:</span>
                <span>{cart.totalItems}</span>
              </Typography>
              <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <span>Total Amount:</span>
                <span>
                  {Object.keys(currencyTotals).length <= 1
                    ? formatPrice(cart.summary?.totalPrice || 0)
                    : ''}
                </span>
              </Typography>
              {Object.keys(currencyTotals).length > 1 && (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {Object.entries(currencyTotals).map(([cur, amt]) => (
                    <Typography key={cur} variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{cur} subtotal:</span>
                      <span>{formatPrice(amt, cur)}</span>
                    </Typography>
                  ))}
                </Box>
              )}
              {cart.summary?.hasCryptoItems && (
                <Typography variant="caption" color="text.secondary">
                  * Contains crypto items
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Footer Actions */}
      {!cart.loading && !cart.error && cart.items.length > 0 && (
        <Box sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearCart}
              size="small"
              startIcon={<Trash2 size={16} />}
            >
              Clear Cart
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                onClose();
                router.push('/cart');
              }}
              size="small"
            >
              View Full Cart
            </Button>
          </Box>

          {/* Checkout Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Prevent Stripe when cart contains only NFTs */}
            {(!cart.summary?.hasNFTs || (cart.summary?.hasNFTs && cart.items.some(i => !i.productId.isNFT))) && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleCheckout('stripe')}
                disabled={processingCheckout}
                startIcon={processingCheckout ? <CircularProgress size={16} /> : <CreditCard size={16} />}
              >
                {processingCheckout ? 'Processing...' : 'Checkout with Card'}
              </Button>
            )}
            
            {cart.summary?.hasNFTs && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleCheckout('nft')}
                disabled={processingCheckout}
                startIcon={processingCheckout ? <CircularProgress size={16} /> : <Coins size={16} />}
                sx={{ bgcolor: 'purple.600', '&:hover': { bgcolor: 'purple.700' } }}
              >
                {processingCheckout ? 'Processing...' : 'Checkout with Crypto'}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default CartDrawer;
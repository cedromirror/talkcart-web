import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  TextField,
  Chip,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Truck,
  Shield,
  Gift,
  Percent,
  ArrowRight,
  Wallet,
} from 'lucide-react';

interface ShoppingCartProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  maxQuantity: number;
  image: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isNFT: boolean;
  freeShipping: boolean;
  fastDelivery: boolean;
  discount?: {
    percentage: number;
    originalPrice: number;
  };
}

const ShoppingCartComponent: React.FC<ShoppingCartProps> = ({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPromoInput, setShowPromoInput] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = item.discount ? item.discount.originalPrice : item.price;
    return sum + (itemPrice * item.quantity);
  }, 0);

  const discountAmount = items.reduce((sum, item) => {
    if (item.discount) {
      const discount = (item.discount.originalPrice - item.price) * item.quantity;
      return sum + discount;
    }
    return sum;
  }, 0);

  const shippingCost = items.some(item => !item.freeShipping) ? 9.99 : 0;
  const tax = subtotal * 0.08; // 8% tax
  const promoDiscount = promoApplied ? subtotal * 0.1 : 0; // 10% promo discount
  const total = subtotal - discountAmount - promoDiscount + shippingCost + tax;

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === 'save10') {
      setPromoApplied(true);
      setShowPromoInput(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 450 } }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={getTotalItems()} color="primary">
              <ShoppingCart size={24} />
            </Badge>
            <Typography variant="h6" fontWeight={600}>
              Shopping Cart
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {items.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 3,
              }}
            >
              <ShoppingCart size={64} color="#ccc" />
              <Typography variant="h6" color="text.secondary" mt={2}>
                Your cart is empty
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Add some items to get started
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ p: 2, alignItems: 'flex-start' }}>
                    <ListItemAvatar>
                      <Avatar
                        src={item.image}
                        variant="rounded"
                        sx={{ width: 60, height: 60 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {item.title}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              by {item.seller.name}
                            </Typography>
                            {item.isNFT && (
                              <Chip label="NFT" size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {formatPrice(item.price, item.currency)}
                            </Typography>
                            {item.discount && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ textDecoration: 'line-through' }}
                              >
                                {formatPrice(item.discount.originalPrice, item.currency)}
                              </Typography>
                            )}
                          </Box>
                          
                          <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                            {item.freeShipping && (
                              <Chip
                                icon={<Truck size={10} />}
                                label="Free Ship"
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                            {item.fastDelivery && (
                              <Chip
                                label="Fast"
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                          </Box>

                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={14} />
                            </IconButton>
                            <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.maxQuantity}
                            >
                              <Plus size={14} />
                            </IconButton>
                          </Box>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => onRemoveItem(item.id)}
                        color="error"
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Cart Summary */}
        {items.length > 0 && (
          <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
            {/* Promo Code */}
            <Box mb={2}>
              <Button
                startIcon={<Percent size={16} />}
                onClick={() => setShowPromoInput(!showPromoInput)}
                variant="text"
                size="small"
              >
                {promoApplied ? 'Promo Applied' : 'Add Promo Code'}
              </Button>
              <Collapse in={showPromoInput}>
                <Box display="flex" gap={1} mt={1}>
                  <TextField
                    size="small"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleApplyPromo}
                  >
                    Apply
                  </Button>
                </Box>
              </Collapse>
              {promoApplied && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Promo code "SAVE10" applied! 10% off your order.
                </Alert>
              )}
            </Box>

            {/* Order Summary */}
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Order Summary
                </Typography>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Subtotal ({getTotalItems()} items)</Typography>
                  <Typography variant="body2">{formatPrice(subtotal)}</Typography>
                </Box>
                
                {discountAmount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="success.main">Item Discounts</Typography>
                    <Typography variant="body2" color="success.main">
                      -{formatPrice(discountAmount)}
                    </Typography>
                  </Box>
                )}
                
                {promoApplied && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="success.main">Promo Discount</Typography>
                    <Typography variant="body2" color="success.main">
                      -{formatPrice(promoDiscount)}
                    </Typography>
                  </Box>
                )}
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2">
                    {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </Typography>
                </Box>
                
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Tax</Typography>
                  <Typography variant="body2">{formatPrice(tax)}</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="subtitle1" fontWeight={600}>Total</Typography>
                  <Typography variant="subtitle1" fontWeight={600} color="primary">
                    {formatPrice(total)}
                  </Typography>
                </Box>

                {/* Payment Method */}
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <MenuItem value="card">
                      <Box display="flex" alignItems="center" gap={1}>
                        <CreditCard size={16} />
                        Credit/Debit Card
                      </Box>
                    </MenuItem>
                    <MenuItem value="crypto">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Wallet size={16} />
                        Cryptocurrency
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Security Notice */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Shield size={16} color="#4caf50" />
                  <Typography variant="caption" color="text.secondary">
                    Secure checkout with 256-bit SSL encryption
                  </Typography>
                </Box>

                {/* Checkout Button */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={<ArrowRight size={16} />}
                  onClick={onCheckout}
                  sx={{ fontWeight: 600 }}
                >
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default ShoppingCartComponent;
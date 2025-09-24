import React, { useState } from 'react';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  IconButton,
  TextField,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  CreditCard,
  Coins,
  Palette,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import StripeCartCheckout from '@/components/cart/StripeCartCheckout';
import CryptoCartCheckout from '@/components/cart/CryptoCartCheckout';
import FlutterwaveCartCheckout from '@/components/cart/FlutterwaveCartCheckout';
import { api } from '@/lib/api';

const CartPageComponent: NextPage = () => {
  const { cart, updateCartItem, removeFromCart, clearCart, checkout } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'crypto' | 'nft' | 'mobile_money'>('stripe');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const currencyTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    cart.items.forEach((item) => {
      const c = item.currency || 'USD';
      const amount = (item.price || 0) * (item.quantity || 1);
      totals[c] = (totals[c] || 0) + amount;
    });
    return totals;
  }, [cart.items]);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=' + encodeURIComponent('/cart'));
    }
  }, [isAuthenticated, router]);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(itemId, newQuantity);
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      await clearCart();
    }
  };

  const handleOpenCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const hasNFTs = cart.summary?.hasNFTs;
    const hasRegular = cart.items.some(i => !i.productId.isNFT);

    // Determine default payment method based on cart contents
    if (hasNFTs && !hasRegular) {
      // NFT-only cart, block stripe
      setSelectedPaymentMethod('nft');
    } else {
      setSelectedPaymentMethod('stripe');
    }

    setCheckoutDialogOpen(true);
  };

  const handleCheckout = async () => {
    setProcessingCheckout(true);
    try {
      const result = await checkout(selectedPaymentMethod);
      if (result) {
        setCheckoutDialogOpen(false);
        toast.success(`Order placed successfully! ${result.data?.orderNumber ? `Order #${result.data.orderNumber}` : ''}`);
        router.push('/orders'); // Redirect to orders page
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setProcessingCheckout(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price.toFixed(4)} ${currency}`;
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={() => router.push('/marketplace')}
            variant="outlined"
          >
            Continue Shopping
          </Button>
          <Typography variant="h4" sx={{ flex: 1 }}>
            Shopping Cart
          </Typography>
          {cart.items.length > 0 && (
            <Button
              startIcon={<Trash2 size={20} />}
              onClick={handleClearCart}
              color="error"
              variant="outlined"
            >
              Clear Cart
            </Button>
          )}
        </Box>

        {cart.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {cart.error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {cart.error}
          </Alert>
        )}

        {!cart.loading && !cart.error && cart.items.length === 0 && (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <ShoppingCart size={64} style={{ color: '#ccc', marginBottom: '16px' }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              Your cart is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Add some products to your cart to get started.
            </Typography>
            <Button
              component={Link}
              href="/marketplace"
              variant="contained"
              size="large"
            >
              Browse Marketplace
            </Button>
          </Paper>
        )}

        {!cart.loading && !cart.error && cart.items.length > 0 && (
          <Grid container spacing={4}>
            {/* Cart Items */}
            <Grid item xs={12} lg={8}>
              <Typography variant="h6" gutterBottom>
                Cart Items ({cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'})
              </Typography>

              <List sx={{ bgcolor: 'background.paper' }}>
                {cart.items.map((item, index) => (
                  <React.Fragment key={item._id}>
                    <ListItem sx={{ py: 2, px: 0 }}>
                      <ListItemAvatar>
                        <Avatar
                          src={
                            item.productId.images?.[0]?.secure_url ||
                            item.productId.images?.[0]?.url ||
                            '/placeholder-product.png'
                          }
                          alt={item.productId.name}
                          sx={{ width: 80, height: 80, mr: 2 }}
                          variant="rounded"
                        />
                      </ListItemAvatar>

                      <ListItemText
                        sx={{ ml: 2 }}
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" component={Link} href={`/marketplace/${item.productId._id}`}>
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
                            {item.productId.availability === 'limited' && (
                              <Chip
                                size="small"
                                label="Limited"
                                color="warning"
                                icon={<AlertCircle size={12} />}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {item.productId.description?.slice(0, 100)}
                              {item.productId.description?.length > 100 && '...'}
                            </Typography>

                            <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                              {formatPrice(item.price, item.currency)}
                              {item.quantity > 1 && (
                                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                  × {item.quantity} = {formatPrice(item.price * item.quantity, item.currency)}
                                </Typography>
                              )}
                            </Typography>

                            {!item.productId.isNFT && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                  sx={{ width: 80 }}
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
                                NFT - Unique item, quantity: 1
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
                        >
                          <Trash2 size={20} />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < cart.items.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Grid>

            {/* Order Summary */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>

                <Box sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1">Items ({cart.totalItems}):</Typography>
                    <Typography variant="body1">{formatPrice(cart.totalAmount)}</Typography>
                  </Box>


                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatPrice(cart.totalAmount)}
                  </Typography>
                </Box>


                {cart.summary?.hasNFTs && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Palette size={16} />
                      <span>This cart contains NFTs that require crypto payment</span>
                    </Box>
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleOpenCheckout}
                  disabled={cart.items.length === 0}
                  startIcon={<CreditCard size={20} />}
                >
                  Proceed to Checkout
                </Button>

                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="green" />
                  <Typography variant="caption" color="text.secondary">
                    Secure checkout with SSL encryption
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Checkout Dialog */}
        <Dialog open={checkoutDialogOpen} onClose={() => setCheckoutDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Choose Payment Method</DialogTitle>
          <DialogContent>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Payment Options</FormLabel>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                sx={{ mt: 2 }}
              >
                {!cart.summary?.hasNFTs && (
                  <FormControlLabel
                    value="stripe"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard size={20} />
                        <span>Credit/Debit Card (Stripe)</span>
                      </Box>
                    }
                  />
                )}

                {!cart.summary?.hasNFTs && (
                  <FormControlLabel
                    value="mobile_money"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Coins size={20} />
                        <span>Mobile Money (MTN, Airtel, etc.)</span>
                      </Box>
                    }
                  />
                )}

                {cart.summary?.hasNFTs && (
                  <FormControlLabel
                    value="nft"
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Coins size={20} />
                        <span>Cryptocurrency (Web3 Wallet)</span>
                      </Box>
                    }
                  />
                )}
              </RadioGroup>

              {/* Embedded payment flows */}
              {selectedPaymentMethod === 'stripe' && !cart.summary?.hasNFTs && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Secure Payment</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete your payment for each currency group using your preferred payment method. We accept cards, PayPal, bank transfers, and mobile money where available.
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Supported Payment Methods:</strong> Credit/Debit Cards, PayPal, Apple Pay, Google Pay, Bank Transfers, and Mobile Money (region-dependent).
                      The checkout will automatically show available options for your location.
                    </Typography>
                  </Alert>

                  {/* Multi-currency grouping UI */}
                  {Array.from(
                    new Map(cart.items
                      .filter(i => !i.productId.isNFT)
                      .map(i => [String(i.currency || 'USD').toUpperCase(), null])
                    ).keys()
                  ).map((cur) => (
                    <Box key={cur} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Currency: {cur}
                        {(() => {
                          const rec = (cart as any).payments?.find((p: any) => p.provider === 'stripe' && p.currency === cur);
                          if (rec?.status === 'succeeded') {
                            return <Chip label="Paid" color="success" size="small" sx={{ ml: 1 }} />;
                          }
                          if (rec?.status) {
                            return <Chip label={rec.status} size="small" sx={{ ml: 1 }} />;
                          }
                          return null;
                        })()}
                      </Typography>
                      <StripeCartCheckout
                        custom={{
                          items: cart.items.filter(i => !i.productId.isNFT && String(i.currency || 'USD').toUpperCase() === cur).map(i => ({
                            id: String(i.productId._id || i.productId.id || i._id),
                            name: i.productId.name,
                            price: Number(i.price),
                            quantity: Number(i.quantity || 1),
                          })),
                          currency: cur.toLowerCase(),
                          metadata: { cartId: String((cart as any)._id || ''), currency: cur },
                          idempotencyKey: `cart-${(cart as any)._id || 'noid'}-${cur}-${Date.now()}`,
                        }}
                        onPaid={async (paymentIntentId) => {
                          // Refresh status record for this PaymentIntent ID
                          try { await api.cart.refreshStripePaymentStatus(paymentIntentId); } catch { }
                          // Try finalization only when all currency groups show succeeded
                          const groups = Array.from(new Set(cart.items.filter(i => !i.productId.isNFT).map(i => String(i.currency || 'USD').toUpperCase())));
                          const paid = groups.every(g => (cart as any).payments?.some((p: any) => p.provider === 'stripe' && p.currency === g && p.status === 'succeeded'));
                          const res = await checkout('stripe', { paymentIntentId });
                          if (res) {
                            setCheckoutDialogOpen(false);
                            // Minimal status indicator: show refunds/manual review flags
                            if (res?.refunds?.length) {
                              toast((t) => (
                                <Box>
                                  <Typography variant="subtitle2">Partial refunds submitted</Typography>
                                  {res.refunds.map((r: any, idx: number) => (
                                    <Typography key={idx} variant="caption">{r.currency}: {(r.amountCents / 100).toFixed(2)} {r.status}</Typography>
                                  ))}
                                </Box>
                              ), { duration: 5000 });
                            }
                            if (res?.manualReview) {
                              toast.error('Some items require manual review. Our team will follow up.');
                            }
                            toast.success('Order placed successfully!');
                            router.push('/orders');
                          } else if (!paid) {
                            toast.success(`Paid ${cur} group. Please pay remaining groups.`);
                          }
                        }}
                      />
                    </Box>
                  ))}

                  <Alert severity="info">If your cart contains multiple currencies, complete each group’s payment.</Alert>
                </Box>
              )}

              {selectedPaymentMethod === 'mobile_money' && !cart.summary?.hasNFTs && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Mobile Money Payment</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete your payment using Mobile Money. We support MTN Mobile Money, Airtel Money, Vodacom M-Pesa, and other providers in Uganda, Rwanda, Tanzania, Zambia, Ghana, and more.
                  </Typography>

                  {/* Multi-currency grouping UI for Mobile Money */}
                  {Array.from(
                    new Map(cart.items
                      .filter(i => !i.productId.isNFT)
                      .map(i => [String(i.currency || 'USD').toUpperCase(), null])
                    ).keys()
                  ).map((cur) => (
                    <Box key={cur} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Currency: {cur}
                        {(() => {
                          const rec = (cart as any).payments?.find((p: any) => p.provider === 'flutterwave' && p.currency === cur);
                          if (rec?.status === 'succeeded') {
                            return <Chip label="Paid" color="success" size="small" sx={{ ml: 1 }} />;
                          }
                          if (rec?.status) {
                            return <Chip label={rec.status} size="small" sx={{ ml: 1 }} />;
                          }
                          return null;
                        })()}
                      </Typography>
                      <FlutterwaveCartCheckout
                        custom={{
                          items: cart.items.filter(i => !i.productId.isNFT && String(i.currency || 'USD').toUpperCase() === cur).map(i => ({
                            id: String(i.productId._id || i.productId.id || i._id),
                            name: i.productId.name,
                            price: Number(i.price),
                            quantity: Number(i.quantity || 1),
                          })),
                          currency: cur.toLowerCase(),
                          metadata: { cartId: String((cart as any)._id || ''), currency: cur },
                        }}
                        onPaid={async ({ tx_ref, flw_tx_id, currency }) => {
                          // Try finalization only when all currency groups show succeeded
                          const groups = Array.from(new Set(cart.items.filter(i => !i.productId.isNFT).map(i => String(i.currency || 'USD').toUpperCase())));
                          const paid = groups.every(g => (cart as any).payments?.some((p: any) => p.provider === 'flutterwave' && p.currency === g && p.status === 'succeeded'));
                          const res = await checkout('flutterwave', { tx_ref, flw_tx_id, currency });
                          if (res) {
                            setCheckoutDialogOpen(false);
                            toast.success('Order placed successfully!');
                            router.push('/orders');
                          } else if (!paid) {
                            toast.success(`Paid ${cur} group. Please pay remaining groups.`);
                          }
                        }}
                      />
                    </Box>
                  ))}

                  <Alert severity="info">If your cart contains multiple currencies, complete each group's payment.</Alert>
                </Box>
              )}

              {selectedPaymentMethod !== 'stripe' && selectedPaymentMethod !== 'mobile_money' && cart.summary?.hasNFTs && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Crypto Payment</Typography>
                  <Typography variant="body2" color="text.secondary">Confirm a crypto transaction from your wallet. We will verify it on-chain.</Typography>
                  <CryptoCartCheckout onPaid={async ({ txHash, walletAddress, networkId }) => {
                    await checkout('nft', { txHash, walletAddress, networkId });
                    setCheckoutDialogOpen(false);
                    toast.success('Order placed successfully!');
                    router.push('/orders');
                  }} />
                </Box>
              )}

              {cart.summary?.hasNFTs && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  NFT items require cryptocurrency payment through your Web3 wallet.
                </Alert>
              )}
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCheckoutDialogOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

const CartPage = dynamic(() => Promise.resolve(CartPageComponent), { ssr: false });

export default CartPage;
import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { api } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface FlutterwaveCustomArgs {
  items?: { id?: string; name?: string; price?: number; quantity?: number; metadata?: Record<string,string> }[];
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

interface FlutterwaveCartCheckoutProps {
  onPaid: (details: { tx_ref: string; flw_tx_id: string | number; currency?: string }) => Promise<void> | void;
  custom?: FlutterwaveCustomArgs;
}

const FlutterwaveCartCheckout: React.FC<FlutterwaveCartCheckoutProps> = ({ onPaid, custom }) => {
  const { cart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total amount and prepare payment config
  const getPaymentConfig = () => {
    let totalAmount = 0;
    let currency = 'USD';
    let items: any[] = [];

    if (custom) {
      // Use custom configuration
      totalAmount = custom.amount || 0;
      currency = custom.currency || 'USD';
      items = custom.items || [];
    } else {
      // Calculate from cart items (non-NFT only)
      const cartItems = cart.items.filter(i => !i.productId.isNFT);
      cartItems.forEach(item => {
        const amount = (item.price || 0) * (item.quantity || 1);
        totalAmount += amount;
        currency = String(item.currency || 'USD').toUpperCase();

        items.push({
          id: String(item.productId._id || item.productId.id || item._id),
          name: item.productId.name,
          price: Number(item.price),
          quantity: Number(item.quantity || 1),
        });
      });
    }

    return {
      amount: totalAmount,
      currency,
      items,
      metadata: custom?.metadata || { cartId: String((cart as any)._id || ''), currency }
    };
  };

  const config = getPaymentConfig();

  const flutterwaveConfig = {
    public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || '',
    tx_ref: `talkcart-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
    amount: config.amount,
    currency: config.currency,
    payment_options: 'mobilemoneyuganda,mobilemoneyrwanda,mobilemoneytanzania,mobilemoneyzambia,mobilemoneyghana,card',
    customer: {
      email: user?.email || '',
      name: user?.name || user?.username || '',
      phone_number: user?.phone || '',
    },
    customizations: {
      title: 'TalkCart Payment',
      description: `Payment for ${config.items.length} item${config.items.length !== 1 ? 's' : ''}`,
      logo: '/favicon.svg',
    },
    meta: config.metadata,
  };

  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const handlePay = async () => {
    if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY) {
      setError('Flutterwave not configured. Please set NEXT_PUBLIC_FLW_PUBLIC_KEY.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize Flutterwave on server for the cart currency group
      try {
        await api.cart.initFlutterwaveForCurrency(String(config.currency), {
          tx_ref: flutterwaveConfig.tx_ref,
          customer: {
            email: flutterwaveConfig.customer.email,
            name: flutterwaveConfig.customer.name,
            phonenumber: flutterwaveConfig.customer.phone_number,
          },
          meta: config.metadata,
        });
      } catch (e) {
        console.warn('Server-side Flutterwave init failed or not required:', (e as any)?.message || e);
      }

      // Open Flutterwave payment modal
      handleFlutterwavePayment({
        callback: async (response: any) => {
          console.log('Flutterwave payment response:', response);

          if (response.status === 'successful') {
            // Persist/refresh status in cart then notify parent
            try {
              await api.cart.refreshFlutterwavePaymentStatus({
                tx_ref: String(response.tx_ref || flutterwaveConfig.tx_ref),
                flw_tx_id: String(response.transaction_id || response.id),
                currency: String(config.currency).toUpperCase(),
              });
            } catch {}
            await onPaid({
              tx_ref: String(response.tx_ref || flutterwaveConfig.tx_ref),
              flw_tx_id: String(response.transaction_id || response.id),
              currency: String(config.currency).toUpperCase(),
            });
            closePaymentModal();
          } else {
            // Payment failed or was cancelled
            setError('Payment was not completed. Please try again.');
          }
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (e: any) {
      console.error('Flutterwave payment error:', e);
      setError(e?.message || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY) {
    return <Alert severity="info">Flutterwave key missing. Set NEXT_PUBLIC_FLW_PUBLIC_KEY.</Alert>;
  }

  if (config.amount <= 0) {
    return <Alert severity="warning">Invalid payment amount.</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Mobile Money Payment</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pay securely using Mobile Money (MTN, Airtel, etc.) or cards. Supported in Uganda, Rwanda, Tanzania, Zambia, Ghana, and more.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Supported Mobile Money Providers:</strong> MTN Mobile Money, Airtel Money, Vodacom M-Pesa, Tigo Pesa, and others.
          Select "Mobile Money" as payment option in the checkout.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box>
          <Typography variant="subtitle2">Total Amount</Typography>
          <Typography variant="h6" color="primary">
            {config.currency} {config.amount.toFixed(2)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          disabled={loading}
          onClick={handlePay}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={20} /> : 'Pay with Mobile Money'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
};

export default FlutterwaveCartCheckout;
import React, { useEffect, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { api } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { StripeElementsWrapper } from '@/contexts/StripeContext';

interface StripeCustomArgs {
  items?: { id?: string; name?: string; price?: number; quantity?: number; metadata?: Record<string,string> }[];
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

interface InnerProps {
  onPaid: (paymentIntentId: string) => Promise<void> | void;
  clientSecret: string;
  custom?: StripeCustomArgs; // if provided, use payments.intent instead of cart subtotal
}

const Inner: React.FC<InnerProps> = ({ onPaid, clientSecret, custom }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const result = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (result.error) throw result.error;
      if (result.paymentIntent?.status === 'succeeded') {
        // Optionally refresh currency-intent record on server when using cart-based flows
        try {
          if (!custom && result.paymentIntent?.id) {
            await api.cart.refreshStripePaymentStatus(result.paymentIntent.id);
          }
        } catch {}
        await onPaid(result.paymentIntent.id);
      }
    } catch (e: any) {
      setError(e?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" disabled={!stripe || loading} onClick={handlePay}>
        {loading ? 'Processing…' : 'Pay'}
      </Button>
    </Stack>
  );
};

interface StripeCartCheckoutProps {
  onPaid: (paymentIntentId: string) => Promise<void> | void;
  custom?: StripeCustomArgs;
}

const StripeCartCheckout: React.FC<StripeCartCheckoutProps> = ({ onPaid, custom }) => {
  const { cart } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        let res: any;
        if (custom) {
          res = await api.payments.createIntent(custom);
        } else {
          // Prefer validated server-side currency intent if cart has a single currency; fallback otherwise
          const currencies = Array.from(new Set(cart.items.filter(i => !i.productId.isNFT).map(i => String(i.currency || 'USD').toLowerCase())));
          if (currencies.length === 1) {
            res = await api.cart.createCartCurrencyIntent(currencies[0]);
          } else {
            res = await api.cart.createCartPaymentIntent();
          }
        }
        if (!res?.success) throw new Error(res?.message || 'Failed to create PaymentIntent');
        setClientSecret(res.data.clientSecret);
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize payment');
      }
    })();
  }, [custom ? JSON.stringify(custom) : cart.lastUpdated]);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <Alert severity="info">Stripe key missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</Alert>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!clientSecret) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={18} />
        <Typography>Preparing Stripe checkout…</Typography>
      </Box>
    );
  }

  return (
    <StripeElementsWrapper clientSecret={clientSecret}>
      <Inner onPaid={onPaid} clientSecret={clientSecret} custom={custom} />
    </StripeElementsWrapper>
  );
};

export default StripeCartCheckout;
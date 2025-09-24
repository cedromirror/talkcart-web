import React, { useEffect, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { API_URL } from '@/config';
import { StripeElementsWrapper } from '@/contexts/StripeContext';

interface InnerProps {
  amountCents: number; // Stripe expects cents
  currency: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntentId: string) => void;
  clientSecret: string;
}

const CheckoutInner: React.FC<InnerProps> = ({ amountCents, currency, metadata, onSuccess, clientSecret }) => {
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
        onSuccess?.(result.paymentIntent.id);
      } else if (result.paymentIntent?.status === 'requires_action') {
        // Handled by confirmPayment if needed
      }
    } catch (e: any) {
      setError(e?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <PaymentElement />
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" disabled={!stripe || loading} onClick={handlePay}>
        {loading ? 'Processing…' : 'Pay'}
      </Button>
    </Stack>
  );
};

interface StripeCheckoutProps {
  amountCents: number; // Stripe expects cents
  currency: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntentId: string) => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const res = await fetch(`${API_URL}/payments/intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
          },
          body: JSON.stringify({ amount: props.amountCents, currency: props.currency, metadata: props.metadata }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.error || 'Failed to create PaymentIntent');
        setClientSecret(data.data.clientSecret);
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize payment');
      }
    })();
  }, [props.amountCents, props.currency, JSON.stringify(props.metadata)]);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <Alert severity="info">Stripe publishable key not set. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</Alert>;
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
      <CheckoutInner {...props} clientSecret={clientSecret} />
    </StripeElementsWrapper>
  );
};

export default StripeCheckout;
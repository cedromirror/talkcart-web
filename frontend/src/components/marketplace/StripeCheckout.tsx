import React, { useEffect, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { API_URL } from '@/config';
import { StripeElementsWrapper } from '@/contexts/StripeContext';

interface InnerProps {
  amountCents: number; // Stripe expects cents
  currency: string;
  metadata?: Record<string, string>;
  onSuccess?: (paymentIntentId: string) => void;
}

const CheckoutInner: React.FC<InnerProps> = ({ amountCents, currency, metadata, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          body: JSON.stringify({ amount: amountCents, currency, metadata }),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.error || 'Failed to create PaymentIntent');
        setClientSecret(data.data.clientSecret);
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize payment');
      }
    })();
  }, [amountCents, currency, JSON.stringify(metadata)]);

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

  if (!clientSecret) {
    return error ? <Alert severity="error">{error}</Alert> : <Typography>Preparing Stripe checkout…</Typography>;
  }

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

interface StripeCheckoutProps extends InnerProps {}

const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <Alert severity="info">Stripe publishable key not set. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</Alert>;
  }
  return (
    <StripeElementsWrapper>
      <CheckoutInner {...props} />
    </StripeElementsWrapper>
  );
};

export default StripeCheckout;
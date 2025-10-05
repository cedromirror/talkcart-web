import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount } from '@/utils/currencyConverter';

interface FlutterwaveProductCheckoutProps {
  product: any;
  onCompleted: (details: { tx_ref: string; flw_tx_id: string | number; currency?: string }) => Promise<void> | void;
  onError: (error: string) => void;
}

const FlutterwaveProductCheckout: React.FC<FlutterwaveProductCheckoutProps> = ({ 
  product, 
  onCompleted,
  onError
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique transaction reference
  const tx_ref = `talkcart-product-${product._id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

  const flutterwaveConfig = {
    public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || '',
    tx_ref,
    amount: product.price,
    currency: product.currency?.toUpperCase() || 'USD',
    payment_options: 'mobilemoneyuganda,mobilemoneyrwanda,mobilemoneytanzania,mobilemoneyzambia,mobilemoneyghana,card,banktransfer',
    customer: {
      email: user?.email || '',
      name: user?.displayName || user?.username || '',
      phone_number: '', // User type doesn't have a phone property
    },
    customizations: {
      title: 'TalkCart Product Payment',
      description: `Payment for ${product.name}`,
      logo: '/favicon.svg',
    },
    meta: {
      productId: product._id,
      productName: product.name,
      currency: product.currency?.toUpperCase() || 'USD',
    },
  };

  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  const handlePay = async () => {
    // Check if Flutterwave is properly configured
    if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY.includes('XXXXXXXX')) {
      const configError = 'Flutterwave is not properly configured. Please contact the administrator to set up payment processing.';
      setError(configError);
      onError(configError);
      return;
    }

    if (!user?.email) {
      const emailError = 'Email address is required for payment processing. Please update your profile.';
      setError(emailError);
      onError(emailError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Open Flutterwave payment modal
      handleFlutterwavePayment({
        callback: async (response: any) => {
          console.log('Flutterwave payment response:', response);

          // Check if there's an error in the response
          if (response.status === 'error') {
            const errorMessage = response.message || 'Payment processing failed. Please try again or contact support.';
            setError(errorMessage);
            onError(errorMessage);
            setLoading(false);
            return;
          }

          if (response.status === 'successful') {
            // Payment successful, notify parent component
            await onCompleted({
              tx_ref: String(response.tx_ref || tx_ref),
              flw_tx_id: String(response.transaction_id || response.id),
              currency: String(product.currency).toUpperCase(),
            });
            closePaymentModal();
          } else {
            // Payment failed or was cancelled
            const errorMessage = `Payment was not completed. ${response?.message ? `Reason: ${response.message}` : 'Please try again.'}`;
            setError(errorMessage);
            onError(errorMessage);
          }
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (e: any) {
      console.error('Flutterwave payment error:', e);
      const errorMessage = e?.message || 'Failed to initialize payment. Please try again.';
      setError(errorMessage);
      onError(errorMessage);
      setLoading(false);
    }
  };

  // Check configuration on component mount
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY.includes('XXXXXXXX')) {
      setError('Flutterwave payment system is not properly configured. Please contact the administrator.');
    }
  }, []);

  if (!process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY.includes('XXXXXXXX')) {
    return (
      <Alert severity="warning">
        <Typography variant="body2">
          Flutterwave payment system is not properly configured. Please contact the administrator to set up payment processing.
        </Typography>
        <Typography variant="caption" component="div" sx={{ mt: 1 }}>
          Developers: Set NEXT_PUBLIC_FLW_PUBLIC_KEY in your .env file with a valid Flutterwave public key.
        </Typography>
      </Alert>
    );
  }

  if (product.price <= 0) {
    return <Alert severity="warning">Invalid payment amount.</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Payment Options</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Pay securely using Mobile Money or Bank Transfer.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box>
          <Typography variant="subtitle2">Total Amount</Typography>
          <Typography variant="h6" color="primary">
            {formatCurrencyAmount(product.price, product.currency)}
          </Typography>
        </Box>
        <Button
          variant="contained"
          disabled={loading || !!error}
          onClick={handlePay}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={20} /> : 'Pay Now'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
};

export default FlutterwaveProductCheckout;
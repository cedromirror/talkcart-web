import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel, 
  Alert, 
  CircularProgress,
  useTheme
} from '@mui/material';
import { CreditCard, Wallet, Zap } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Context';
import { formatCurrencyAmount } from '@/utils/currencyConverter';
import FlutterwaveProductCheckout from './FlutterwaveProductCheckout';

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
  onPurchase: (paymentMethod: 'crypto' | 'nft' | 'flutterwave', paymentDetails?: any) => Promise<void>;
  purchasing: boolean;
}

const BuyModal: React.FC<BuyModalProps> = ({ open, onClose, product, onPurchase, purchasing }) => {
  const theme = useTheme();
  const { connected, account } = useWeb3();
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'nft' | 'flutterwave'>('flutterwave');
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    try {
      setError(null);
      
      // For NFTs, we need wallet connection
      if (product.isNFT) {
        if (!connected) {
          setError('Please connect your wallet to buy NFTs');
          return;
        }
        await onPurchase('nft');
      } else {
        // For regular products, use the selected payment method
        if (paymentMethod === 'flutterwave') {
          // For Flutterwave, we need to initialize the payment and process it
          setProcessing(true);
          await processFlutterwavePayment();
        } else {
          // For other payment methods, proceed directly
          await onPurchase(paymentMethod);
        }
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to process purchase. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const processFlutterwavePayment = async () => {
    try {
      // Set the payment data to trigger the Flutterwave checkout component
      setPaymentData({
        productId: product._id,
        product: product,
        paymentMethod: 'flutterwave'
      });
    } catch (err: any) {
      console.error('Flutterwave payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    }
  };

  const handleFlutterwaveCompleted = async (paymentDetails: any) => {
    try {
      // For Flutterwave, we need to pass the payment details to complete the purchase
      await onPurchase('flutterwave', paymentDetails);
      // Close the modal
      onClose();
    } catch (err: any) {
      console.error('Flutterwave completion error:', err);
      const errorMessage = err.message || 'Failed to complete payment. Please try again.';
      setError(errorMessage);
    } finally {
      setPaymentData(null);
    }
  };

  const handleFlutterwaveError = (error: string) => {
    setError(error);
    setPaymentData(null);
  };

  // If we're processing a payment, show the appropriate checkout component
  if (paymentData) {
    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus  // Prevents focus trapping issues
        hideBackdrop={false}  // Ensure backdrop is properly handled
      >
        <DialogContent>
          <FlutterwaveProductCheckout
            product={paymentData.product}
            onCompleted={handleFlutterwaveCompleted}
            onError={handleFlutterwaveError}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus  // Prevents focus trapping issues
      hideBackdrop={false}  // Ensure backdrop is properly handled
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          Complete Your Purchase
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {product.images && product.images.length > 0 && (
            <Box
              component="img"
              src={
                typeof product.images[0] === 'string' 
                  ? product.images[0] 
                  : product.images[0]?.secure_url || product.images[0]?.url
              }
              alt={product.name}
              sx={{ 
                width: 60, 
                height: 60, 
                objectFit: 'contain',
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`
              }}
            />
          )}
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCurrencyAmount(product.price, product.currency)}
            </Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Method
          </FormLabel>
          <RadioGroup
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'crypto' | 'nft' | 'flutterwave')}
          >
            {!product.isNFT && (
              <>
                <FormControlLabel
                  value="flutterwave"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard size={20} />
                      <span>Card Payment (Flutterwave)</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="crypto"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Zap size={20} />
                      <span>Cryptocurrency</span>
                    </Box>
                  }
                />
              </>
            )}
            {product.isNFT && (
              <FormControlLabel
                value="nft"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Wallet size={20} />
                    <span>Wallet Payment</span>
                  </Box>
                }
              />
            )}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={processing}>
          Cancel
        </Button>
        <Button
          onClick={handlePurchase}
          variant="contained"
          disabled={processing || purchasing}
          startIcon={(processing || purchasing) ? <CircularProgress size={20} /> : null}
        >
          {(processing || purchasing) ? 'Processing...' : 'Purchase Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuyModal;
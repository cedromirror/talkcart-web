import React from 'react';
import { Box, Card, CardContent, Typography, Alert, Button, Chip } from '@mui/material';
import { useStripe as useStripeContext } from '@/contexts/StripeContext';

const StripeTest: React.FC = () => {
  const { stripe, isLoading, error, retry } = useStripeContext();

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Stripe Integration Test
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuration Status
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Publishable Key:</Typography>
              <Chip 
                label={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Configured' : 'Missing'} 
                color={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'success' : 'error'}
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Key Format:</Typography>
              <Chip 
                label={
                  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') 
                    ? 'Valid' 
                    : 'Invalid'
                } 
                color={
                  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') 
                    ? 'success' 
                    : 'error'
                }
                size="small"
              />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Environment:</Typography>
              <Chip 
                label={
                  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('test') 
                    ? 'Test Mode' 
                    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('live')
                    ? 'Live Mode'
                    : 'Unknown'
                } 
                color={
                  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('test') 
                    ? 'warning' 
                    : 'info'
                }
                size="small"
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Stripe.js Status
          </Typography>
          
          {isLoading && (
            <Alert severity="info">
              Loading Stripe.js...
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={retry}>
                Retry
              </Button>
            }>
              {error}
            </Alert>
          )}
          
          {!isLoading && !error && stripe && (
            <Alert severity="success">
              Stripe.js loaded successfully! Ready for payments.
            </Alert>
          )}
          
          {!isLoading && !error && !stripe && (
            <Alert severity="warning">
              Stripe.js is not available. Payments are disabled.
            </Alert>
          )}
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          
          <Box sx={{ 
            backgroundColor: '#f5f5f5', 
            p: 2, 
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}>
            <div>isLoading: {isLoading.toString()}</div>
            <div>error: {error || 'null'}</div>
            <div>stripe: {stripe ? 'Stripe instance loaded' : 'null'}</div>
            <div>publishableKey: {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
              `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...` : 
              'undefined'
            }</div>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StripeTest;
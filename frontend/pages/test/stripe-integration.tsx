import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import StripeTest from '@/components/debug/StripeTest';

const StripeIntegrationTest: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Stripe Integration Test
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page tests the Stripe.js integration and configuration
        </Typography>
      </Box>
      
      <StripeTest />
    </Container>
  );
};

export default StripeIntegrationTest;
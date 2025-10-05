import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { WalletSettings } from '@/components/settings/WalletSettings';

const WalletSettingsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Wallet Settings
        </Typography>
        
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <WalletSettings />
        </Paper>
      </Container>
    </Layout>
  );
};

export default WalletSettingsPage;
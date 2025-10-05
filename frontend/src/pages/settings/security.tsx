import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { SecuritySettings } from '@/components/settings/SecuritySettings';

const SecuritySettingsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Security Settings
        </Typography>
        
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <SecuritySettings />
        </Paper>
      </Container>
    </Layout>
  );
};

export default SecuritySettingsPage;
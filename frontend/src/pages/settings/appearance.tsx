import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';

const AppearanceSettingsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Appearance Settings
        </Typography>
        
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <AppearanceSettings />
        </Paper>
      </Container>
    </Layout>
  );
};

export default AppearanceSettingsPage;
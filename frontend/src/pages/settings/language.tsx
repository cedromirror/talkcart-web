import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { LanguageSettings } from '@/components/settings/LanguageSettings';

const LanguageSettingsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Language Settings
        </Typography>
        
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
          <LanguageSettings />
        </Paper>
      </Container>
    </Layout>
  );
};

export default LanguageSettingsPage;
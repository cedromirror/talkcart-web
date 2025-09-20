import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Typography, Container } from '@mui/material';
import Layout from '@/components/layout/Layout';

const HelpPage: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Help & Support | TalkCart</title>
      </Head>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Help & Support
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Help and support functionality coming soon...
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};

export default HelpPage;
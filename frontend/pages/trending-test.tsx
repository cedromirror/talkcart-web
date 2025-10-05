import React from 'react';
import { Container, Typography } from '@mui/material';
import Layout from '@/components/layout/Layout';

const TrendingTestPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md">
        <Typography variant="h4" align="center" sx={{ mt: 4 }}>
          Trending Test Page
        </Typography>
        <Typography variant="body1" align="center" sx={{ mt: 2 }}>
          This page is under development.
        </Typography>
      </Container>
    </Layout>
  );
};

export default TrendingTestPage;
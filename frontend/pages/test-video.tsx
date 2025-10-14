import React from 'react';
import TestVideoPost from '@/components/social/new/TestVideoPost';
import { Box } from '@mui/material';

const TestVideoPage: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <TestVideoPost />
    </Box>
  );
};

export default TestVideoPage;
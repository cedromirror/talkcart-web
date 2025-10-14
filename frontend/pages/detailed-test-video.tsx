import React from 'react';
import DetailedTestVideoPost from '@/components/social/new/DetailedTestVideoPost';
import { Box } from '@mui/material';

const DetailedTestVideoPage: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <DetailedTestVideoPost />
    </Box>
  );
};

export default DetailedTestVideoPage;
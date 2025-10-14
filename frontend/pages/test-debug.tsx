import React from 'react';
import TestWithDebugMessages from '@/components/social/new/TestWithDebugMessages';
import { Box } from '@mui/material';

const TestDebugPage: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <TestWithDebugMessages />
    </Box>
  );
};

export default TestDebugPage;
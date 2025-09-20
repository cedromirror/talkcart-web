import React, { ReactNode } from 'react';
import { Box, useTheme } from '@mui/material';

interface ThemeAwareFeedWrapperProps {
  children: ReactNode;
}

export const ThemeAwareFeedWrapper: React.FC<ThemeAwareFeedWrapperProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {children}
    </Box>
  );
};
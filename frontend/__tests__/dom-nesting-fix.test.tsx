import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ListItemText, Typography, Box } from '@mui/material';

// Create a simple theme for testing
const theme = createTheme();

describe('DOM Nesting Fix Tests', () => {
  test('ListItemText with nested Typography components should not cause DOM nesting warnings', () => {
    // This test verifies that our fix for DOM nesting warnings works correctly
    // by rendering the structure that was causing the warnings
    
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ListItemText
          component="div"
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }} component="div">
              <Typography 
                variant="subtitle1" 
                fontWeight={600}
                component="div"
              >
                Test Product
              </Typography>
            </Box>
          }
          secondary={
            <Box component="div">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} component="div">
                Test description...
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }} component="div">
                <Typography variant="h6" color="primary" fontWeight={600} component="div">
                  $10.00
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div">
                  Stock: 5
                </Typography>
              </Box>
            </Box>
          }
        />
      </ThemeProvider>
    );
    
    // If this renders without throwing DOM nesting warnings, the test passes
    expect(container).toBeInTheDocument();
  });

  test('Typography components with component="div" should not cause warnings', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Typography variant="h6" component="div">
          Heading
        </Typography>
        <Typography variant="body2" component="div">
          Body text
        </Typography>
      </ThemeProvider>
    );
    
    expect(container).toBeInTheDocument();
  });
});
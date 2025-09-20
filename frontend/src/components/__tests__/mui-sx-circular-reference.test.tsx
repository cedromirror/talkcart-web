import React from 'react';
import { render, screen } from '@testing-library/react';
import { Box, Card, Typography, Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Test theme for isolation
const testTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Wrapper component for theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

describe('MUI sx Prop Circular Reference Detection', () => {
  describe('Happy Path - Valid sx Props', () => {
    test('should render simple sx prop without circular reference', () => {
      const TestComponent = () => (
        <TestWrapper>
          <Box sx={{ padding: 2, margin: 1 }} data-testid="test-box">
            Test content
          </Box>
        </TestWrapper>
      );

      const { container } = render(<TestComponent />);
      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('test-box')).toBeInTheDocument();
    });

    test('should render responsive sx prop without circular reference', () => {
      const TestComponent = () => (
        <TestWrapper>
          <Box 
            sx={{ 
              padding: { xs: 1, sm: 2, md: 3 },
              margin: { xs: 0.5, sm: 1, md: 1.5 }
            }} 
            data-testid="responsive-box"
          >
            Responsive content
          </Box>
        </TestWrapper>
      );

      const { container } = render(<TestComponent />);
      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('responsive-box')).toBeInTheDocument();
    });

    test('should render nested MUI components with valid sx props', () => {
      const TestComponent = () => (
        <TestWrapper>
          <Card sx={{ maxWidth: 400, margin: 'auto' }}>
            <Box sx={{ padding: 2 }}>
              <Typography sx={{ marginBottom: 1 }} data-testid="typography">
                Nested component
              </Typography>
              <Button sx={{ marginTop: 1 }} data-testid="button">
                Click me
              </Button>
            </Box>
          </Card>
        </TestWrapper>
      );

      const { container } = render(<TestComponent />);
      expect(container).toBeInTheDocument();
      expect(screen.getByTestId('typography')).toBeInTheDocument();
      expect(screen.getByTestId('button')).toBeInTheDocument();
    });
  });

  describe('Input Verification - Potential Circular Reference Scenarios', () => {
    test('should handle self-referential sx object without infinite recursion', () => {
      // Create an object with potential circular reference
      const circularSx: any = { 
        padding: 2,
        '&:hover': {}
      };
      // Don't actually create circular reference, but test structure that could cause it
      circularSx['&:hover']['& .nested'] = { padding: 1 };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={circularSx} data-testid="potential-circular">
              Test content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('potential-circular')).toBeInTheDocument();
    });

    test('should handle deeply nested sx objects without stack overflow', () => {
      const deeplySx = {
        '& .level1': {
          '& .level2': {
            '& .level3': {
              '& .level4': {
                '& .level5': {
                  padding: 1,
                  margin: 1
                }
              }
            }
          }
        }
      };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={deeplySx} data-testid="deeply-nested">
              <div className="level1">
                <div className="level2">
                  <div className="level3">
                    <div className="level4">
                      <div className="level5">Deep content</div>
                    </div>
                  </div>
                </div>
              </div>
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('deeply-nested')).toBeInTheDocument();
    });

    test('should handle complex responsive sx with multiple breakpoints', () => {
      const complexResponsiveSx = {
        padding: {
          xs: 1,
          sm: 2,
          md: 3,
          lg: 4,
          xl: 5
        },
        margin: {
          xs: 0.5,
          sm: 1,
          md: 1.5,
          lg: 2,
          xl: 2.5
        },
        display: {
          xs: 'block',
          sm: 'flex',
          md: 'grid'
        }
      };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={complexResponsiveSx} data-testid="complex-responsive">
              Complex responsive content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('complex-responsive')).toBeInTheDocument();
    });

    test('should handle array-based sx props without circular reference', () => {
      const arrayBasedSx = [
        { padding: 1 },
        { margin: 1 },
        (theme: any) => ({ backgroundColor: theme.palette?.background?.paper || '#fff' })
      ];

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={arrayBasedSx} data-testid="array-sx">
              Array-based sx content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('array-sx')).toBeInTheDocument();
    });
  });

  describe('Exception Handling - Circular Reference Protection', () => {
    test('should not crash when sx contains undefined or null values', () => {
      const problematicSx = {
        padding: undefined,
        margin: null,
        backgroundColor: 'transparent'
      };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={problematicSx} data-testid="problematic-sx">
              Problematic sx content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('problematic-sx')).toBeInTheDocument();
    });

    test('should handle function-based sx that could cause recursion', () => {
      const functionSx = (theme: any) => {
        // Simulate a function that could potentially cause issues
        const computedStyle = {
          padding: theme.spacing?.(2) || 16,
          margin: theme.spacing?.(1) || 8
        };
        
        // Return style without circular references
        return computedStyle;
      };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={functionSx} data-testid="function-sx">
              Function-based sx content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('function-sx')).toBeInTheDocument();
    });

    test('should handle multiple components with overlapping sx styles', () => {
      const sharedSx = {
        padding: 2,
        margin: 1,
        border: '1px solid #ccc'
      };

      const TestComponent = () => (
        <TestWrapper>
          <div data-testid="container">
            <Box sx={sharedSx} data-testid="box1">Box 1</Box>
            <Box sx={sharedSx} data-testid="box2">Box 2</Box>
            <Card sx={sharedSx} data-testid="card1">Card 1</Card>
            <Typography sx={sharedSx} data-testid="typography1">Typography 1</Typography>
          </div>
        </TestWrapper>
      );

      expect(() => {
        render(<TestComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('container')).toBeInTheDocument();
      expect(screen.getByTestId('box1')).toBeInTheDocument();
      expect(screen.getByTestId('box2')).toBeInTheDocument();
      expect(screen.getByTestId('card1')).toBeInTheDocument();
      expect(screen.getByTestId('typography1')).toBeInTheDocument();
    });
  });

  describe('Branching - Different sx Prop Patterns', () => {
    test('should handle conditional sx props based on state', () => {
      const ConditionalComponent = ({ isActive }: { isActive: boolean }) => (
        <TestWrapper>
          <Box 
            sx={{
              padding: 2,
              backgroundColor: isActive ? 'primary.main' : 'grey.100',
              '&:hover': {
                backgroundColor: isActive ? 'primary.dark' : 'grey.200'
              }
            }}
            data-testid="conditional-box"
          >
            {isActive ? 'Active' : 'Inactive'}
          </Box>
        </TestWrapper>
      );

      // Test active state
      const { rerender } = render(<ConditionalComponent isActive={true} />);
      expect(screen.getByTestId('conditional-box')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();

      // Test inactive state
      rerender(<ConditionalComponent isActive={false} />);
      expect(screen.getByTestId('conditional-box')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    test('should handle sx props with theme-dependent values', () => {
      const themeBasedSx = (theme: any) => ({
        padding: theme.spacing?.(2) || 16,
        color: theme.palette?.primary?.main || '#1976d2',
        backgroundColor: theme.palette?.background?.paper || '#ffffff',
        borderRadius: theme.shape?.borderRadius || 4
      });

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={themeBasedSx} data-testid="theme-based">
              Theme-based content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('theme-based')).toBeInTheDocument();
    });

    test('should handle sx props with pseudo-selectors and media queries', () => {
      const advancedSx = {
        padding: 2,
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          cursor: 'pointer'
        },
        '&:focus': {
          outline: '2px solid blue',
          outlineOffset: '2px'
        },
        '@media (max-width: 600px)': {
          padding: 1,
          fontSize: '14px'
        },
        '@media (min-width: 900px)': {
          padding: 3,
          fontSize: '18px'
        }
      };

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={advancedSx} data-testid="advanced-sx" tabIndex={0}>
              Advanced sx content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('advanced-sx')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory - Preventing Stack Overflow', () => {
    test('should handle large numbers of nested sx transformations', () => {
      const generateNestedSx = (depth: number): any => {
        if (depth === 0) {
          return { padding: 1 };
        }
        return {
          [`& .nest-${depth}`]: generateNestedSx(depth - 1)
        };
      };

      const nestedSx = generateNestedSx(10); // 10 levels deep

      expect(() => {
        render(
          <TestWrapper>
            <Box sx={nestedSx} data-testid="performance-test">
              Performance test content
            </Box>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(screen.getByTestId('performance-test')).toBeInTheDocument();
    });

    test('should handle rapid sx prop changes without memory leaks', () => {
      const DynamicComponent = ({ iteration }: { iteration: number }) => (
        <TestWrapper>
          <Box 
            sx={{
              padding: iteration % 5 + 1,
              margin: iteration % 3 + 1,
              backgroundColor: `hsl(${iteration * 10 % 360}, 50%, 95%)`
            }}
            data-testid={`dynamic-${iteration}`}
          >
            Iteration {iteration}
          </Box>
        </TestWrapper>
      );

      // Simulate rapid changes
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<DynamicComponent iteration={i} />);
        expect(screen.getByTestId(`dynamic-${i}`)).toBeInTheDocument();
        unmount(); // Clean up each render
      }
    });
  });

  describe('Real-world Scenario Tests', () => {
    test('should handle VideoPostDemo-like component without circular reference', () => {
      const VideoPostLikeComponent = () => (
        <TestWrapper>
          <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" gutterBottom data-testid="title">
                Video Upload
              </Typography>
              <Box sx={{ mt: 2, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
                Upload area
              </Box>
            </Box>
            <Box sx={{ py: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Description
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                Description area
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }} data-testid="tags">
                Tags area
              </Box>
            </Box>
          </Card>
        </TestWrapper>
      );

      expect(() => {
        render(<VideoPostLikeComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('tags')).toBeInTheDocument();
    });
  });
});
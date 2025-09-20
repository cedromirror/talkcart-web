import React from 'react';
import { render, screen } from '@testing-library/react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a test theme that matches potential problematic configurations
const problematicTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  spacing: (factor: number) => `${factor * 8}px`,
  palette: {
    primary: {
      main: '#1976d2',
    },
    background: {
      paper: '#ffffff',
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={problematicTheme}>
    {children}
  </ThemeProvider>
);

describe('MUI Stack Overflow Prevention Tests', () => {
  // Set up error boundary to catch potential stack overflow errors
  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return <div data-testid="error-boundary">Something went wrong: {this.state.error?.message}</div>;
      }

      return this.props.children;
    }
  }

  describe('Happy Path - Safe sx Usage', () => {
    test('should render complex nested sx without stack overflow', () => {
      const ComplexComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Card sx={{ maxWidth: 400, margin: 'auto', mt: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography 
                  sx={{ 
                    mb: 2,
                    color: 'primary.main',
                    fontSize: { xs: '1rem', sm: '1.2rem' }
                  }}
                  data-testid="complex-typography"
                >
                  Complex Component
                </Typography>
                <Box 
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    '& > *': {
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }
                  }}
                  data-testid="complex-box"
                >
                  <div>Item 1</div>
                  <div>Item 2</div>
                  <div>Item 3</div>
                </Box>
              </CardContent>
            </Card>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<ComplexComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('complex-typography')).toBeInTheDocument();
      expect(screen.getByTestId('complex-box')).toBeInTheDocument();
    });

    test('should handle responsive breakpoints without recursion', () => {
      const ResponsiveComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={{
                p: { xs: 1, sm: 2, md: 3, lg: 4 },
                m: { xs: 0.5, sm: 1, md: 1.5, lg: 2 },
                width: { xs: '100%', sm: '90%', md: '80%', lg: '70%' },
                maxWidth: { xs: 400, sm: 600, md: 800, lg: 1000 },
                bgcolor: { xs: 'grey.100', sm: 'grey.200', md: 'grey.300' },
                borderRadius: { xs: 1, sm: 2, md: 3 }
              }}
              data-testid="responsive-box"
            >
              Responsive content with all breakpoints
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<ResponsiveComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('responsive-box')).toBeInTheDocument();
    });
  });

  describe('Input Verification - Potential Stack Overflow Scenarios', () => {
    test('should handle extremely deep nesting without stack overflow', () => {
      // Create deeply nested sx object that could potentially cause issues
      const createDeepNesting = (depth: number): any => {
        if (depth === 0) {
          return { 
            padding: 1,
            color: 'text.primary',
            backgroundColor: 'background.paper'
          };
        }
        return {
          [`& .level-${depth}`]: {
            ...createDeepNesting(depth - 1),
            [`& .nested-${depth}`]: createDeepNesting(depth - 1)
          }
        };
      };

      const DeepNestingComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box 
              sx={createDeepNesting(8)} // 8 levels deep
              data-testid="deep-nesting"
            >
              <div className="level-8">
                <div className="nested-8">
                  <div className="level-7">Deep content</div>
                </div>
              </div>
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<DeepNestingComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('deep-nesting')).toBeInTheDocument();
    });

    test('should handle function-based sx that processes breakpoints', () => {
      const FunctionBasedComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={(theme) => {
                // Simulate complex theme processing that could cause recursion
                const breakpoints = theme.breakpoints.keys;
                const spacing = theme.spacing;
                
                const responsiveStyles: any = {};
                
                breakpoints.forEach((breakpoint, index) => {
                  responsiveStyles[theme.breakpoints.up(breakpoint)] = {
                    padding: spacing(index + 1),
                    margin: spacing(index * 0.5 + 0.5),
                    fontSize: `${1 + index * 0.1}rem`
                  };
                });

                return {
                  ...responsiveStyles,
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.paper
                };
              }}
              data-testid="function-based-box"
            >
              Function-based sx content
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<FunctionBasedComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('function-based-box')).toBeInTheDocument();
    });

    test('should handle array of sx functions without stack overflow', () => {
      const ArraySxComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={[
                { padding: 1 },
                (theme) => ({ color: theme.palette.primary.main }),
                { margin: 2 },
                (theme) => ({ 
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: theme.shape?.borderRadius || 4
                }),
                { 
                  '&:hover': { 
                    cursor: 'pointer',
                    transform: 'scale(1.02)'
                  } 
                },
                (theme) => ({
                  [theme.breakpoints.up('sm')]: {
                    padding: theme.spacing(2)
                  },
                  [theme.breakpoints.up('md')]: {
                    padding: theme.spacing(3)
                  }
                })
              ]}
              data-testid="array-sx-box"
            >
              Array sx content
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<ArraySxComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('array-sx-box')).toBeInTheDocument();
    });
  });

  describe('Exception Handling - Error Recovery', () => {
    test('should gracefully handle theme function errors', () => {
      const ProblematicThemeComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={(theme) => {
                // Simulate accessing potentially undefined theme properties
                try {
                  return {
                    padding: theme.spacing?.(2) || 16,
                    color: theme.palette?.primary?.main || '#1976d2',
                    backgroundColor: theme.palette?.background?.paper || '#ffffff',
                    borderRadius: theme.shape?.borderRadius || 4,
                    // Access deeply nested properties that might not exist
                    boxShadow: theme.shadows?.[2] || '0px 1px 3px rgba(0,0,0,0.12)',
                    fontSize: theme.typography?.body1?.fontSize || '14px'
                  };
                } catch (error) {
                  console.warn('Theme access error:', error);
                  return { padding: 16, color: '#000' };
                }
              }}
              data-testid="problematic-theme-box"
            >
              Problematic theme access
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<ProblematicThemeComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('problematic-theme-box')).toBeInTheDocument();
    });

    test('should handle invalid sx values without crashing', () => {
      const InvalidSxComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={{
                padding: undefined, // Invalid value
                margin: null, // Invalid value
                color: '', // Empty string
                backgroundColor: 'invalid-color', // Invalid color
                fontSize: -1, // Invalid size
                zIndex: 'invalid', // Invalid z-index
                // @ts-ignore - Testing runtime behavior
                nonExistentProperty: 'value'
              }}
              data-testid="invalid-sx-box"
            >
              Invalid sx values
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<InvalidSxComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('invalid-sx-box')).toBeInTheDocument();
    });
  });

  describe('Branching - Conditional sx Logic', () => {
    test('should handle complex conditional sx without infinite loops', () => {
      const ConditionalSxComponent = ({ 
        level, 
        active, 
        variant 
      }: { 
        level: number; 
        active: boolean; 
        variant: 'primary' | 'secondary' | 'error' 
      }) => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={(theme) => {
                const baseStyles = {
                  padding: theme.spacing(level),
                  borderRadius: theme.shape?.borderRadius || 4,
                  transition: 'all 0.3s ease'
                };

                const variantStyles = {
                  primary: {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText || '#fff'
                  },
                  secondary: {
                    backgroundColor: theme.palette.grey?.[100] || '#f5f5f5',
                    color: theme.palette.text?.primary || '#000'
                  },
                  error: {
                    backgroundColor: theme.palette.error?.main || '#d32f2f',
                    color: theme.palette.error?.contrastText || '#fff'
                  }
                };

                const activeStyles = active ? {
                  transform: 'scale(1.05)',
                  boxShadow: theme.shadows?.[4] || '0px 2px 4px rgba(0,0,0,0.2)'
                } : {};

                const responsiveStyles = {
                  [theme.breakpoints.up('sm')]: {
                    padding: theme.spacing(level + 1)
                  },
                  [theme.breakpoints.up('md')]: {
                    padding: theme.spacing(level + 2)
                  }
                };

                return {
                  ...baseStyles,
                  ...variantStyles[variant],
                  ...activeStyles,
                  ...responsiveStyles
                };
              }}
              data-testid="conditional-sx-box"
            >
              Conditional sx content
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      // Test different combinations
      const combinations = [
        { level: 1, active: false, variant: 'primary' as const },
        { level: 2, active: true, variant: 'secondary' as const },
        { level: 3, active: false, variant: 'error' as const },
        { level: 4, active: true, variant: 'primary' as const }
      ];

      combinations.forEach((props, index) => {
        const { unmount } = render(<ConditionalSxComponent key={index} {...props} />);
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
        expect(screen.getByTestId('conditional-sx-box')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Performance - Stack Overflow Edge Cases', () => {
    test('should handle rapid re-renders with changing sx without memory issues', () => {
      const RapidChangeComponent = ({ iteration }: { iteration: number }) => (
        <TestWrapper>
          <ErrorBoundary>
            <Box
              sx={(theme) => ({
                padding: theme.spacing((iteration % 5) + 1),
                margin: theme.spacing((iteration % 3) + 1),
                backgroundColor: `hsl(${iteration * 13 % 360}, 70%, 95%)`,
                transform: `rotate(${iteration * 2 % 360}deg)`,
                [theme.breakpoints.up('sm')]: {
                  padding: theme.spacing((iteration % 7) + 2)
                },
                [theme.breakpoints.up('md')]: {
                  padding: theme.spacing((iteration % 9) + 3)
                }
              })}
              data-testid={`rapid-${iteration}`}
            >
              Rapid change {iteration}
            </Box>
          </ErrorBoundary>
        </TestWrapper>
      );

      // Test rapid changes to ensure no stack overflow
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(<RapidChangeComponent iteration={i} />);
        expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
        expect(screen.getByTestId(`rapid-${i}`)).toBeInTheDocument();
        unmount();
      }
    });

    test('should handle large component trees with sx props', () => {
      const generateLargeTree = (depth: number, breadth: number): React.ReactNode => {
        if (depth === 0) {
          return (
            <Box 
              sx={{ 
                p: 1, 
                m: 0.5, 
                border: '1px solid #ddd',
                borderRadius: 1 
              }}
              key={`leaf-${Math.random()}`}
            >
              Leaf
            </Box>
          );
        }

        return (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: depth % 2 === 0 ? 'row' : 'column',
              gap: 1,
              p: 1,
              border: `1px solid hsl(${depth * 30}, 50%, 80%)`
            }}
            key={`node-${depth}-${Math.random()}`}
          >
            {Array.from({ length: breadth }, (_, i) => (
              <div key={i}>
                {generateLargeTree(depth - 1, breadth)}
              </div>
            ))}
          </Box>
        );
      };

      const LargeTreeComponent = () => (
        <TestWrapper>
          <ErrorBoundary>
            <div data-testid="large-tree">
              {generateLargeTree(4, 3)} {/* 4 levels deep, 3 items per level */}
            </div>
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(() => {
        render(<LargeTreeComponent />);
      }).not.toThrow();

      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
      expect(screen.getByTestId('large-tree')).toBeInTheDocument();
    });
  });
});
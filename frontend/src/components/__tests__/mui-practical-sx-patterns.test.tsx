import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Box, Button, Card, CardContent, Typography, Stepper, Step, StepLabel } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create theme similar to production usage
const productionLikeTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  spacing: 8,
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      contrastText: '#ffffff',
    },
    grey: {
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
    },
    background: {
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 4,
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={productionLikeTheme}>
    {children}
  </ThemeProvider>
);

// Recreate problematic patterns similar to VideoPostDemo
const VideoPostLikeComponent: React.FC<{ activeStep?: number }> = ({ activeStep = 0 }) => {
  const [currentStep, setCurrentStep] = React.useState(activeStep);
  const [isComplete, setIsComplete] = React.useState(false);

  const steps = ['Select Video', 'Add Description', 'Share Settings', 'Upload & Post'];

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      setIsComplete(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsComplete(false);
  };

  return (
    <TestWrapper>
      <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" gutterBottom data-testid="main-title">
            Video Post Demo
          </Typography>
          
          {!isComplete ? (
            <>
              <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {currentStep === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Select Your Video
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Drag & drop your video here or click to browse
                    </Typography>
                  </Box>
                </Box>
              )}

              {currentStep === 1 && (
                <Box sx={{ py: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Add Description & Tags
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2">
                      Description area
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['#tech', '#demo', '#video'].map((tag) => (
                      <Box
                        key={tag}
                        sx={{
                          px: 1,
                          py: 0.5,
                          bgcolor: 'primary.main',
                          color: 'white',
                          borderRadius: 1,
                          fontSize: '0.875rem'
                        }}
                      >
                        {tag}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {currentStep === 2 && (
                <Box sx={{ py: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Share Settings
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="body2">Privacy Settings</Typography>
                    </Box>
                    <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="body2">Notification Preferences</Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {currentStep === 3 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Upload & Share
                  </Typography>
                  <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, p: 1, mb: 2 }}>
                    <Box sx={{ width: '75%', bgcolor: 'primary.main', height: 8, borderRadius: 1 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    75% Complete - Processing your video...
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ mt: 3 }}
                data-testid="next-button"
              >
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              </Button>
            </>
          ) : (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="h6" color="primary.main" gutterBottom>
                🎉 Video Posted Successfully!
              </Typography>
              <Typography variant="body2" paragraph>
                Your video has been uploaded and shared with your network.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">42</Typography>
                  <Typography variant="caption">Views</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">5</Typography>
                  <Typography variant="caption">Likes</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6">2</Typography>
                  <Typography variant="caption">Comments</Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                onClick={handleReset}
                sx={{ mt: 3 }}
                data-testid="reset-button"
              >
                Create Another Video
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </TestWrapper>
  );
};

describe('MUI Practical sx Patterns - Stack Overflow Prevention', () => {
  describe('Happy Path - VideoPost-like Component Flow', () => {
    test('should render initial state without stack overflow', () => {
      expect(() => {
        render(<VideoPostLikeComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('main-title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Select Your Video' })).toBeInTheDocument();
      expect(screen.getByTestId('next-button')).toBeInTheDocument();
    });

    test('should progress through all steps without stack overflow', () => {
      render(<VideoPostLikeComponent />);
      const nextButton = screen.getByTestId('next-button');

      // Step 1: Select Video
      expect(screen.getByRole('heading', { name: 'Select Your Video' })).toBeInTheDocument();
      
      fireEvent.click(nextButton);

      // Step 2: Add Description
      expect(screen.getByRole('heading', { name: 'Add Description & Tags' })).toBeInTheDocument();
      
      fireEvent.click(nextButton);

      // Step 3: Share Settings
      expect(screen.getByRole('heading', { name: 'Share Settings' })).toBeInTheDocument();
      
      fireEvent.click(nextButton);

      // Step 4: Upload
      expect(screen.getByRole('heading', { name: 'Upload & Share' })).toBeInTheDocument();
      
      fireEvent.click(nextButton);

      // Complete state
      expect(screen.getByText('🎉 Video Posted Successfully!')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
    });

    test('should handle reset flow without memory issues', () => {
      render(<VideoPostLikeComponent activeStep={3} />);
      
      // Progress to completion
      const nextButton = screen.getByTestId('next-button');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('🎉 Video Posted Successfully!')).toBeInTheDocument();
      
      // Reset
      const resetButton = screen.getByTestId('reset-button');
      fireEvent.click(resetButton);
      
      expect(screen.getByRole('heading', { name: 'Select Your Video' })).toBeInTheDocument();
    });
  });

  describe('Input Verification - Complex sx Interactions', () => {
    test('should handle responsive sx props in stepper component', () => {
      const ResponsiveStepperComponent = () => (
        <TestWrapper>
          <Card 
            sx={{ 
              maxWidth: { xs: 300, sm: 400, md: 500 },
              mx: 'auto',
              mt: { xs: 2, sm: 3, md: 4 },
              p: { xs: 1, sm: 2, md: 3 }
            }}
          >
            <Stepper 
              activeStep={1}
              sx={{
                mb: { xs: 2, sm: 3, md: 4 },
                '& .MuiStepLabel-label': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }
                }
              }}
            >
              <Step><StepLabel>Step 1</StepLabel></Step>
              <Step><StepLabel>Step 2</StepLabel></Step>
              <Step><StepLabel>Step 3</StepLabel></Step>
            </Stepper>
            <Box 
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: { xs: 1, sm: 2, md: 3 },
                '& > *': {
                  p: { xs: 1, sm: 1.5, md: 2 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }
              }}
              data-testid="responsive-grid"
            >
              <div>Item 1</div>
              <div>Item 2</div>
              <div>Item 3</div>
            </Box>
          </Card>
        </TestWrapper>
      );

      expect(() => {
        render(<ResponsiveStepperComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('responsive-grid')).toBeInTheDocument();
    });

    test('should handle dynamic sx props based on state changes', () => {
      const DynamicSxComponent = () => {
        const [variant, setVariant] = React.useState<'primary' | 'secondary' | 'error'>('primary');
        const [size, setSize] = React.useState<'small' | 'medium' | 'large'>('medium');

        const getDynamicSx = () => ({
          p: size === 'small' ? 1 : size === 'medium' ? 2 : 3,
          bgcolor: `${variant}.main`,
          color: `${variant}.contrastText`,
          borderRadius: size === 'small' ? 1 : size === 'medium' ? 2 : 3,
          transform: variant === 'primary' ? 'scale(1)' : variant === 'secondary' ? 'scale(1.05)' : 'scale(0.95)',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: `${variant}.dark`,
            transform: 'scale(1.1)'
          },
          [productionLikeTheme.breakpoints.up('sm')]: {
            p: size === 'small' ? 1.5 : size === 'medium' ? 2.5 : 3.5
          }
        });

        return (
          <TestWrapper>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setVariant('primary')} data-testid="primary-btn">Primary</Button>
                <Button onClick={() => setVariant('secondary')} data-testid="secondary-btn">Secondary</Button>
                <Button onClick={() => setVariant('error')} data-testid="error-btn">Error</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={() => setSize('small')} data-testid="small-btn">Small</Button>
                <Button onClick={() => setSize('medium')} data-testid="medium-btn">Medium</Button>
                <Button onClick={() => setSize('large')} data-testid="large-btn">Large</Button>
              </Box>
              <Box sx={getDynamicSx()} data-testid="dynamic-box">
                Dynamic content: {variant} - {size}
              </Box>
            </Box>
          </TestWrapper>
        );
      };

      render(<DynamicSxComponent />);

      // Test variant changes
      fireEvent.click(screen.getByTestId('secondary-btn'));
      expect(screen.getByText('Dynamic content: secondary - medium')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('error-btn'));
      expect(screen.getByText('Dynamic content: error - medium')).toBeInTheDocument();

      // Test size changes
      fireEvent.click(screen.getByTestId('large-btn'));
      expect(screen.getByText('Dynamic content: error - large')).toBeInTheDocument();

      // Ensure no stack overflow occurred
      expect(screen.getByTestId('dynamic-box')).toBeInTheDocument();
    });
  });

  describe('Exception Handling - Problematic sx Patterns', () => {
    test('should handle complex nested selectors without infinite recursion', () => {
      const ComplexNestedComponent = () => (
        <TestWrapper>
          <Box
            sx={{
              '& .container': {
                '& .row': {
                  '& .col': {
                    '& .item': {
                      '& .content': {
                        '& .text': {
                          color: 'text.primary',
                          '&:hover': {
                            color: 'primary.main',
                            '& .nested': {
                              transform: 'scale(1.1)',
                              '& .deep': {
                                opacity: 0.8
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }}
            data-testid="complex-nested-selectors"
          >
            <div className="container">
              <div className="row">
                <div className="col">
                  <div className="item">
                    <div className="content">
                      <div className="text">
                        Hover text
                        <div className="nested">
                          <div className="deep">Deep content</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Box>
        </TestWrapper>
      );

      expect(() => {
        render(<ComplexNestedComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('complex-nested-selectors')).toBeInTheDocument();
    });

    test('should handle theme function with potential circular calls', () => {
      const ThemeFunctionComponent = () => (
        <TestWrapper>
          <Box
            sx={(theme) => {
              // Simulate complex theme calculations that could potentially recurse
              const getSpacing = (multiplier: number): string => {
                if (multiplier <= 0) return '0px';
                return theme.spacing(multiplier);
              };

              const getBreakpointValue = (breakpoint: string) => {
                try {
                  return theme.breakpoints.values[breakpoint as keyof typeof theme.breakpoints.values] || 0;
                } catch {
                  return 0;
                }
              };

              const computeResponsiveSpacing = () => {
                const breakpointKeys = ['xs', 'sm', 'md', 'lg', 'xl'];
                const spacingMap: any = {};
                
                breakpointKeys.forEach((bp, index) => {
                  if (getBreakpointValue(bp) !== undefined) {
                    spacingMap[theme.breakpoints.up(bp)] = {
                      padding: getSpacing(index + 1),
                      margin: getSpacing(index * 0.5 + 0.5)
                    };
                  }
                });
                
                return spacingMap;
              };

              return {
                ...computeResponsiveSpacing(),
                color: theme.palette.primary.main,
                backgroundColor: theme.palette.background.paper,
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider || '#e0e0e0'}`,
                '&:focus': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px'
                }
              };
            }}
            tabIndex={0}
            data-testid="complex-theme-function"
          >
            Complex theme function content
          </Box>
        </TestWrapper>
      );

      expect(() => {
        render(<ThemeFunctionComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('complex-theme-function')).toBeInTheDocument();
    });
  });

  describe('Branching - Multi-conditional sx Logic', () => {
    test('should handle multiple conditional branches in sx', () => {
      interface ConditionalProps {
        variant: 'card' | 'list' | 'grid';
        size: 'xs' | 'sm' | 'md' | 'lg';
        interactive: boolean;
        highlighted: boolean;
      }

      const MultiConditionalComponent = (props: ConditionalProps) => (
        <TestWrapper>
          <Box
            sx={(theme) => {
              // Base styles
              let styles: any = {
                transition: 'all 0.3s ease',
                borderRadius: theme.shape.borderRadius
              };

              // Variant-based styles
              switch (props.variant) {
                case 'card':
                  styles = {
                    ...styles,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  };
                  break;
                case 'list':
                  styles = {
                    ...styles,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'transparent'
                  };
                  break;
                case 'grid':
                  styles = {
                    ...styles,
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.light'
                  };
                  break;
              }

              // Size-based styles
              const sizeMap = {
                xs: { p: 1, m: 0.5 },
                sm: { p: 1.5, m: 1 },
                md: { p: 2, m: 1.5 },
                lg: { p: 3, m: 2 }
              };
              styles = { ...styles, ...sizeMap[props.size] };

              // Interactive styles
              if (props.interactive) {
                styles['&:hover'] = {
                  cursor: 'pointer',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                };
                styles['&:active'] = {
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                };
              }

              // Highlight styles
              if (props.highlighted) {
                styles.backgroundColor = 'warning.light';
                styles.borderColor = 'warning.main';
                styles['&::before'] = {
                  content: '\"\"',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: 'warning.main'
                };
                styles.position = 'relative';
              }

              return styles;
            }}
            data-testid={`multi-conditional-${props.variant}-${props.size}-${props.interactive}-${props.highlighted}`}
          >
            Multi-conditional content
          </Box>
        </TestWrapper>
      );

      // Test all combinations
      const variants: ConditionalProps['variant'][] = ['card', 'list', 'grid'];
      const sizes: ConditionalProps['size'][] = ['xs', 'sm', 'md', 'lg'];
      const booleanCombos = [
        { interactive: false, highlighted: false },
        { interactive: true, highlighted: false },
        { interactive: false, highlighted: true },
        { interactive: true, highlighted: true }
      ];

      variants.forEach(variant => {
        sizes.forEach(size => {
          booleanCombos.forEach(({ interactive, highlighted }) => {
            const props = { variant, size, interactive, highlighted };
            const { unmount } = render(<MultiConditionalComponent {...props} />);
            
            expect(screen.getByTestId(
              `multi-conditional-${variant}-${size}-${interactive}-${highlighted}`
            )).toBeInTheDocument();
            
            unmount();
          });
        });
      });
    });
  });

  describe('Performance - Rapid Updates Prevention', () => {
    test('should handle rapid state updates without stack overflow', () => {
      const RapidUpdateComponent = () => {
        const [counter, setCounter] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCounter(prev => (prev + 1) % 100);
          }, 10);

          // Clear after a short time to avoid infinite updates in test
          setTimeout(() => clearInterval(interval), 500);

          return () => clearInterval(interval);
        }, []);

        return (
          <TestWrapper>
            <Box
              sx={(theme) => ({
                padding: theme.spacing(counter % 5 + 1),
                margin: theme.spacing(counter % 3 + 1),
                backgroundColor: `hsl(${counter * 3.6}, 70%, 95%)`,
                color: counter % 2 === 0 ? 'primary.main' : 'secondary.main',
                transform: `rotate(${counter % 360}deg)`,
                borderRadius: theme.shape.borderRadius,
                transition: 'none', // Disable transition for rapid updates
                [theme.breakpoints.up('sm')]: {
                  padding: theme.spacing((counter % 7) + 2)
                }
              })}
              data-testid="rapid-update-box"
            >
              Counter: {counter}
            </Box>
          </TestWrapper>
        );
      };

      expect(() => {
        render(<RapidUpdateComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('rapid-update-box')).toBeInTheDocument();
    });
  });
});
import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Card, CardContent, Stack } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
          }}
        >
          <Card sx={{ maxWidth: 500, width: '100%' }}>
            <CardContent>
              <Stack spacing={3} alignItems="center" textAlign="center">
                <AlertTriangle size={48} color="#ef4444" />
                
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Something went wrong
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We encountered an unexpected error. Please try refreshing the page.
                  </Typography>
                </Box>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      width: '100%',
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                      {this.state.error.message}
                    </Typography>
                  </Box>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={this.handleRetry}
                    startIcon={<RefreshCw size={16} />}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
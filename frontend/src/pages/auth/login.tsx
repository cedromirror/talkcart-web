import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import { LogIn, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WalletButton from '@/components/wallet/WalletButton';
import useWallet from '@/hooks/useWallet';

const LoginPage: NextPage = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { isConnected, address } = useWallet();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/social');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form data
      if (!formData.email || !formData.password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }
      
      // Create a payload object with the credentials
      const payload = {
        email: formData.email,
        password: formData.password
      };
      
      // Log the payload for debugging
      console.log('Login payload:', payload);
      
      try {
        // Call the login function with credentials
        await login(payload);
        
        // If login is successful, redirect to stored path or social feed
        const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/social';
        sessionStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (apiError: any) {
        // Check if the error message indicates a browser extension issue
        if (apiError.message && apiError.message.includes('browser extension')) {
          setError('Login failed due to browser extension interference. Please disable any extensions that might be affecting form submissions and try again.');
        } else {
          setError(apiError instanceof Error ? apiError.message : 'Login failed');
        }
      }
    } catch (err) {
      console.error('Login form submission error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | TalkCart</title>
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LogIn size={48} style={{ color: '#1976d2' }} />
              <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your TalkCart account
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Wallet Connection Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Wallet size={20} />
                Connect with Wallet
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <WalletButton />
              </Box>
              {isConnected && address && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Connected: {address.slice(0, 6)}...{address.slice(-4)}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                or sign in with email
              </Typography>
            </Divider>

            {/* Email/Password Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
            </Box>

            <Stack spacing={2} sx={{ mt: 3 }}>
              <Typography align="center">
                Don't have an account?{' '}
                <Link href="/auth/register" underline="hover">
                  Sign up
                </Link>
              </Typography>
              
              <Typography align="center">
                <Link href="/social" underline="hover" color="text.secondary">
                  ← Back to Social Feed
                </Link>
              </Typography>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default LoginPage;
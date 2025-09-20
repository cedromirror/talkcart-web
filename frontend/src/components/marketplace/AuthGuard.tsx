import React from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Stack,
  Alert,
  Avatar,
  Chip
} from '@mui/material';
import { 
  Lock as LockIcon,
  Login as LoginIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerification?: boolean;
  fallbackMessage?: string;
  showLoginPrompt?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireVerification = false,
  fallbackMessage,
  showLoginPrompt = true
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Typography>Checking authentication...</Typography>
      </Box>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    if (!showLoginPrompt) {
      return null;
    }

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, p: 3 }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <LockIcon fontSize="large" />
            </Avatar>
            
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Authentication Required
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {fallbackMessage || 'You need to be logged in to create products and access marketplace features.'}
            </Typography>

            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>Why do we require authentication?</strong>
                <br />
                • Ensure product quality and authenticity
                <br />
                • Prevent spam and fraudulent listings
                <br />
                • Enable proper vendor management
                <br />
                • Protect buyer and seller interests
              </Typography>
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={() => router.push('/auth/login')}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                  }
                }}
              >
                Sign In
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push('/auth/register')}
              >
                Create Account
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Already have an account? Sign in to continue
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Check verification requirement
  if (requireVerification && user && !user.isVerified) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, p: 3 }}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 3,
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
              }}
            >
              <VerifiedIcon fontSize="large" />
            </Avatar>
            
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Account Verification Required
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Please verify your email address to create products and access all marketplace features.
            </Typography>

            <Stack spacing={2} alignItems="center">
              <Chip 
                icon={<SecurityIcon />}
                label="Enhanced Security" 
                color="warning" 
                variant="outlined"
              />
              
              <Button
                variant="contained"
                color="warning"
                onClick={() => router.push('/auth/verify')}
              >
                Verify Account
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // User is authenticated and verified (if required)
  return <>{children}</>;
};

export default AuthGuard;

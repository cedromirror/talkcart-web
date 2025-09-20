import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  MessageSquare, 
  ShoppingBag, 
  Video, 
  Users, 
  Wallet, 
  ArrowRight 
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURES } from '@/config';

const HomePage: React.FC = () => {
  // Redirect to social feed
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/social');
  }, [router]);
  
  // The rest of the component won't render because we're redirecting
  const router = useRouter();
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  
  const features = [
    {
      id: 'social',
      title: 'Social Network',
      description: 'Connect with friends, share updates, and discover content from people around the world.',
      icon: <MessageSquare size={24} />,
      color: theme.palette.primary.main,
      path: '/social',
      enabled: FEATURES.SOCIAL,
    },
    {
      id: 'marketplace',
      title: 'Marketplace',
      description: 'Buy, sell, and trade digital and physical goods with crypto or traditional payment methods.',
      icon: <ShoppingBag size={24} />,
      color: theme.palette.secondary.main,
      path: '/marketplace',
      enabled: FEATURES.MARKETPLACE,
    },
    {
      id: 'streaming',
      title: 'Live Streaming',
      description: 'Watch and create live streams, interact with creators, and earn rewards.',
      icon: <Video size={24} />,
      color: theme.palette.error.main,
      path: '/streaming',
      enabled: FEATURES.STREAMING,
    },
    {
      id: 'dao',
      title: 'DAO Governance',
      description: 'Participate in decentralized governance, vote on proposals, and shape the future of the platform.',
      icon: <Users size={24} />,
      color: theme.palette.warning.main,
      path: '/dao',
      enabled: FEATURES.DAO,
    },
    {
      id: 'messaging',
      title: 'Messaging',
      description: 'Send encrypted messages, create group chats, and stay connected with your network.',
      icon: <MessageSquare size={24} />,
      color: theme.palette.info.main,
      path: '/messaging',
      enabled: FEATURES.MESSAGING,
    },
    {
      id: 'wallet',
      title: 'Web3 Wallet',
      description: 'Manage your crypto assets, NFTs, and connect with decentralized applications.',
      icon: <Wallet size={24} />,
      color: theme.palette.success.main,
      path: '/wallet',
      enabled: FEATURES.WALLET,
    },
  ];
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
            Welcome to TalkCart
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mb: 4 }}>
            The all-in-one Web3 super application combining social networking, marketplace, streaming, DAO governance, and messaging.
          </Typography>
          
          {!isAuthenticated && (
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => router.push('/auth/login')}
                sx={{ mr: 2 }}
              >
                Sign In
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                onClick={() => router.push('/auth/register')}
              >
                Create Account
              </Button>
            </Box>
          )}
        </Box>
        
        <Grid container spacing={3}>
          {features.filter(f => f.enabled).map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box 
                    sx={{ 
                      display: 'inline-flex', 
                      p: 1.5, 
                      borderRadius: 2, 
                      mb: 2,
                      bgcolor: alpha(feature.color, 0.1),
                      color: feature.color
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    endIcon={<ArrowRight size={16} />}
                    onClick={() => router.push(feature.path)}
                    sx={{ ml: 1, mb: 1 }}
                  >
                    Explore {feature.title}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Layout>
  );
};

export default HomePage;
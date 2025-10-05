import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  User, 
  Shield, 
  Bell, 
  Wallet, 
  Globe, 
  MessageSquare, 
  HelpCircle, 
  ChevronRight,
  Settings as SettingsIcon,
  Palette,
  Key,
  Languages
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  
  // Settings categories
  const settingsCategories = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Manage your account information, email, and password',
      icon: <User size={24} />,
      path: '/settings/account',
      color: theme.palette.primary.main
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Control your privacy settings and security options',
      icon: <Shield size={24} />,
      path: '/settings/privacy',
      color: theme.palette.error.main
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of the platform',
      icon: <Palette size={24} />,
      path: '/settings/appearance',
      color: theme.palette.info.main
    },
    {
      id: 'language',
      title: 'Language & Region',
      description: 'Change your language and regional preferences',
      icon: <Languages size={24} />,
      path: '/settings/language',
      color: theme.palette.secondary.main
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      description: 'Customize how you receive notifications',
      icon: <Bell size={24} />,
      path: '/settings/notifications',
      color: theme.palette.warning.main
    },
    {
      id: 'wallet',
      title: 'Wallet & Payments',
      description: 'Manage your wallet, transactions, and payment methods',
      icon: <Wallet size={24} />,
      path: '/settings/wallet',
      color: theme.palette.success.main
    },
    {
      id: 'messaging',
      title: 'Messaging & Communication',
      description: 'Control your messaging and communication preferences',
      icon: <MessageSquare size={24} />,
      path: '/settings/messaging',
      color: theme.palette.secondary.main
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help, report issues, and access support resources',
      icon: <HelpCircle size={24} />,
      path: '/help',
      color: theme.palette.grey[700]
    }
  ];
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Settings
        </Typography>
        
        <Grid container spacing={3}>
          {/* Settings Categories */}
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <List disablePadding>
                {settingsCategories.map((category, index) => (
                  <React.Fragment key={category.id}>
                    <ListItem disablePadding>
                      <ListItemButton 
                        onClick={() => router.push(category.path)}
                        sx={{ 
                          py: 2,
                          '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                        }}
                      >
                      <ListItemIcon sx={{ color: category.color }}>
                        {category.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={category.title} 
                        secondary={category.description}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                      <ChevronRight size={20} color={theme.palette.text.secondary} />
                    </ListItemButton>
                    </ListItem>
                    {index < settingsCategories.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* Account Summary */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SettingsIcon size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Account Summary
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {user ? (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Username
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      @{user.username}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Email
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.email}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Account Type
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.isVerified ? 'Verified Account' : 'Standard Account'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Member Since
                    </Typography>
                    <Typography variant="body1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Please sign in to view your account details
                  </Typography>
                )}
              </CardContent>
            </Card>
            
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Shield size={20} color={theme.palette.error.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Security Status
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {user ? (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Two-Factor Authentication
                    </Typography>
                    <Typography variant="body1" gutterBottom color={user.settings?.security?.twoFactorEnabled ? 'success.main' : 'error.main'}>
                      {user.settings?.security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Last Password Change
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.lastPasswordChange ? new Date(user.lastPasswordChange).toLocaleDateString() : 'Never'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Account Recovery
                    </Typography>
                    <Typography variant="body1" color={user.recoveryEmailVerified ? 'success.main' : 'warning.main'}>
                      {user.recoveryEmailVerified ? 'Set up' : 'Not configured'}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 2 }}>
                    Please sign in to view your security status
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default SettingsPage;
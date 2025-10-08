import React, { useState } from 'react';
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
  Button,
  TextField,
  Avatar,
  IconButton,
  Alert,
} from '@mui/material';
import {
  User,
  Mail,
  Key,
  Camera,
  LogOut,
  Download,
  Trash2,
  Shield,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const AccountSettingsPage: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveProfile = () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      displayName,
      username,
      email,
      bio,
      location,
      website,
      avatar
    };
    
    updateUser(updatedUser);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real implementation, this would upload the image
    const file = e.target.files?.[0];
    if (file) {
      // For demo purposes, we'll just show a placeholder
      setAvatar('/images/placeholder-image.png');
    }
  };

  const handleChangePassword = () => {
    // Redirect to password change page
    window.location.href = '/auth/change-password';
  };

  const handleExportData = () => {
    // In a real implementation, this would trigger data export
    alert('Data export functionality would be implemented here');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In a real implementation, this would delete the account
      alert('Account deletion functionality would be implemented here');
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Account Settings
        </Typography>
        
        <Grid container spacing={3}>
          {/* Profile Settings */}
          <Grid item xs={12} md={8}>
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <User size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Profile Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar 
                    src={avatar || undefined} 
                    sx={{ width: 80, height: 80 }}
                  >
                    {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </Avatar>
                  <IconButton 
                    component="label"
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      right: 0, 
                      bgcolor: 'background.paper',
                      border: '2px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Camera size={16} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </IconButton>
                </Box>
                
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6">
                    {user?.displayName || user?.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{user?.username}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <List>
                <ListItem>
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    margin="normal"
                  />
                </ListItem>
                
                <ListItem>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                  />
                </ListItem>
                
                <ListItem>
                  <TextField
                    fullWidth
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    margin="normal"
                    type="email"
                  />
                </ListItem>
                
                <ListItem>
                  <TextField
                    fullWidth
                    label="Bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    margin="normal"
                    multiline
                    rows={3}
                  />
                </ListItem>
                
                <ListItem>
                  <TextField
                    fullWidth
                    label="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    margin="normal"
                  />
                </ListItem>
                
                <ListItem>
                  <TextField
                    fullWidth
                    label="Website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    margin="normal"
                  />
                </ListItem>
              </List>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={handleSaveProfile}
                >
                  Save Changes
                </Button>
              </Box>
            </Paper>
            
            <Paper variant="outlined" sx={{ borderRadius: 2, p: 3, mt: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <Shield size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Account Security
              </Typography>
              
              <List>
                <ListItem disablePadding>
                  <ListItemButton onClick={handleChangePassword}>
                  <ListItemIcon>
                    <Key size={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Change Password"
                    secondary="Update your account password"
                  />
                </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={handleExportData}>
                  <ListItemIcon>
                    <Download size={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Export Data"
                    secondary="Download a copy of your account data"
                  />
                </ListItemButton>
                </ListItem>
                
                <ListItem disablePadding>
                  <ListItemButton onClick={handleDeleteAccount}>
                  <ListItemIcon>
                    <Trash2 size={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Delete Account"
                    secondary="Permanently delete your account and all data"
                  />
                </ListItemButton>
                </ListItem>
              </List>
            </Paper>
          </Grid>
          
          {/* Account Summary */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <User size={20} color="primary" />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Account Summary
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {user ? (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Member Since
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.createdAt && !isNaN(new Date(user.createdAt).getTime()) ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Last Login
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.lastLoginAt && !isNaN(new Date(user.lastLoginAt).getTime()) ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Account Status
                    </Typography>
                    <Typography variant="body1" color={user.isVerified ? 'success.main' : 'warning.main'}>
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                      Role
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
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
                  <LogOut size={20} color="error" />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Sign Out
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Sign out of your account on this device.
                </Typography>
                
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<LogOut size={16} />}
                  onClick={logout}
                  fullWidth
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default AccountSettingsPage;
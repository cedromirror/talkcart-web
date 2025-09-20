import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  FormGroup,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  ChevronLeft,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Users,
  User,
  Bell,
  Search,
  MessageSquare,
  Save,
  AlertTriangle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const PrivacySettingsPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Get default privacy settings from user or use defaults
  const defaultPrivacySettings = user?.settings?.privacy || {
    profileVisibility: 'public',
    showWallet: false,
    showActivity: true,
    showOnlineStatus: true,
    showLastSeen: true,
    allowTagging: true,
    allowDirectMessages: true,
    allowMentions: true,
    searchableByEmail: false,
    searchableByPhone: false,
    showInDirectory: true,
  };
  
  // State for privacy settings
  const [privacySettings, setPrivacySettings] = useState(defaultPrivacySettings);
  
  // Handle toggle change
  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setPrivacySettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handle radio change
  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPrivacySettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle save settings
  const handleSaveSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Prepare updated user data
      const updatedUser = {
        ...user,
        settings: {
          ...user.settings,
          privacy: privacySettings
        }
      };
      
      // Update profile
      const success = await updateProfile(updatedUser);
      
      if (success) {
        toast.success('Privacy settings updated successfully');
      } else {
        toast.error('Failed to update privacy settings');
      }
    } catch (error) {
      toast.error('An error occurred while updating privacy settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please sign in to access privacy settings
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => router.push('/auth/login')}
          >
            Sign In
          </Button>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ChevronLeft size={18} />}
            onClick={() => router.push('/settings')}
            sx={{ mr: 2 }}
          >
            Back to Settings
          </Button>
          <Typography variant="h4" fontWeight={600}>
            Privacy & Security
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 4 }}>
          Control who can see your content and how your information is used
        </Alert>
        
        <Grid container spacing={4}>
          {/* Profile Visibility */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Eye size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Profile Visibility
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <FormControl component="fieldset">
                  <FormLabel component="legend">Who can see your profile?</FormLabel>
                  <RadioGroup
                    name="profileVisibility"
                    value={privacySettings.profileVisibility}
                    onChange={handleRadioChange}
                  >
                    <FormControlLabel 
                      value="public" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Globe size={16} style={{ marginRight: 8 }} />
                          <Box>
                            <Typography variant="body1">Public</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Anyone can see your profile
                            </Typography>
                          </Box>
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value="followers" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Users size={16} style={{ marginRight: 8 }} />
                          <Box>
                            <Typography variant="body1">Followers Only</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Only people who follow you can see your profile
                            </Typography>
                          </Box>
                        </Box>
                      } 
                    />
                    <FormControlLabel 
                      value="private" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Lock size={16} style={{ marginRight: 8 }} />
                          <Box>
                            <Typography variant="body1">Private</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Only you can see your profile
                            </Typography>
                          </Box>
                        </Box>
                      } 
                    />
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Profile Information */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <User size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Profile Information
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.showWallet}
                        onChange={handleToggleChange}
                        name="showWallet"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Show Wallet Address</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to see your wallet address on your profile
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.showActivity}
                        onChange={handleToggleChange}
                        name="showActivity"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Show Activity</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Show your activity (posts, likes, comments) on your profile
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.showOnlineStatus}
                        onChange={handleToggleChange}
                        name="showOnlineStatus"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Show Online Status</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Let others see when you're online
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.showLastSeen}
                        onChange={handleToggleChange}
                        name="showLastSeen"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Show Last Seen</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Let others see when you were last active
                        </Typography>
                      </Box>
                    }
                  />
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Interactions */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MessageSquare size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Interactions
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.allowTagging}
                        onChange={handleToggleChange}
                        name="allowTagging"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Allow Tagging</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to tag you in posts and comments
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.allowDirectMessages}
                        onChange={handleToggleChange}
                        name="allowDirectMessages"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Allow Direct Messages</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to send you direct messages
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.allowMentions}
                        onChange={handleToggleChange}
                        name="allowMentions"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Allow Mentions</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to mention you in posts and comments
                        </Typography>
                      </Box>
                    }
                  />
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Discoverability */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Search size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" fontWeight={600} sx={{ ml: 1 }}>
                    Discoverability
                  </Typography>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.searchableByEmail}
                        onChange={handleToggleChange}
                        name="searchableByEmail"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Searchable by Email</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to find you using your email address
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.searchableByPhone}
                        onChange={handleToggleChange}
                        name="searchableByPhone"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Searchable by Phone</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow others to find you using your phone number
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={privacySettings.showInDirectory}
                        onChange={handleToggleChange}
                        name="showInDirectory"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Show in Directory</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Include your profile in the user directory
                        </Typography>
                      </Box>
                    }
                  />
                </FormGroup>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={loading}
            startIcon={<Save size={18} />}
            size="large"
          >
            Save Privacy Settings
          </Button>
        </Box>
      </Container>
    </Layout>
  );
};

export default PrivacySettingsPage;
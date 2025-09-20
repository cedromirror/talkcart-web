import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  TextField,
  Button,
  Avatar,
  Grid,
  IconButton,
  Card,
  CardContent,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import {
  User,
  Mail,
  Lock,
  Upload,
  Trash2,
  ChevronLeft,
  Save,
  AlertCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import UserAvatar from '@/components/common/UserAvatar';
import AvatarManager from '@/components/profile/AvatarManager';
import CoverPictureManager from '@/components/profile/CoverPictureManager';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `account-tab-${index}`,
    'aria-controls': `account-tabpanel-${index}`,
  };
}

const AccountSettingsPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateProfile, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');

  // Email states
  const [email, setEmail] = useState(user?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  // Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      setLoading(true);

      // In a real app, you would call your API here
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock update profile
      const success = await updateProfile({
        displayName,
        username,
        bio,
        location,
        website
      });

      if (success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle email update
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      setLoading(true);

      // In a real app, you would call your API here
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock email update
      toast.success('Verification email sent to ' + newEmail);
      setNewEmail('');
      setCurrentPassword('');
    } catch (error) {
      toast.error('An error occurred while updating email');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // In a real app, you would call your API here
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock password update
      toast.success('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('An error occurred while updating password');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload success
  const handleAvatarUploadSuccess = async (avatarUrl: string) => {
    try {
      // Update user profile with new avatar URL
      const response = await api.auth.updateProfile({ avatar: avatarUrl });

      if (response.success) {
        // Update the user context with new avatar
        updateUser({ ...user, avatar: avatarUrl });
        toast.success('Profile picture updated successfully!');
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to update profile with new avatar:', error);
      toast.error(error.message || 'Failed to update profile picture');
    }
  };

  // Handle cover picture upload success
  const handleCoverUploadSuccess = async (coverUrl: string) => {
    try {
      // Update user profile with new cover URL
      const response = await api.auth.updateProfile({ cover: coverUrl });

      if (response.success) {
        // Update the user context with new cover
        updateUser({ ...user, cover: coverUrl });
        toast.success('Cover picture updated successfully!');
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Failed to update profile with new cover:', error);
      toast.error(error.message || 'Failed to update cover picture');
    }
  };

  if (!user) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please sign in to access account settings
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
            Account Settings
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="account settings tabs"
              variant="fullWidth"
            >
              <Tab
                icon={<User size={18} />}
                label="Profile"
                {...a11yProps(0)}
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<Mail size={18} />}
                label="Email"
                {...a11yProps(1)}
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<Lock size={18} />}
                label="Password"
                {...a11yProps(2)}
                sx={{ textTransform: 'none' }}
              />
            </Tabs>
          </Box>

          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={4}>
              {/* Profile Picture Section */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Profile Picture
                  </Typography>
                  <AvatarManager
                    user={user}
                    onAvatarUpdate={handleAvatarUploadSuccess}
                    size={120}
                    showControls={true}
                  />

                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                    Recommended: Square image, at least 400x400 pixels
                  </Typography>
                </Box>
              </Grid>

              {/* Cover Picture Section */}
              <Grid item xs={12} md={8}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Cover Picture
                  </Typography>
                  <CoverPictureManager
                    user={user}
                    onCoverUpdate={handleCoverUploadSuccess}
                    isOwnProfile={true}
                    height={150}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Recommended: Wide image, at least 1200x400 pixels
                  </Typography>
                </Box>
              </Grid>

              {/* Profile Form Section */}
              <Grid item xs={12}>
                <Box component="form" onSubmit={handleProfileUpdate}>
                  <TextField
                    label="Display Name"
                    fullWidth
                    margin="normal"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="Your unique username for TalkCart"
                  />

                  <TextField
                    label="Bio"
                    fullWidth
                    margin="normal"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    multiline
                    rows={3}
                    helperText={`${bio.length}/160 characters`}
                  />

                  <TextField
                    label="Location"
                    fullWidth
                    margin="normal"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="Website"
                    fullWidth
                    margin="normal"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    placeholder="https://"
                  />

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={loading}
                      startIcon={<Save size={18} />}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Email Tab */}
          <TabPanel value={activeTab} index={1}>
            <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Current Email
                </Typography>
                <Typography variant="body1">{user.email}</Typography>
              </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom>
              Change Email
            </Typography>

            <Box component="form" onSubmit={handleEmailUpdate}>
              <TextField
                label="New Email Address"
                fullWidth
                margin="normal"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />

              <TextField
                label="Current Password"
                fullWidth
                margin="normal"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Alert severity="info" sx={{ mt: 2, mb: 3 }}>
                You will need to verify your new email address before the change takes effect.
              </Alert>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={loading || !newEmail || !currentPassword}
                >
                  Update Email
                </Button>
              </Box>
            </Box>
          </TabPanel>

          {/* Password Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>

            <Box component="form" onSubmit={handlePasswordUpdate}>
              <TextField
                label="Current Password"
                fullWidth
                margin="normal"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />

              <TextField
                label="New Password"
                fullWidth
                margin="normal"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Password must be at least 8 characters long and include a mix of letters, numbers, and symbols"
              />

              <TextField
                label="Confirm New Password"
                fullWidth
                margin="normal"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={newPassword !== confirmPassword && confirmPassword !== ''}
                helperText={
                  newPassword !== confirmPassword && confirmPassword !== ''
                    ? 'Passwords do not match'
                    : ''
                }
              />

              <Alert severity="warning" sx={{ mt: 2, mb: 3 }}>
                <AlertCircle size={18} style={{ marginRight: 8 }} />
                For security reasons, you will be logged out after changing your password.
              </Alert>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={
                    loading ||
                    !oldPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                >
                  Update Password
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Layout>
  );
};

export default AccountSettingsPage;
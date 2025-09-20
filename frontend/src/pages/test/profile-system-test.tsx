import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    Button,
    Divider,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import { Camera, User, Settings, TestTube } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import CoverPictureManager from '@/components/profile/CoverPictureManager';
import AvatarManager from '@/components/profile/AvatarManager';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserType } from '@/types';

const ProfileSystemTestPage: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [testUser, setTestUser] = useState<UserType | null>(user);

    const handleAvatarUpdate = (avatarUrl: string) => {
        console.log('Avatar updated:', avatarUrl);
        if (testUser) {
            const updatedUser = { ...testUser, avatar: avatarUrl };
            setTestUser(updatedUser);
            updateUser(updatedUser);
        }
    };

    const handleCoverUpdate = (coverUrl: string) => {
        console.log('Cover updated:', coverUrl);
        if (testUser) {
            const updatedUser = { ...testUser, cover: coverUrl };
            setTestUser(updatedUser);
            updateUser(updatedUser);
        }
    };

    const handleUserUpdate = (updatedFields: Partial<UserType>) => {
        if (testUser) {
            const updatedUser = { ...testUser, ...updatedFields };
            setTestUser(updatedUser);
            updateUser(updatedUser);
        }
    };

    if (!user) {
        return (
            <Layout>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        Please sign in to test the profile picture system
                    </Alert>
                </Container>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TestTube size={32} />
                        Profile Picture System Test
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Test all profile picture and cover picture functionality
                    </Typography>
                </Box>

                {/* Profile Header Test */}
                <Paper elevation={2} sx={{ mb: 4 }}>
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <User size={20} />
                            Profile Header (Full Integration)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            This shows how the profile header looks with both avatar and cover picture management
                        </Typography>
                    </Box>

                    {testUser && (
                        <ProfileHeader
                            user={testUser}
                            isOwnProfile={true}
                            onUserUpdate={handleUserUpdate}
                            followersCount={testUser.followerCount || 0}
                            followingCount={testUser.followingCount || 0}
                            postsCount={testUser.postCount || 0}
                        />
                    )}
                </Paper>

                <Grid container spacing={4}>
                    {/* Avatar Manager Test */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Camera size={20} />
                                Avatar Manager
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Upload, crop, and manage profile pictures
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                                <AvatarManager
                                    user={testUser}
                                    onAvatarUpdate={handleAvatarUpdate}
                                    size={120}
                                    showControls={true}
                                />
                            </Box>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    <strong>Features:</strong>
                                    <br />• Drag & drop or click to upload
                                    <br />• Image cropping and resizing
                                    <br />• Remove profile picture option
                                    <br />• Real-time preview
                                </Typography>
                            </Alert>
                        </Paper>
                    </Grid>

                    {/* Cover Picture Manager Test */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Settings size={20} />
                                Cover Picture Manager
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Upload and manage cover pictures with 3:1 aspect ratio
                            </Typography>

                            <Box sx={{ border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                                <CoverPictureManager
                                    user={testUser}
                                    onCoverUpdate={handleCoverUpdate}
                                    isOwnProfile={true}
                                    height={150}
                                />
                            </Box>

                            <Alert severity="info">
                                <Typography variant="body2">
                                    <strong>Features:</strong>
                                    <br />• Wide format (3:1 ratio) cropping
                                    <br />• Overlay controls for editing
                                    <br />• Remove cover picture option
                                    <br />• Gradient fallback when no cover
                                </Typography>
                            </Alert>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Current User Data */}
                <Paper elevation={2} sx={{ p: 3, mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Current User Data
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{
                        whiteSpace: 'pre-wrap',
                        backgroundColor: '#f5f5f5',
                        p: 2,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                        overflow: 'auto'
                    }}>
                        {JSON.stringify(testUser, null, 2)}
                    </Typography>
                </Paper>

                {/* Test Instructions */}
                <Card sx={{ mt: 4, bgcolor: 'primary.50' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom color="primary">
                            Test Instructions
                        </Typography>
                        <Typography variant="body2" component="div">
                            <strong>1. Avatar Testing:</strong>
                            <br />• Click the camera icon on the avatar
                            <br />• Upload an image and test cropping
                            <br />• Try removing the avatar
                            <br />• Check that changes appear immediately
                            <br /><br />

                            <strong>2. Cover Picture Testing:</strong>
                            <br />• Click the camera icon on the cover area
                            <br />• Upload a wide image (landscape orientation works best)
                            <br />• Test the 3:1 aspect ratio cropping
                            <br />• Try removing the cover picture
                            <br /><br />

                            <strong>3. Integration Testing:</strong>
                            <br />• Check that changes appear in the profile header
                            <br />• Verify that the sidebar and top bar update
                            <br />• Test on mobile and desktop views
                            <br />• Check that settings page shows the same images
                        </Typography>
                    </CardContent>
                </Card>
            </Container>
        </Layout>
    );
};

export default ProfileSystemTestPage;
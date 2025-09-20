import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Tabs,
    Tab,
    Paper,
    Typography,
    Grid,
    useTheme,
    useMediaQuery,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    GridView,
    Article,
    Favorite,
    Bookmark,
    Image as ImageIcon,
    VideoLibrary,
} from '@mui/icons-material';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ProfileHeader from './ProfileHeader';
import PostGrid from '../posts/PostGrid';
import MediaGrid from '../media/MediaGrid';
import toast from 'react-hot-toast';

interface ProfilePageProps {
    username: string;
    initialUser?: User;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ username, initialUser }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user: currentUser } = useAuth();

    const [user, setUser] = useState<User | null>(initialUser || null);
    const [loading, setLoading] = useState(!initialUser);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const isOwnProfile = currentUser?.username === username;

    // Fetch user profile
    useEffect(() => {
        const fetchUser = async () => {
            if (initialUser) return;

            try {
                setLoading(true);
                setError(null);

                const response = await api.users.getByUsername(username);
                if (response.success && response.user) {
                    setUser(response.user);
                    setIsFollowing(response.user.isFollowing || false);
                } else {
                    setError('User not found');
                }
            } catch (err: any) {
                console.error('Error fetching user:', err);
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [username, initialUser]);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!user || !currentUser) return;

        try {
            setFollowLoading(true);
            const response = await api.users.follow(user._id);

            if (response.success) {
                setIsFollowing(true);
                setUser(prev => prev ? {
                    ...prev,
                    followersCount: (prev.followersCount || 0) + 1
                } : null);
                toast.success(`You are now following ${user.displayName || user.username}`);
            }
        } catch (err: any) {
            console.error('Follow error:', err);
            toast.error(err.message || 'Failed to follow user');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!user || !currentUser) return;

        try {
            setFollowLoading(true);
            const response = await api.users.unfollow(user._id);

            if (response.success) {
                setIsFollowing(false);
                setUser(prev => prev ? {
                    ...prev,
                    followersCount: Math.max((prev.followersCount || 0) - 1, 0)
                } : null);
                toast.success(`You unfollowed ${user.displayName || user.username}`);
            }
        } catch (err: any) {
            console.error('Unfollow error:', err);
            toast.error(err.message || 'Failed to unfollow user');
        } finally {
            setFollowLoading(false);
        }
    };

    // Handle message
    const handleMessage = async () => {
        if (!user || !currentUser) return;

        try {
            // Create or get existing conversation
            const response = await api.messages.createConversation([user._id]);

            if (response.success && response.conversation) {
                // Navigate to messages page with conversation
                window.location.href = `/messages?conversation=${response.conversation._id}`;
            }
        } catch (err: any) {
            console.error('Message error:', err);
            toast.error(err.message || 'Failed to start conversation');
        }
    };

    // Handle profile update
    const handleProfileUpdated = (updatedUser: User) => {
        setUser(updatedUser);
        toast.success('Profile updated successfully!');
    };

    const handleUserUpdate = (updatedFields: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updatedFields });
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ProfileHeader
                    user={{} as User}
                    isOwnProfile={isOwnProfile}
                    onUserUpdate={handleUserUpdate}
                />
            </Container>
        );
    }

    if (error || !user) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error || 'User not found'}
                </Alert>
            </Container>
        );
    }

    const tabs = [
        { label: 'Posts', icon: <Article />, value: 'posts' },
        { label: 'Media', icon: <ImageIcon />, value: 'media' },
        { label: 'Videos', icon: <VideoLibrary />, value: 'videos' },
        ...(isOwnProfile ? [
            { label: 'Liked', icon: <Favorite />, value: 'liked' },
            { label: 'Saved', icon: <Bookmark />, value: 'saved' },
        ] : []),
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Profile Header */}
            <ProfileHeader
                user={user}
                isOwnProfile={isOwnProfile}
                isFollowing={isFollowing}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onUserUpdate={handleUserUpdate}
                followersCount={user.followerCount}
                followingCount={user.followingCount}
                postsCount={user.postCount}
            />

            {/* Content Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant={isMobile ? 'scrollable' : 'fullWidth'}
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                            },
                        }}
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={tab.value}
                                label={tab.label}
                                icon={tab.icon}
                                iconPosition="start"
                                sx={{ gap: 1 }}
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* Tab Panels */}
                <TabPanel value={activeTab} index={0}>
                    <PostGrid
                        userId={user._id}
                        username={user.username}
                        showPrivate={isOwnProfile}
                    />
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <MediaGrid
                        userId={user._id}
                        mediaType="image"
                        showPrivate={isOwnProfile}
                    />
                </TabPanel>

                <TabPanel value={activeTab} index={2}>
                    <MediaGrid
                        userId={user._id}
                        mediaType="video"
                        showPrivate={isOwnProfile}
                    />
                </TabPanel>

                {isOwnProfile && (
                    <>
                        <TabPanel value={activeTab} index={3}>
                            <PostGrid
                                userId={user._id}
                                username={user.username}
                                filter="liked"
                                showPrivate={true}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={4}>
                            <PostGrid
                                userId={user._id}
                                username={user.username}
                                filter="saved"
                                showPrivate={true}
                            />
                        </TabPanel>
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default ProfilePage;
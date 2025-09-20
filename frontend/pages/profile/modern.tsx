import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Container,
    Grid,
    Typography,
    CircularProgress,
    Tabs,
    Tab,
    Card,
    CardContent,
    Button,
    TextField,
    Stack,
    Avatar,
    Chip,
    IconButton,
    Divider,
    Paper,
    Badge,
    useTheme,
    alpha,
    Skeleton,
    Fade,
    Zoom,
} from '@mui/material';
import {
    Edit,
    LocationOn,
    Link as LinkIcon,
    CalendarToday,
    Verified,
    Settings,
    Share,
    MoreVert,
    PhotoCamera,
    Message,
    PersonAdd,
    PersonRemove,
    Bookmark,
    Favorite,
    GridOn,
    PlayArrow,
    Image as ImageIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileUser, Post } from '@/types';

// Enhanced TabPanel with animations
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
    <div
        role="tabpanel"
        hidden={value !== index}
        id={`profile-tabpanel-${index}`}
        aria-labelledby={`profile-tab-${index}`}
        {...other}
    >
        {value === index && (
            <Fade in={true} timeout={300}>
                <Box sx={{ py: 3 }}>{children}</Box>
            </Fade>
        )}
    </div>
);

// Modern Stats Card Component
const StatsCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color?: string }> = ({
    label,
    value,
    icon,
    color = 'primary'
}) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.1)}, ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.05)})`,
                border: `1px solid ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.2)}`,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.15)}`,
                    border: `1px solid ${alpha(theme.palette[color as keyof typeof theme.palette].main, 0.3)}`,
                }
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <Box sx={{ color: `${color}.main`, mr: 1 }}>{icon}</Box>
                <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
                    {value.toLocaleString()}
                </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight="medium">
                {label}
            </Typography>
        </Paper>
    );
};

// Enhanced Profile Header Component
const ProfileHeader: React.FC<{
    profile: ProfileUser;
    isOwnProfile: boolean;
    onEditProfile?: () => void;
    onFollow?: () => void;
    onMessage?: () => void;
}> = ({ profile, isOwnProfile, onEditProfile, onFollow, onMessage }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            {/* Cover Photo Area */}
            <Box
                sx={{
                    height: 200,
                    background: profile.coverPhoto
                        ? `url(${profile.coverPhoto})`
                        : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                }}
            >
                {isOwnProfile && (
                    <IconButton
                        sx={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                            '&:hover': { bgcolor: theme.palette.background.paper },
                        }}
                    >
                        <PhotoCamera />
                    </IconButton>
                )}
            </Box>

            {/* Profile Content */}
            <Box sx={{ p: 3, pt: 0 }}>
                {/* Avatar and Basic Info */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 3, mt: -6 }}>
                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                            isOwnProfile ? (
                                <IconButton
                                    size="small"
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'primary.dark' },
                                    }}
                                >
                                    <PhotoCamera fontSize="small" />
                                </IconButton>
                            ) : null
                        }
                    >
                        <Avatar
                            src={profile.avatar}
                            sx={{
                                width: 120,
                                height: 120,
                                border: `4px solid ${theme.palette.background.paper}`,
                                boxShadow: theme.shadows[8],
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {profile.displayName?.charAt(0) || profile.username?.charAt(0)}
                        </Avatar>
                    </Badge>

                    <Box sx={{ ml: 3, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h4" fontWeight="bold">
                                {profile.displayName || profile.username}
                            </Typography>
                            {profile.isVerified && (
                                <Verified sx={{ color: 'primary.main', fontSize: 28 }} />
                            )}
                            {profile.isOnline && (
                                <Chip
                                    label="Online"
                                    size="small"
                                    color="success"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                        </Box>

                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                            @{profile.username}
                        </Typography>

                        {/* Action Buttons */}
                        <Stack direction="row" spacing={2}>
                            {isOwnProfile ? (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={<Edit />}
                                        onClick={onEditProfile}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Edit Profile
                                    </Button>
                                    <IconButton sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <Settings />
                                    </IconButton>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={profile.isFollowing ? <PersonRemove /> : <PersonAdd />}
                                        onClick={onFollow}
                                        color={profile.isFollowing ? "secondary" : "primary"}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {profile.isFollowing ? 'Unfollow' : 'Follow'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Message />}
                                        onClick={onMessage}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        Message
                                    </Button>
                                    <IconButton sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <Share />
                                    </IconButton>
                                    <IconButton sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                                        <MoreVert />
                                    </IconButton>
                                </>
                            )}
                        </Stack>
                    </Box>
                </Box>

                {/* Bio */}
                {profile.bio && (
                    <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                        {profile.bio}
                    </Typography>
                )}

                {/* Profile Details */}
                <Stack direction="row" spacing={3} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    {profile.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                {profile.location}
                            </Typography>
                        </Box>
                    )}

                    {profile.website && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LinkIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                            <Typography
                                variant="body2"
                                color="primary"
                                component="a"
                                href={profile.website}
                                target="_blank"
                                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                                {profile.website.replace(/^https?:\/\//, '')}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                            Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric'
                            }) : 'Recently'}
                        </Typography>
                    </Box>
                </Stack>

                {/* Stats */}
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Posts"
                            value={profile.postCount || 0}
                            icon={<GridOn />}
                            color="primary"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Followers"
                            value={profile.followerCount || 0}
                            icon={<PersonAdd />}
                            color="secondary"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Following"
                            value={profile.followingCount || 0}
                            icon={<PersonRemove />}
                            color="info"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Likes"
                            value={profile.totalLikes || 0}
                            icon={<Favorite />}
                            color="error"
                        />
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};

// Modern Content Tabs
const ContentTabs: React.FC<{
    value: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
    isOwnProfile: boolean;
    profile: ProfileUser;
}> = ({ value, onChange, isOwnProfile, profile }) => {
    const theme = useTheme();

    const tabs = [
        { label: 'Posts', icon: <GridOn />, disabled: false },
        { label: 'Media', icon: <ImageIcon />, disabled: false },
        { label: 'Videos', icon: <PlayArrow />, disabled: false },
        { label: 'Liked', icon: <Favorite />, disabled: !isOwnProfile },
        { label: 'Saved', icon: <Bookmark />, disabled: !isOwnProfile },
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: 'hidden',
            }}
        >
            <Tabs
                value={value}
                onChange={onChange}
                variant="fullWidth"
                sx={{
                    '& .MuiTab-root': {
                        minHeight: 64,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        '&.Mui-selected': {
                            color: 'primary.main',
                        },
                    },
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                    },
                }}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        label={tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                        disabled={tab.disabled}
                        sx={{
                            '& .MuiTab-iconWrapper': {
                                marginRight: 1,
                                marginBottom: 0,
                            },
                        }}
                    />
                ))}
            </Tabs>
        </Paper>
    );
};

// Main Profile Component
const ModernProfilePage: React.FC = () => {
    const router = useRouter();
    const { user: currentUser, isAuthenticated } = useAuth();
    const theme = useTheme();

    // Profile state
    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);
    const [editMode, setEditMode] = useState(false);

    // Posts state
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);

    // Get username from URL
    const { username } = router.query;
    const effectiveUsername = username as string;
    const isOwnProfile = currentUser?.username === effectiveUsername;

    // Load profile data
    useEffect(() => {
        const loadProfile = async () => {
            if (!effectiveUsername) return;

            setLoading(true);
            setError(null);

            try {
                let res: any = null;

                if (isOwnProfile) {
                    res = await api.auth.getProfile();
                } else {
                    res = await api.users.getProfile(effectiveUsername);
                }

                if (res?.success && res.data) {
                    setProfile(res.data as ProfileUser);
                } else {
                    throw new Error(res?.message || 'Failed to load profile');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [effectiveUsername, isOwnProfile]);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!profile) return;

        try {
            if (profile.isFollowing) {
                await api.users.unfollowUser(profile.id);
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: false,
                    followerCount: (prev.followerCount || 0) - 1
                } : null);
            } else {
                await api.users.followUser(profile.id);
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: true,
                    followerCount: (prev.followerCount || 0) + 1
                } : null);
            }
        } catch (error) {
            console.error('Follow/unfollow error:', error);
        }
    };

    // Loading state
    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3, mb: 3 }} />
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2 }} />
                        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Container>
        );
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                        bgcolor: alpha(theme.palette.error.main, 0.05),
                    }}
                >
                    <Typography variant="h5" color="error" gutterBottom>
                        Profile Not Found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {error}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.push('/')}
                        sx={{ borderRadius: 2 }}
                    >
                        Go Home
                    </Button>
                </Paper>
            </Container>
        );
    }

    if (!profile) return null;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Zoom in={true} timeout={500}>
                <Box>
                    {/* Profile Header */}
                    <ProfileHeader
                        profile={profile}
                        isOwnProfile={isOwnProfile}
                        onEditProfile={() => setEditMode(true)}
                        onFollow={handleFollow}
                        onMessage={() => router.push(`/messages?user=${profile.username}`)}
                    />

                    {/* Content Tabs */}
                    <Box sx={{ mt: 4 }}>
                        <ContentTabs
                            value={tab}
                            onChange={handleTabChange}
                            isOwnProfile={isOwnProfile}
                            profile={profile}
                        />

                        {/* Tab Content */}
                        <Paper
                            elevation={0}
                            sx={{
                                mt: 0,
                                borderRadius: '0 0 12px 12px',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                borderTop: 'none',
                                minHeight: 400,
                            }}
                        >
                            <TabPanel value={tab} index={0}>
                                <Typography variant="h6" gutterBottom>
                                    Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Posts content will be loaded here...
                                </Typography>
                            </TabPanel>

                            <TabPanel value={tab} index={1}>
                                <Typography variant="h6" gutterBottom>
                                    Media
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Media content will be loaded here...
                                </Typography>
                            </TabPanel>

                            <TabPanel value={tab} index={2}>
                                <Typography variant="h6" gutterBottom>
                                    Videos
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Video content will be loaded here...
                                </Typography>
                            </TabPanel>

                            <TabPanel value={tab} index={3}>
                                <Typography variant="h6" gutterBottom>
                                    Liked Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Liked posts will be loaded here...
                                </Typography>
                            </TabPanel>

                            <TabPanel value={tab} index={4}>
                                <Typography variant="h6" gutterBottom>
                                    Saved Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Saved posts will be loaded here...
                                </Typography>
                            </TabPanel>
                        </Paper>
                    </Box>
                </Box>
            </Zoom>
        </Container>
    );
};

export default ModernProfilePage;
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
  Store,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext'; // Add this import
import { ProfileUser, Post } from '@/types';
import UserCard from '@/components/profile/UserCard';
import { PostCardEnhanced as PostCard } from '@/components/social/new/PostCardEnhanced';
import { useProfileCache } from '@/contexts/ProfileCacheContext';

// Modern Stats Card Component
const StatsCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color?: string }> = ({
  label,
  value,
  icon,
  color = 'primary'
}) => {
  const theme = useTheme();

  // Safely get color from theme palette
  const getColor = (colorName: string) => {
    const palette: any = theme.palette;
    if (palette[colorName] && palette[colorName].main) {
      return palette[colorName].main;
    }
    return palette.primary.main; // fallback to primary
  };

  const mainColor = getColor(color);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${alpha(mainColor, 0.1)}, ${alpha(mainColor, 0.05)})`,
        border: `1px solid ${alpha(mainColor, 0.2)}`,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 25px ${alpha(mainColor, 0.15)}`,
          border: `1px solid ${alpha(mainColor, 0.3)}`,
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <Box sx={{ color: mainColor, mr: 1 }}>{icon}</Box>
        <Typography variant="h4" fontWeight="bold" sx={{ color: mainColor }}>
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
  router?: any; // Make router prop optional
}> = ({ profile, isOwnProfile, onEditProfile, onFollow, onMessage, router }) => {
  const theme = useTheme();
  const { updateProfile } = useProfile(); // Add this line

  // Handle follow/unfollow with ProfileContext
  const handleFollow = async () => {
    try {
      if (profile.isFollowing) {
        await api.users.unfollow(profile.id);
        // Update profile context
        // In a real implementation, you might want to refresh the profile data
      } else {
        await api.users.follow(profile.id);
        // Update profile context
        // In a real implementation, you might want to refresh the profile data
      }
      // Call the passed onFollow handler if provided
      onFollow?.();
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    }
  };

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
          background: profile.cover
            ? `url(${profile.cover})`
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
              src={profile.avatar?.includes('localhost:4000/images/default-avatar.png')
                ? '/images/default-avatar.png'
                : profile.avatar}
              sx={{
                width: 120,
                height: 120,
                border: `4px solid ${theme.palette.background.paper}`,
                boxShadow: theme.shadows[8],
                fontSize: '2.5rem',
                fontWeight: 'bold',
              }}
              imgProps={{
                onError: (e: any) => {
                  // Silently fallback to default avatar on error
                  if (e.currentTarget.src !== '/images/default-avatar.png') {
                    e.currentTarget.src = '/images/default-avatar.png';
                  }
                }
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
                  {/* Vendor Dashboard Button - Only show for users with vendor role */}
                  {profile.role === 'vendor' && router && (
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<Store />}
                      onClick={() => router.push('/vendor/dashboard')}
                      sx={{ borderRadius: 2 }}
                    >
                      Vendor Dashboard
                    </Button>
                  )}
                  <IconButton sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                    <Settings />
                  </IconButton>
                  <IconButton 
                    sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                        router.push('/auth/login');
                      } catch (error) {
                        console.error('Logout failed:', error);
                        router.push('/auth/login');
                      }
                    }}
                  >
                    <LogoutIcon />
                  </IconButton>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={profile.isFollowing ? <PersonRemove /> : <PersonAdd />}
                    onClick={handleFollow} // Use the new handleFollow function
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
              value={0}
              icon={<Favorite />}
              color="error"
            />
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

// Inline edit component for About section
const EditAboutSection: React.FC<{ profile: ProfileUser; onProfileUpdated: (u: ProfileUser) => void }> = ({ profile, onProfileUpdated }) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { updateProfile } = useProfile(); // Add this line

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Use ProfileContext to update profile
      const success = await updateProfile({ displayName, bio, location, website });
      if (success) {
        setSuccess('Profile updated');
        // Refresh the profile to get the updated data
        // In a real implementation, you might want to pass a callback to refresh the profile
      } else {
        setError('Failed to update profile');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={2}>
        <TextField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} size="small" fullWidth inputProps={{ maxLength: 50 }} />
        <TextField label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} size="small" fullWidth />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} size="small" fullWidth inputProps={{ maxLength: 100 }} />
      </Stack>
      <TextField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} size="small" fullWidth multiline minRows={3} inputProps={{ maxLength: 500 }} />
      {error && <Typography color="error" variant="body2">{error}</Typography>}
      {success && <Typography color="success.main" variant="body2">{success}</Typography>}
      <Box>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </Box>
    </Box>
  );
};

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
        <Box sx={{ py: 2 }}>{children}</Box>
      </Fade>
    )}
  </div>
);

interface SmartProfilePageProps {
  username?: string;
}

const SmartProfilePage: React.FC<SmartProfilePageProps> = ({ username }) => {
  const router = useRouter();
  const routeUsername = (router.query.username as string) || undefined;
  const effectiveUsername = username || routeUsername;
  const { user: currentUser } = useAuth();
  const { profile: contextProfile, loading: profileLoading, loadProfile, updateProfile } = useProfile(); // Add this line
  const theme = useTheme();

  const isOwnProfile = useMemo(() => {
    if (!effectiveUsername || !currentUser) return true;
    return (
      effectiveUsername.toLowerCase() === (currentUser.username || '').toLowerCase()
    );
  }, [effectiveUsername, currentUser]);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const { getProfileFromCache, setProfileInCache } = useProfileCache();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Simplified tab management
  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
  };

  // For display, just use the tab value directly for own profile
  // For other profiles, map the tab value to available tabs
  const displayTabIndex = isOwnProfile ? tab : 
    // Map actual indices to display indices for other profiles:
    // 0->0, 1->1, 4->2, 5->3, 6->4
    tab === 0 ? 0 : 
    tab === 1 ? 1 : 
    tab === 4 ? 2 : 
    tab === 5 ? 3 : 
    tab === 6 ? 4 : 0; // Default to 0 if invalid

  // Ensure tab value is always valid
  useEffect(() => {
    if (isOwnProfile) {
      // For own profile, ensure tab is between 0-6
      if (tab < 0 || tab > 6) {
        setTab(0);
      }
    } else {
      // For other profiles, ensure tab is one of the available tabs
      const availableTabs = [0, 1, 4, 5, 6];
      if (!availableTabs.includes(tab)) {
        setTab(0);
      }
    }
  }, [isOwnProfile, tab]);

  // Reset tab to 0 when profile changes
  useEffect(() => {
    setTab(0);
  }, [profile?.id, isOwnProfile]);

  // Stabilize rendering to prevent hooks order changes
  const renderKey = `${effectiveUsername}-${profile?.id || 'loading'}-${tab}`;

  // Set ready state after component mounts to prevent MUI tabs error
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postFilter, setPostFilter] = useState<'all' | 'image' | 'video'>('all');

  // Media tab state
  const [mediaPosts, setMediaPosts] = useState<Post[]>([]);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaHasMore, setMediaHasMore] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Liked tab state
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedPage, setLikedPage] = useState(1);
  const [likedHasMore, setLikedHasMore] = useState(true);
  const [likedLoading, setLikedLoading] = useState(false);

  // Bookmarked tab state
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [bookmarkedPage, setBookmarkedPage] = useState(1);
  const [bookmarkedHasMore, setBookmarkedHasMore] = useState(true);
  const [bookmarkedLoading, setBookmarkedLoading] = useState(false);

  // Followers/Following state
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followersHasMore, setFollowersHasMore] = useState(true);
  const [followingHasMore, setFollowingHasMore] = useState(true);

  // Use profile from ProfileContext if available, otherwise use local state
  const displayProfile = contextProfile || profile;

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Use ProfileContext to load profile
        if (effectiveUsername) {
          await loadProfile(effectiveUsername);
        } else if (isOwnProfile && currentUser?.username) {
          await loadProfile(); // Load current user's profile
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [effectiveUsername, isOwnProfile, currentUser?.username, loadProfile]);

  // Load posts when profile is available
  useEffect(() => {
    let isMounted = true;
    async function loadPosts() {
      if (!displayProfile?.id) return;
      
      try {
        // Load posts for profile user when available
        const usernameForPosts = isOwnProfile ? currentUser?.username : effectiveUsername;
        if (usernameForPosts) {
          // Default Posts
          setPostsPage(1);
          const postsRes = await api.posts.getUserPosts(displayProfile.id, { limit: 10, page: 1 });
          const fetched = (postsRes as any)?.data?.posts || (postsRes as any)?.posts || (Array.isArray(postsRes) ? postsRes : []);
          setPosts(Array.isArray(fetched) ? fetched : []);
          const total = (postsRes as any)?.data?.pagination?.total || (postsRes as any)?.pagination?.total || (Array.isArray(fetched) ? fetched.length : 0);
          setPostsHasMore((Array.isArray(fetched) ? fetched.length : 0) < (typeof total === 'number' ? total : 0));

          // Media tab initial load
          setMediaPage(1);
          const mediaRes = await api.posts.getUserPosts(displayProfile.id, { limit: 10, page: 1, contentType: 'media' });
          const mediaFetched = (mediaRes as any)?.data?.posts || (mediaRes as any)?.posts || [];
          setMediaPosts(Array.isArray(mediaFetched) ? mediaFetched : []);
          const mediaTotal = (mediaRes as any)?.data?.pagination?.total || (mediaRes as any)?.pagination?.total || 0;
          setMediaHasMore((Array.isArray(mediaFetched) ? mediaFetched.length : 0) < (typeof mediaTotal === 'number' ? mediaTotal : 0));

          // Liked + Bookmarked initial load only for own profile
          if (isOwnProfile && currentUser?.id) {
            setLikedPage(1);
            const likedRes = await api.posts.getLikedPosts(currentUser.id, { limit: 10, page: 1 });
            const likedFetched = (likedRes as any)?.data?.posts || (likedRes as any)?.posts || [];
            setLikedPosts(Array.isArray(likedFetched) ? likedFetched : []);
            const likedTotal = (likedRes as any)?.data?.pagination?.total || (likedRes as any)?.pagination?.total || 0;
            setLikedHasMore((Array.isArray(likedFetched) ? likedFetched.length : 0) < (typeof likedTotal === 'number' ? likedTotal : 0));

            setBookmarkedPage(1);
            const bookmarkedRes = await api.posts.getBookmarkedPosts(currentUser.id, { limit: 10, page: 1 });
            const bookmarkedFetched = (bookmarkedRes as any)?.data?.posts || (bookmarkedRes as any)?.posts || [];
            setBookmarkedPosts(Array.isArray(bookmarkedFetched) ? bookmarkedFetched : []);
            const bookmarkedTotal = (bookmarkedRes as any)?.data?.pagination?.total || (bookmarkedRes as any)?.pagination?.total || 0;
            setBookmarkedHasMore((Array.isArray(bookmarkedFetched) ? bookmarkedFetched.length : 0) < (typeof bookmarkedTotal === 'number' ? bookmarkedTotal : 0));
          }
        }
      } catch (e: any) {
        console.error('Failed to load posts:', e);
      }
    }
    
    loadPosts();
    return () => {
      isMounted = false;
    };
  }, [displayProfile?.id, isOwnProfile, currentUser?.username, currentUser?.id, effectiveUsername]);

  if (loading || profileLoading) {
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

  if (!displayProfile) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Zoom in={true} timeout={500}>
          <Box>
            {/* Profile Header Skeleton */}
            <Paper
              elevation={0}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              {/* Cover Photo Skeleton */}
              <Skeleton variant="rectangular" height={200} />

              {/* Profile Content Skeleton */}
              <Box sx={{ p: 3, pt: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 3, mt: -6 }}>
                  <Skeleton variant="circular" width={120} height={120} sx={{ mr: 3 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 2 }} />
                      <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 2 }} />
                    </Box>
                  </Box>
                </Box>

                {/* Stats Skeleton */}
                <Grid container spacing={2}>
                  {[1, 2, 3, 4].map((i) => (
                    <Grid item xs={6} sm={3} key={i}>
                      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Paper>

            {/* Tabs Skeleton */}
            <Box sx={{ mt: 4 }}>
              <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2, mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            </Box>
          </Box>
        </Zoom>
      </Container>
    );
  }

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!displayProfile) return;

    try {
      if (displayProfile.isFollowing) {
        await api.users.unfollow(displayProfile.id);
        // Update through ProfileContext
        // Note: In a real implementation, you might want to refresh the profile data
      } else {
        await api.users.follow(displayProfile.id);
        // Update through ProfileContext
        // Note: In a real implementation, you might want to refresh the profile data
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Zoom in={true} timeout={500}>
        <Box>
          {/* Modern Profile Header */}
          <ProfileHeader
            profile={displayProfile}
            isOwnProfile={isOwnProfile}
            onEditProfile={() => setTab(4)} // Switch to About tab for editing
            onFollow={handleFollow}
            onMessage={() => router.push(`/messages?user=${displayProfile.username}`)}
            router={router}
          />
          {/* Temporary debugging - remove after testing */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ p: 2, bgcolor: 'info.light', mt: 1, borderRadius: 1 }}>
              <Typography variant="body2">
                Profile Role: {displayProfile?.role || 'Not set'} | 
                Is Vendor: {displayProfile?.role === 'vendor' ? 'Yes' : 'No'} |
                Has Router: {router ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}

          {/* Content Tabs */}
          {profile && profile.id ? (
            <Box sx={{ mt: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  overflow: 'hidden',
                }}
              >
                <Tabs
                  value={displayTabIndex !== undefined && displayTabIndex !== null ? displayTabIndex : 0}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  key={`tabs-${profile.id}-${isOwnProfile}`}
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
                  <Tab label="Posts" icon={<GridOn />} iconPosition="start" />
                  <Tab label="Media" icon={<ImageIcon />} iconPosition="start" />
                  {isOwnProfile && <Tab label="Liked" icon={<Favorite />} iconPosition="start" />}
                  {isOwnProfile && <Tab label="Saved" icon={<Bookmark />} iconPosition="start" />}
                  <Tab label="About" icon={<Edit />} iconPosition="start" />
                  <Tab label={`Followers (${profile.followerCount ?? 0})`} icon={<PersonAdd />} iconPosition="start" />
                  <Tab label={`Following (${profile.followingCount ?? 0})`} icon={<PersonRemove />} iconPosition="start" />
                </Tabs>
              </Paper>

              {/* Tab Content */}
              <Paper
                elevation={0}
                sx={{
                  mt: 0,
                  borderRadius: '0 0 12px 12px',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  borderTop: 'none',
                  minHeight: 400,
                  p: 3,
                }}
                key={renderKey}
              >

                <TabPanel value={tab} index={0}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GridOn /> Posts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isOwnProfile ? "Your posts and updates" : `Posts by ${profile.displayName || profile.username}`}
                    </Typography>
                  </Box>

                  {posts.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <GridOn sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No posts yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile ? "Share your first post to get started!" : `${profile.displayName || profile.username} hasn't posted anything yet.`}
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {posts.map((p) => (
                        <Fade in={true} timeout={300} key={p.id}>
                          <Box>
                            <PostCard post={p as any} />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {posts.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!postsHasMore || postsLoading}
                        onClick={async () => {
                          if (!displayProfile?.id) return;
                          setPostsLoading(true);
                          try {
                            const nextPage = postsPage + 1;
                            const res = await api.posts.getUserPosts(displayProfile.id, { limit: 10, page: nextPage });
                            const newPosts = (res as any)?.data?.posts || (res as any)?.posts || [];
                            setPosts((prev) => [...prev, ...newPosts]);
                            const total = (res as any)?.data?.pagination?.total || (res as any)?.pagination?.total || 0;
                            const accumulated = [...posts, ...newPosts].length;
                            setPostsHasMore(accumulated < total);
                            setPostsPage(nextPage);
                          } finally {
                            setPostsLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {postsLoading ? 'Loading...' : postsHasMore ? 'Load more' : 'No more posts'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                {/* Media Tab */}
                <TabPanel value={tab} index={1}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon /> Media
                    </Typography>
                  </Box>

                  {mediaPosts.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.secondary.main, 0.2)}`,
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No media yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile ? "Share photos and videos to see them here!" : `${profile.displayName || profile.username} hasn't shared any media yet.`}
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                      {mediaPosts.map((p) => (
                        <Fade in={true} timeout={300} key={p.id}>
                          <Box>
                            <PostCard post={p as any} />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {mediaPosts.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!mediaHasMore || mediaLoading}
                        onClick={async () => {
                          if (!displayProfile?.id) return;
                          setMediaLoading(true);
                          try {
                            const nextPage = mediaPage + 1;
                            const res = await api.posts.getUserPosts(displayProfile.id, { limit: 10, page: nextPage, contentType: 'media' });
                            const newPosts = (res as any)?.data?.posts || (res as any)?.posts || [];
                            setMediaPosts((prev) => [...prev, ...newPosts]);
                            const total = (res as any)?.data?.pagination?.total || (res as any)?.pagination?.total || 0;
                            const accumulated = [...mediaPosts, ...newPosts].length;
                            setMediaHasMore(accumulated < total);
                            setMediaPage(nextPage);
                          } finally {
                            setMediaLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {mediaLoading ? 'Loading...' : mediaHasMore ? 'Load more' : 'No more media'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                {/* Liked Tab */}
                <TabPanel value={tab} index={2}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Favorite /> Liked Posts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Posts you've liked are private and only visible to you.
                    </Typography>
                  </Box>

                  {likedPosts.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.error.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.error.main, 0.2)}`,
                      }}
                    >
                      <Favorite sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No liked posts yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Posts you like will appear here for easy access.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {likedPosts.map((p) => (
                        <Fade in={true} timeout={300} key={p.id}>
                          <Box>
                            <PostCard post={p as any} />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {likedPosts.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!likedHasMore || likedLoading}
                        onClick={async () => {
                          if (!isOwnProfile || !currentUser?.id) return;
                          setLikedLoading(true);
                          try {
                            const nextPage = likedPage + 1;
                            const res = await api.posts.getLikedPosts(currentUser.id, { limit: 10, page: nextPage });
                            const newPosts = (res as any)?.data?.posts || (res as any)?.posts || [];
                            setLikedPosts((prev) => [...prev, ...newPosts]);
                            const total = (res as any)?.data?.pagination?.total || (res as any)?.pagination?.total || 0;
                            const accumulated = [...likedPosts, ...newPosts].length;
                            setLikedHasMore(accumulated < total);
                            setLikedPage(nextPage);
                          } finally {
                            setLikedLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {likedLoading ? 'Loading...' : likedHasMore ? 'Load more' : 'No more liked posts'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                {/* Bookmarked Tab */}
                <TabPanel value={tab} index={3}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Bookmark /> Saved Posts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Posts you've saved for later are private and only visible to you.
                    </Typography>
                  </Box>

                  {bookmarkedPosts.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.info.main, 0.2)}`,
                      }}
                    >
                      <Bookmark sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No saved posts yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Save posts to read them later. They'll appear here.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {bookmarkedPosts.map((p) => (
                        <Fade in={true} timeout={300} key={p.id}>
                          <Box>
                            <PostCard post={p as any} />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {bookmarkedPosts.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!bookmarkedHasMore || bookmarkedLoading}
                        onClick={async () => {
                          if (!isOwnProfile || !currentUser?.id) return;
                          setBookmarkedLoading(true);
                          try {
                            const nextPage = bookmarkedPage + 1;
                            const res = await api.posts.getBookmarkedPosts(currentUser.id, { limit: 10, page: nextPage });
                            const newPosts = (res as any)?.data?.posts || (res as any)?.posts || [];
                            setBookmarkedPosts((prev) => [...prev, ...newPosts]);
                            const total = (res as any)?.data?.pagination?.total || (res as any)?.pagination?.total || 0;
                            const accumulated = [...bookmarkedPosts, ...newPosts].length;
                            setBookmarkedHasMore(accumulated < total);
                            setBookmarkedPage(nextPage);
                          } finally {
                            setBookmarkedLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {bookmarkedLoading ? 'Loading...' : bookmarkedHasMore ? 'Load more' : 'No more bookmarks'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel value={tab} index={4}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Edit /> About
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isOwnProfile ? "Edit your profile information" : `Learn more about ${profile.displayName || profile.username}`}
                    </Typography>
                  </Box>

                  {isOwnProfile ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        bgcolor: alpha(theme.palette.background.paper, 0.5),
                      }}
                    >
                      <EditAboutSection profile={profile} onProfileUpdated={(u) => setProfile(u as any)} />
                    </Paper>
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      }}
                    >
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Bio
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 2 }}>
                            {profile.bio || 'No bio provided'}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Location
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 2 }}>
                            {profile.location || 'Location not specified'}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Website
                          </Typography>
                          {profile?.website ? (
                            <Typography
                              variant="body1"
                              color="primary"
                              component="a"
                              href={profile.website}
                              target="_blank"
                              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            >
                              {profile.website.replace(/^https?:\/\//, '')}
                            </Typography>
                          ) : (
                            <Typography variant="body1">No website provided</Typography>
                          )}
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Member Since
                          </Typography>
                          <Typography variant="body1">
                            {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'Recently joined'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </TabPanel>

                {/* Followers Tab */}
                <TabPanel value={tab} index={5}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonAdd /> Followers ({profile?.followerCount || 0})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      People who follow {isOwnProfile ? 'you' : `${profile?.displayName || profile?.username}`}
                    </Typography>
                  </Box>

                  {followers.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.secondary.main, 0.2)}`,
                      }}
                    >
                      <PersonAdd sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No followers yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile ? "Share great content to attract followers!" : `${profile?.displayName || profile?.username} doesn't have any followers yet.`}
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {followers.map((u) => (
                        <Fade in={true} timeout={300} key={u.id}>
                          <Box>
                            <UserCard user={u} showFollowButton={true} variant="outlined" size="small" />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {followers.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!followersHasMore || followersLoading}
                        onClick={async () => {
                          if (!profile?.id) return;
                          setFollowersLoading(true);
                          try {
                            const res = await api.users.getFollowers(profile.id, 20, followers.length);
                            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
                            setFollowers((prev) => [...prev, ...list]);
                            const hasMore = list.length === 20;
                            setFollowersHasMore(hasMore);
                          } finally {
                            setFollowersLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {followersLoading ? 'Loading...' : followersHasMore ? 'Load more' : 'No more followers'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                {/* Following Tab */}
                <TabPanel value={tab} index={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonRemove /> Following ({profile?.followingCount || 0})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      People {isOwnProfile ? 'you follow' : `${profile?.displayName || profile?.username} follows`}
                    </Typography>
                  </Box>

                  {following.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        borderRadius: 2,
                        border: `1px dashed ${alpha(theme.palette.info.main, 0.2)}`,
                      }}
                    >
                      <PersonRemove sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Not following anyone yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isOwnProfile ? "Discover and follow interesting people!" : `${profile?.displayName || profile?.username} isn't following anyone yet.`}
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {following.map((u) => (
                        <Fade in={true} timeout={300} key={u.id}>
                          <Box>
                            <UserCard user={u} showFollowButton={true} variant="outlined" size="small" />
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  )}

                  {following.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="outlined"
                        disabled={!followingHasMore || followingLoading}
                        onClick={async () => {
                          if (!profile?.id) return;
                          setFollowingLoading(true);
                          try {
                            const res = await api.users.getFollowing(profile.id, 20, following.length);
                            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
                            setFollowing((prev) => [...prev, ...list]);
                            const hasMore = list.length === 20;
                            setFollowingHasMore(hasMore);
                          } finally {
                            setFollowingLoading(false);
                          }
                        }}
                        sx={{ borderRadius: 2 }}
                      >
                        {followingLoading ? 'Loading...' : followingHasMore ? 'Load more' : 'No more following'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>
              </Paper>
            </Box>
          ) : (
            <Box sx={{ mt: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  p: 3,
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Loading profile content...
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </Zoom>
    </Container>
  );
};

export default SmartProfilePage;

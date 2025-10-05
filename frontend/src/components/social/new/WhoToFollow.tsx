import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Box,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Verified as VerifiedIcon,
  Refresh as RefreshIcon,
  Group as UsersIcon,
  TrendingUp
} from '@mui/icons-material';
import { useUserSuggestions, UserSuggestion } from '@/hooks/useUserSuggestions';
import { useRouter } from 'next/router';
import UserAvatar from '@/components/common/UserAvatar';

interface WhoToFollowProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  query?: string;
}

const WhoToFollow: React.FC<WhoToFollowProps> = ({
  limit = 5,
  showHeader = true,
  compact = false,
  query = ''
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { suggestions, loading, error, followUser, refreshSuggestions } = useUserSuggestions({ limit, search: query });

  // Apply simple client-side filtering by displayName/username when query provided
  const normalizedQuery = (query || '').trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? suggestions.filter((s) =>
      (s.displayName || '').toLowerCase().includes(normalizedQuery) ||
      (s.username || '').toLowerCase().includes(normalizedQuery)
    )
    : suggestions;

  const handleFollowUser = async (user: UserSuggestion) => {
    const result = await followUser(user.id);
    if (result.success) {
      // Optionally show success message
      console.log(`Successfully followed ${user.displayName}`);
    } else {
      // Optionally show error message
      console.error(`Failed to follow ${user.displayName}:`, result.error);
    }
  };

  const handleViewProfile = (username: string) => {
    router.push(`/profile/${username}`);
  };

  if (error) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={refreshSuggestions}
            startIcon={<RefreshIcon />}
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <CardContent sx={{ pb: 0 }}>
        {showHeader && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UsersIcon sx={{ marginRight: 1, fontSize: 20 }} />
                <Typography variant="h6" component="h2" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                  Who to Follow
                </Typography>
              </Box>
              <Tooltip title="Refresh suggestions">
                <IconButton
                  size="small"
                  onClick={refreshSuggestions}
                  disabled={loading}
                  sx={{ 
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 0 }} />
          </>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0 }}>
            <CircularProgress size={24} />
          </Box>
        ) : visibleSuggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 0 }}>
            {normalizedQuery ? `No results for '${normalizedQuery}'` : 'No suggestions available'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {visibleSuggestions.map((user, index) => (
              <Box key={user.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0, borderRadius: 2, '&:hover': { bgcolor: alpha(theme.palette.divider, 0.3) } }}>
                  {/* Avatar */}
                  <UserAvatar
                    src={user.avatar}
                    alt={user.displayName}
                    size={40}
                    isVerified={user.isVerified}
                    onClick={() => handleViewProfile(user.username)}
                  />

                  {/* User Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{
                          fontWeight: 700,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                          fontSize: '0.9rem'
                        }}
                        onClick={() => handleViewProfile(user.username)}
                      >
                        {user.displayName}
                      </Typography>
                      {user.isVerified && (
                        <Tooltip title="Verified User">
                          <Box 
                            component="span" 
                            sx={{ 
                              width: 16, 
                              height: 16, 
                              bgcolor: 'primary.main', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center' 
                            }}
                          >
                            <Box component="span" sx={{ color: 'white', fontSize: '0.6rem', fontWeight: 'bold' }}>✓</Box>
                          </Box>
                        </Tooltip>
                      )}
                      {user.isOnline && (
                        <Tooltip title="Online">
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                              ml: 0.5,
                              border: `2px solid ${theme.palette.background.paper}`,
                              boxShadow: '0 0 0 2px success.main'
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5, fontSize: '0.8rem' }}
                    >
                      @{user.username}
                    </Typography>

                    {/* Follower count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {user.followerCount?.toLocaleString() || 0} followers
                      </Typography>
                    </Box>
                  </Box>

                  {/* Follow Button */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleFollowUser(user)}
                    sx={{ 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 600,
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      fontSize: '0.8rem'
                    }}
                  >
                    Follow
                  </Button>
                </Box>

                {/* Divider except for last item */}
                {index < visibleSuggestions.length - 1 && (
                  <Divider sx={{ my: 0.5 }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoToFollow;
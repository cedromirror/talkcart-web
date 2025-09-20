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
  Tooltip
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Verified as VerifiedIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUserSuggestions, UserSuggestion } from '../../hooks/useUserSuggestions';
import { useRouter } from 'next/router';
import UserAvatar from '../common/UserAvatar';

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
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={refreshSuggestions}
            startIcon={<RefreshIcon />}
            fullWidth
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: compact ? 1 : 2 }}>
        {showHeader && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" component="h2">
                Who to Follow
              </Typography>
              <Tooltip title="Refresh suggestions">
                <IconButton
                  size="small"
                  onClick={refreshSuggestions}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : visibleSuggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            {normalizedQuery ? `No results for '${normalizedQuery}'` : 'No suggestions available'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 1 : 2 }}>
            {visibleSuggestions.map((user, index) => (
              <Box key={user.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {/* Avatar */}
                  <UserAvatar
                    src={user.avatar}
                    alt={user.displayName}
                    size={compact ? 32 : 40}
                    isVerified={user.isVerified}
                    onClick={() => handleViewProfile(user.username)}
                  />

                  {/* User Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography
                        variant={compact ? 'body2' : 'subtitle2'}
                        component="span"
                        sx={{
                          fontWeight: 600,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                        onClick={() => handleViewProfile(user.username)}
                      >
                        {user.displayName}
                      </Typography>
                      {user.isVerified && (
                        <VerifiedIcon
                          sx={{
                            fontSize: compact ? 14 : 16,
                            color: 'primary.main'
                          }}
                        />
                      )}
                      {user.isOnline && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            ml: 0.5
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: compact ? 0 : 0.5 }}
                    >
                      @{user.username}
                    </Typography>

                    {!compact && user.bio && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.5
                        }}
                      >
                        {user.bio}
                      </Typography>
                    )}

                    {!compact && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {user.followerCount} followers
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.postCount} posts
                        </Typography>
                      </Box>
                    )}

                    <Chip
                      label={user.suggestionReason}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.7rem',
                        height: compact ? 20 : 24,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  </Box>

                  {/* Follow Button */}
                  <Button
                    variant="outlined"
                    size={compact ? 'small' : 'medium'}
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleFollowUser(user)}
                    sx={{
                      minWidth: compact ? 80 : 100,
                      borderRadius: 2
                    }}
                  >
                    Follow
                  </Button>
                </Box>

                {/* Divider between users (except last) */}
                {index < suggestions.length - 1 && (
                  <Divider sx={{ mt: compact ? 1 : 2 }} />
                )}
              </Box>
            ))}
          </Box>
        )}

        {!compact && suggestions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="text"
              fullWidth
              onClick={() => router.push('/explore/people')}
              sx={{ borderRadius: 2 }}
            >
              Show more
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoToFollow;
import React, { useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Avatar,
  Button,
  useTheme,
  alpha,
  Skeleton,
  Chip,
} from '@mui/material';
import { Users } from 'lucide-react';
import { useRouter } from 'next/router';
import { useUserSuggestions } from '@/hooks/useUserSuggestions';
import UserAvatar from '../common/UserAvatar';

const SuggestedUsers: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();

  // Fetch real suggestions from backend
  const { suggestions, loading, error, followUser } = useUserSuggestions({ limit: 5 });

  // Track follow-in-progress to prevent double clicks
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const showDividerAfter = useMemo(() => suggestions.length - 1, [suggestions.length]);

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  const handleFollow = async (userId: string) => {
    try {
      setPending((p) => ({ ...p, [userId]: true }));
      await followUser(userId);
    } finally {
      setPending((p) => ({ ...p, [userId]: false }));
    }
  };

  const renderSkeleton = () => (
    <>
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', mb: 1 }}>
            <Skeleton variant="circular" width={44} height={44} sx={{ mr: 1.5 }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Skeleton variant="text" width={140} height={22} />
                  <Skeleton variant="text" width={90} height={16} />
                </Box>
                <Skeleton variant="rounded" width={84} height={30} sx={{ borderRadius: 5 }} />
              </Box>
              <Skeleton variant="text" width={240} height={16} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          {i !== 2 && <Divider sx={{ mt: 2 }} />}
        </Box>
      ))}
    </>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Users size={20} style={{ marginRight: 8, color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight={700}>
          Who to Follow
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {loading && renderSkeleton()}

      {!loading && error && (
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
      )}

      {!loading && !error && suggestions.map((user, index) => (
        <Box key={user.id} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
          <Box
            sx={{
              display: 'flex',
              mb: 1,
              p: 1,
              borderRadius: 2,
              transition: 'background-color 120ms ease, border-color 120ms ease',
              border: `1px solid transparent`,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                borderColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <Box sx={{ mr: 1.5 }}>
              <UserAvatar
                src={user.avatar || undefined}
                alt={user.displayName}
                size={44}
                isVerified={user.isVerified}
                isOnline={user.isOnline}
                onClick={() => handleUserClick(user.username)}
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      noWrap
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleUserClick(user.username)}
                    >
                      {user.displayName}
                    </Typography>
                    {user.isVerified && (
                      <Chip
                        label="Verified"
                        size="small"
                        color="primary"
                        sx={{ height: 20, borderRadius: 1.5, fontSize: '0.65rem', px: 0.5 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    @{user.username}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  sx={{
                    minWidth: 84,
                    px: 2,
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                  onClick={() => handleFollow(user.id)}
                  disabled={!!pending[user.id]}
                >
                  {pending[user.id] ? 'Following…' : 'Follow'}
                </Button>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, fontSize: '0.8rem' }}
                noWrap
                title={user.bio || user.suggestionReason}
              >
                {user.bio || (user.isOnline ? 'Online now' : user.suggestionReason)}
              </Typography>
            </Box>
          </Box>
          {index !== showDividerAfter && (
            <Divider sx={{ mt: 2 }} />
          )}
        </Box>
      ))}

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button
          size="small"
          sx={{ textTransform: 'none', color: theme.palette.text.secondary, '&:hover': { textDecoration: 'underline' } }}
          onClick={() => router.push('/people')}
        >
          Show more
        </Button>
      </Box>
    </Paper>
  );
};

export default SuggestedUsers;

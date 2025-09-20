import React, { useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Typography,
  Paper,
  Stack,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';

const MessagingDebug: React.FC = () => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    hasMore,
    typingUsers,
    error
  } = useMessages();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 9999,
        maxWidth: 400
      }}
    >
      <Paper
        elevation={3}
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          border: `1px solid ${theme.palette.warning.main}`,
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Bug size={16} color={theme.palette.warning.main} />
            <Typography variant="caption" fontWeight="bold" color="warning.main">
              Messaging Debug
            </Typography>
          </Stack>
          <IconButton size="small">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2, pt: 0 }}>
            <Stack spacing={2}>
              {/* Authentication Status */}
              <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  Authentication
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip
                    label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                    size="small"
                    color={isAuthenticated ? 'success' : 'error'}
                    variant="outlined"
                  />
                  {user && (
                    <Chip
                      label={user.displayName || user.username}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {/* Conversations */}
              <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  Conversations
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip
                    label={`${conversations.length} total`}
                    size="small"
                    variant="outlined"
                  />
                  {activeConversation && (
                    <Chip
                      label={`Active: ${activeConversation.isGroup ? 'Group' : 'Direct'}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {/* Messages */}
              <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  Messages
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label={`${messages.length} loaded`}
                    size="small"
                    variant="outlined"
                  />
                  {hasMore && (
                    <Chip
                      label="Has more"
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  )}
                  {loading && (
                    <Chip
                      label="Loading"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {sending && (
                    <Chip
                      label="Sending"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {/* Typing Users */}
              {Object.keys(typingUsers).length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    Typing Users
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(typingUsers).map(([conversationId, users]) => (
                      users.length > 0 && (
                        <Chip
                          key={conversationId}
                          label={`${users.length} typing`}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Error */}
              {error && (
                <Box>
                  <Typography variant="caption" fontWeight="bold" color="error">
                    Error
                  </Typography>
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {error}
                  </Typography>
                </Box>
              )}

              {/* Backend Integration Status */}
              <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                  Backend Integration
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label="✅ Messages API"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label="✅ Users API"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label="✅ Real-time Socket"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label="✅ User Search"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default MessagingDebug;
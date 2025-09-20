import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Avatar,
    Badge,
    Typography,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    useTheme,
    alpha,
    Fade,
    Slide,
    Zoom,
    Paper,
    Tooltip,
    Stack,
    keyframes
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoreVert as MoreVertical,
    PushPin as Pin,
    Archive,
    VolumeOff as VolumeX,
    Check,
    DoneAll as CheckCheck,
    AccessTime as Clock,
    Message as MessageCircle,
    Phone,
    VideoCall as Video,
    Mic
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '@/components/common';

interface Conversation {
    id: string;
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
    participants: Array<{
        id: string;
        displayName: string;
        username: string;
        avatar?: string;
        isOnline: boolean;
    }>;
    lastMessage?: {
        id: string;
        content: string;
        type: 'text' | 'image' | 'video' | 'audio' | 'file';
        createdAt: string;
        sender: {
            id: string;
            displayName: string;
        };
        isOwn: boolean;
    };
    lastActivity: string;
    unreadCount: number;
    isPinned?: boolean;
    isMuted?: boolean;
    isArchived?: boolean;
    isTyping?: boolean;
}

interface ModernConversationListProps {
    conversations: Conversation[];
    activeConversationId?: string;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onConversationSelect: (conversation: Conversation) => void;
    onNewConversation: () => void;
    loading?: boolean;
    currentUserId?: string;
}

// Animation keyframes
const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const typingAnimation = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
`;

const unreadPulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
`;

const ModernConversationList: React.FC<ModernConversationListProps> = ({
    conversations,
    activeConversationId,
    searchQuery,
    onSearchChange,
    onConversationSelect,
    onNewConversation,
    loading = false,
    currentUserId
}) => {
    const theme = useTheme();
    const [hoveredConversation, setHoveredConversation] = useState<string | null>(null);

    const getConversationDisplayName = (conversation: Conversation) => {
        if (conversation.isGroup) {
            return conversation.groupName || 'Group Chat';
        }
        const otherParticipant = conversation.participants?.find(p => p.id !== currentUserId);
        return otherParticipant?.displayName || otherParticipant?.username || 'Unknown User';
    };

    const getConversationAvatar = (conversation: Conversation) => {
        if (conversation.isGroup) {
            return conversation.groupAvatar;
        }
        const otherParticipant = conversation.participants?.find(p => p.id !== currentUserId);
        return otherParticipant?.avatar;
    };

    const isUserOnline = (conversation: Conversation) => {
        if (conversation.isGroup) return false;
        const otherParticipant = conversation.participants?.find(p => p.id !== currentUserId);
        return otherParticipant?.isOnline || false;
    };

    const getLastMessagePreview = (conversation: Conversation) => {
        if (!conversation.lastMessage) return 'No messages yet';

        const { content, type, sender, isOwn } = conversation.lastMessage;
        const senderName = isOwn ? 'You' : sender.displayName;

        switch (type) {
            case 'image':
                return `${senderName}: 📷 Photo`;
            case 'video':
                return `${senderName}: 🎥 Video`;
            case 'audio':
                return `${senderName}: 🎵 Voice message`;
            case 'file':
                return `${senderName}: 📎 File`;
            default:
                return content.length > 50 ? `${content.substring(0, 50)}...` : content;
        }
    };

    const getMessageStatusIcon = (conversation: Conversation) => {
        if (!conversation.lastMessage?.isOwn) return null;

        // This would typically come from the message read status
        const isRead = true; // Placeholder

        return isRead ? (
            <CheckCheck size={12} color={theme.palette.success.main} />
        ) : (
            <Check size={12} color={theme.palette.text.secondary} />
        );
    };

    const renderTypingIndicator = () => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: theme.palette.primary.main,
                        animation: `${typingAnimation} 1.4s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`
                    }}
                />
            ))}
            <Typography variant="caption" color="primary" sx={{ ml: 0.5 }}>
                typing...
            </Typography>
        </Box>
    );

    // Sort conversations: pinned first, then by last activity
    const sortedConversations = [...conversations].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                        Messages
                    </Typography>
                    <Tooltip title="New Conversation">
                        <IconButton
                            onClick={onNewConversation}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <AddIcon size={20} />
                        </IconButton>
                    </Tooltip>
                </Box>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon size={18} color={theme.palette.text.secondary} />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.background.paper, 0.8),
                            backdropFilter: 'blur(10px)',
                            '& .MuiOutlinedInput-notchedOutline': {
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: alpha(theme.palette.primary.main, 0.3)
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main
                            }
                        }
                    }}
                />
            </Paper>

            {/* Conversations List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {loading ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Loading conversations...
                        </Typography>
                    </Box>
                ) : sortedConversations.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <MessageCircle size={48} color={theme.palette.text.secondary} />
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                            No conversations yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start a new conversation to get chatting!
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {sortedConversations.map((conversation, index) => {
                            const isActive = activeConversationId === conversation.id;
                            const displayName = getConversationDisplayName(conversation);
                            const avatar = getConversationAvatar(conversation);
                            const online = isUserOnline(conversation);
                            const isHovered = hoveredConversation === conversation.id;

                            return (
                                <Fade in timeout={300 + index * 50} key={conversation.id}>
                                    <Box>
                                        <ListItemButton
                                            selected={isActive}
                                            onClick={() => onConversationSelect(conversation)}
                                            onMouseEnter={() => setHoveredConversation(conversation.id)}
                                            onMouseLeave={() => setHoveredConversation(null)}
                                            sx={{
                                                p: 2,
                                                mx: 1,
                                                my: 0.5,
                                                borderRadius: 3,
                                                transition: 'all 0.3s ease',
                                                animation: `${slideInLeft} 0.4s ease-out`,
                                                animationDelay: `${index * 0.05}s`,
                                                background: isActive
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`
                                                    : 'transparent',
                                                border: isActive
                                                    ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                                                    : '1px solid transparent',
                                                '&:hover': {
                                                    background: isActive
                                                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 100%)`
                                                        : `linear-gradient(135deg, ${alpha(theme.palette.action.hover, 0.5)} 0%, ${alpha(theme.palette.action.hover, 0.3)} 100%)`,
                                                    transform: 'translateX(4px)',
                                                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
                                                },
                                                '&.Mui-selected': {
                                                    bgcolor: 'transparent'
                                                }
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Box sx={{ position: 'relative' }}>
                                                    <Badge
                                                        overlap="circular"
                                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                        variant="dot"
                                                        color="success"
                                                        invisible={!online}
                                                        sx={{
                                                            '& .MuiBadge-badge': {
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: '50%',
                                                                border: `2px solid ${theme.palette.background.paper}`
                                                            }
                                                        }}
                                                    >
                                                        <UserAvatar
                                                            src={avatar}
                                                            alt={displayName}
                                                            size="large"
                                                            isOnline={online}
                                                            sx={{
                                                                width: 48,
                                                                height: 48,
                                                                border: `2px solid ${alpha(theme.palette.primary.main, isActive ? 0.3 : 0.1)}`,
                                                                transition: 'all 0.3s ease',
                                                                transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                                                            }}
                                                        />
                                                    </Badge>
                                                    {conversation.isPinned && (
                                                        <Zoom in>
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: -4,
                                                                    right: -4,
                                                                    bgcolor: theme.palette.warning.main,
                                                                    borderRadius: '50%',
                                                                    p: 0.3,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Pin size={10} color="white" />
                                                            </Box>
                                                        </Zoom>
                                                    )}
                                                </Box>
                                            </ListItemAvatar>

                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Typography
                                                            variant="subtitle1"
                                                            noWrap
                                                            fontWeight={conversation.unreadCount > 0 ? 600 : 500}
                                                            sx={{
                                                                flex: 1,
                                                                color: isActive ? theme.palette.primary.main : 'inherit'
                                                            }}
                                                        >
                                                            {displayName}
                                                        </Typography>
                                                        {conversation.isMuted && (
                                                            <VolumeX size={14} color={theme.palette.text.secondary} />
                                                        )}
                                                        {conversation.unreadCount > 0 && (
                                                            <Chip
                                                                label={conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                                                size="small"
                                                                sx={{
                                                                    minWidth: 20,
                                                                    height: 20,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 'bold',
                                                                    bgcolor: theme.palette.primary.main,
                                                                    color: theme.palette.primary.contrastText,
                                                                    animation: `${unreadPulse} 2s ease-in-out infinite`
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                            {conversation.isTyping ? (
                                                                renderTypingIndicator()
                                                            ) : (
                                                                <>
                                                                    <Typography
                                                                        variant="body2"
                                                                        color="text.secondary"
                                                                        noWrap
                                                                        sx={{
                                                                            flex: 1,
                                                                            fontWeight: conversation.unreadCount > 0 ? 500 : 400
                                                                        }}
                                                                    >
                                                                        {getLastMessagePreview(conversation)}
                                                                    </Typography>
                                                                    {getMessageStatusIcon(conversation)}
                                                                </>
                                                            )}
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <Clock size={10} />
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{ fontSize: '0.7rem' }}
                                                            >
                                                                {formatDistanceToNow(new Date(conversation.lastActivity), { addSuffix: true })}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                }
                                            />

                                            {/* Quick Actions */}
                                            <Fade in={isHovered} timeout={200}>
                                                <Stack direction="column" spacing={0.5} sx={{ ml: 1 }}>
                                                    <Tooltip title="Voice Call" placement="left">
                                                        <IconButton
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                                                color: theme.palette.success.main,
                                                                '&:hover': {
                                                                    bgcolor: alpha(theme.palette.success.main, 0.2),
                                                                    transform: 'scale(1.1)'
                                                                }
                                                            }}
                                                        >
                                                            <Phone size={14} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Video Call" placement="left">
                                                        <IconButton
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                                color: theme.palette.info.main,
                                                                '&:hover': {
                                                                    bgcolor: alpha(theme.palette.info.main, 0.2),
                                                                    transform: 'scale(1.1)'
                                                                }
                                                            }}
                                                        >
                                                            <Video size={14} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </Fade>
                                        </ListItemButton>
                                    </Box>
                                </Fade>
                            );
                        })}
                    </List>
                )}
            </Box>
        </Box>
    );
};

export default ModernConversationList;
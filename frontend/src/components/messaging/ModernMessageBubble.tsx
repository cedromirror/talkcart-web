import React, { useState, useRef } from 'react';
import {
    Box,
    Stack,
    Typography,
    Avatar,
    Paper,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip,
    useTheme,
    alpha,
    Dialog,
    DialogContent,
    DialogActions,
    Button,
    Tooltip,
    Fade,
    Zoom,
    Slide,
    keyframes
} from '@mui/material';
import {
    Reply,
    Forward,
    Edit,
    Trash2,
    Copy,
    MoreVertical,
    Check,
    CheckCheck,
    Play,
    Pause,
    Download,
    FileText,
    Image as ImageIcon,
    Video as VideoIcon,
    Music,
    File as FileIcon,
    Volume2,
    VolumeX,
    Heart,
    ThumbsUp,
    Smile,
    Clock,
    Eye
} from 'lucide-react';
import { Message } from '@/types/message';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ModernMessageBubbleProps {
    message: Message;
    showAvatar?: boolean;
    onReply?: () => void;
    onEdit?: (messageId: string, content: string) => Promise<boolean>;
    onDelete?: (messageId: string) => Promise<boolean>;
    onReaction?: (messageId: string, emoji: string) => Promise<boolean>;
    onForward?: () => void;
}

// Animation keyframes
const messageSlideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const reactionPop = keyframes`
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

const typingDots = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
`;

const ModernMessageBubble: React.FC<ModernMessageBubbleProps> = ({
    message,
    showAvatar = true,
    onReply,
    onEdit,
    onDelete,
    onReaction,
    onForward
}) => {
    const theme = useTheme();
    const { user } = useAuth();
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [showReactions, setShowReactions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [showImageDialog, setShowImageDialog] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleEdit = async () => {
        if (onEdit && editContent.trim() !== message.content) {
            const success = await onEdit(message.id, editContent.trim());
            if (success) {
                setIsEditing(false);
            }
        } else {
            setIsEditing(false);
        }
    };

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete(message.id);
        }
        handleMenuClose();
    };

    const handleReaction = async (emoji: string) => {
        if (onReaction) {
            await onReaction(message.id, emoji);
        }
        setShowReactions(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        handleMenuClose();
    };

    const getMessageTime = () => {
        try {
            const messageDate = new Date(message.createdAt);
            const now = new Date();
            const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
                return format(messageDate, 'HH:mm');
            } else {
                return format(messageDate, 'MMM dd, HH:mm');
            }
        } catch {
            return '';
        }
    };

    const getReadStatus = () => {
        if (!message.isOwn) return null;

        const readByOthers = message.readBy?.filter(read => read.userId !== user?.id) || [];

        if (readByOthers.length > 0) {
            return (
                <Tooltip title="Read">
                    <CheckCheck size={14} color={theme.palette.success.main} />
                </Tooltip>
            );
        } else {
            return (
                <Tooltip title="Delivered">
                    <Check size={14} color={theme.palette.text.secondary} />
                </Tooltip>
            );
        }
    };

    const getMediaIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon size={16} />;
            case 'video': return <VideoIcon size={16} />;
            case 'audio': return <Music size={16} />;
            default: return <FileIcon size={16} />;
        }
    };

    const renderMediaContent = () => {
        if (!message.media || message.media.length === 0) return null;

        return (
            <Box sx={{ mt: message.content ? 1 : 0 }}>
                {message.media.map((media, index) => {
                    switch (media.type) {
                        case 'image':
                            return (
                                <Zoom in timeout={300} key={index}>
                                    <Box
                                        sx={{
                                            mb: 1,
                                            cursor: 'pointer',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            '&:hover': {
                                                '& .image-overlay': {
                                                    opacity: 1
                                                }
                                            }
                                        }}
                                    >
                                        <img
                                            src={media.url}
                                            alt={media.filename}
                                            style={{
                                                width: '100%',
                                                maxHeight: 300,
                                                borderRadius: 12,
                                                objectFit: 'cover',
                                                transition: 'transform 0.3s ease'
                                            }}
                                            onClick={() => {
                                                setSelectedImage(media.url);
                                                setShowImageDialog(true);
                                            }}
                                        />
                                        <Box
                                            className="image-overlay"
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
                                                opacity: 0,
                                                transition: 'opacity 0.3s ease',
                                                display: 'flex',
                                                alignItems: 'flex-end',
                                                p: 1
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'white',
                                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                                }}
                                            >
                                                {media.filename}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Zoom>
                            );

                        case 'video':
                            return (
                                <Zoom in timeout={300} key={index}>
                                    <Box sx={{ mb: 1, borderRadius: 3, overflow: 'hidden' }}>
                                        <video
                                            controls
                                            style={{
                                                width: '100%',
                                                maxHeight: 300,
                                                borderRadius: 12
                                            }}
                                        >
                                            <source src={media.url} />
                                            Your browser does not support the video tag.
                                        </video>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'block',
                                                mt: 0.5,
                                                opacity: 0.8,
                                                px: 1
                                            }}
                                        >
                                            {media.filename}
                                        </Typography>
                                    </Box>
                                </Zoom>
                            );

                        default:
                            return (
                                <Slide direction="up" in timeout={300} key={index}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            mb: 1,
                                            borderRadius: 3,
                                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                                                borderColor: theme.palette.primary.main
                                            }
                                        }}
                                        onClick={() => window.open(media.url, '_blank')}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    p: 1,
                                                    borderRadius: 2,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    color: theme.palette.primary.main
                                                }}
                                            >
                                                {getMediaIcon(media.type)}
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {media.filename}
                                                </Typography>
                                                {media.fileSize && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {(media.fileSize / 1024 / 1024).toFixed(1)} MB
                                                    </Typography>
                                                )}
                                            </Box>
                                            <IconButton size="small" color="primary">
                                                <Download size={16} />
                                            </IconButton>
                                        </Box>
                                    </Paper>
                                </Slide>
                            );
                    }
                })}
            </Box>
        );
    };

    const commonReactions = [
        { emoji: '👍', label: 'Like' },
        { emoji: '❤️', label: 'Love' },
        { emoji: '😂', label: 'Laugh' },
        { emoji: '😮', label: 'Wow' },
        { emoji: '😢', label: 'Sad' },
        { emoji: '😡', label: 'Angry' }
    ];

    return (
        <>
            <Fade in timeout={300}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: message.isOwn ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: 1.5,
                        mb: 1,
                        animation: `${messageSlideIn} 0.4s ease-out`,
                        '&:hover .message-actions': {
                            opacity: 1,
                            transform: 'translateX(0)'
                        }
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Avatar */}
                    {showAvatar && !message.isOwn && (
                        <Zoom in timeout={200}>
                            <Avatar
                                src={message.sender.avatar}
                                sx={{
                                    width: 36,
                                    height: 36,
                                    border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'scale(1.1)',
                                        borderColor: theme.palette.primary.main
                                    }
                                }}
                            >
                                {message.sender.displayName.charAt(0).toUpperCase()}
                            </Avatar>
                        </Zoom>
                    )}
                    {!showAvatar && !message.isOwn && (
                        <Box sx={{ width: 36 }} />
                    )}

                    {/* Message Content */}
                    <Box
                        sx={{
                            maxWidth: '75%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: message.isOwn ? 'flex-end' : 'flex-start'
                        }}
                    >
                        {/* Sender Name (for group chats) */}
                        {showAvatar && !message.isOwn && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    mb: 0.5,
                                    ml: 1,
                                    fontWeight: 500,
                                    opacity: 0.8
                                }}
                            >
                                {message.sender.displayName}
                            </Typography>
                        )}

                        {/* Reply Preview */}
                        {message.replyTo && (
                            <Slide direction={message.isOwn ? 'left' : 'right'} in timeout={300}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        mb: 1,
                                        maxWidth: '100%',
                                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                                        borderRadius: 2,
                                        backdropFilter: 'blur(10px)'
                                    }}
                                >
                                    <Typography variant="caption" color="primary" fontWeight="bold">
                                        {message.replyTo.sender?.displayName || 'Unknown'}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            opacity: 0.8
                                        }}
                                    >
                                        {message.replyTo.content}
                                    </Typography>
                                </Paper>
                            </Slide>
                        )}

                        {/* Message Bubble */}
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: message.content ? 2 : 1,
                                    borderRadius: 4,
                                    background: message.isOwn
                                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                                        : theme.palette.mode === 'dark'
                                            ? `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.grey[700]} 100%)`
                                            : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                                    color: message.isOwn
                                        ? theme.palette.primary.contrastText
                                        : theme.palette.text.primary,
                                    border: message.isOwn
                                        ? 'none'
                                        : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    position: 'relative',
                                    minWidth: message.content ? 'auto' : 0,
                                    boxShadow: message.isOwn
                                        ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                                        : `0 2px 10px ${alpha(theme.palette.grey[500], 0.1)}`,
                                    transition: 'all 0.3s ease',
                                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                                    '&::before': message.isOwn ? {
                                        content: '""',
                                        position: 'absolute',
                                        right: -8,
                                        bottom: 8,
                                        width: 0,
                                        height: 0,
                                        borderLeft: `8px solid ${theme.palette.primary.main}`,
                                        borderTop: '8px solid transparent',
                                        borderBottom: '8px solid transparent'
                                    } : {
                                        content: '""',
                                        position: 'absolute',
                                        left: -8,
                                        bottom: 8,
                                        width: 0,
                                        height: 0,
                                        borderRight: `8px solid ${theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper}`,
                                        borderTop: '8px solid transparent',
                                        borderBottom: '8px solid transparent'
                                    }
                                }}
                            >
                                {/* Forwarded Message Indicator */}
                                {message.isForwarded && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                        <Forward size={12} />
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontStyle: 'italic',
                                                opacity: 0.8,
                                                fontSize: '0.7rem'
                                            }}
                                        >
                                            Forwarded
                                        </Typography>
                                    </Box>
                                )}

                                {/* Message Content */}
                                {message.isDeleted ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.6 }}>
                                        <Trash2 size={14} />
                                        <Typography
                                            variant="body2"
                                            sx={{ fontStyle: 'italic' }}
                                        >
                                            This message was deleted
                                        </Typography>
                                    </Box>
                                ) : isEditing ? (
                                    <input
                                        type="text"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEdit();
                                            } else if (e.key === 'Escape') {
                                                setIsEditing(false);
                                                setEditContent(message.content);
                                            }
                                        }}
                                        onBlur={handleEdit}
                                        autoFocus
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            outline: 'none',
                                            color: 'inherit',
                                            font: 'inherit',
                                            width: '100%',
                                            fontSize: '14px'
                                        }}
                                    />
                                ) : message.content ? (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            wordBreak: 'break-word',
                                            lineHeight: 1.4,
                                            fontSize: '14px'
                                        }}
                                    >
                                        {message.content}
                                    </Typography>
                                ) : null}

                                {/* Media Content */}
                                {renderMediaContent()}

                                {/* Message Info */}
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                    sx={{
                                        mt: message.content || message.media?.length ? 0.5 : 0,
                                        justifyContent: 'flex-end',
                                        opacity: 0.8
                                    }}
                                >
                                    {message.isEdited && (
                                        <Chip
                                            label="edited"
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: '0.6rem',
                                                bgcolor: alpha(theme.palette.background.paper, 0.2),
                                                color: 'inherit'
                                            }}
                                        />
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Clock size={10} />
                                        <Typography
                                            variant="caption"
                                            sx={{ fontSize: '0.7rem' }}
                                        >
                                            {getMessageTime()}
                                        </Typography>
                                    </Box>
                                    {getReadStatus()}
                                </Stack>
                            </Paper>

                            {/* Quick Actions */}
                            <Fade in={isHovered} timeout={200}>
                                <Box
                                    className="message-actions"
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 0.5,
                                        opacity: 0,
                                        transform: message.isOwn ? 'translateX(10px)' : 'translateX(-10px)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <Tooltip title="Add Reaction" placement={message.isOwn ? 'left' : 'right'}>
                                        <IconButton
                                            size="small"
                                            onClick={() => setShowReactions(!showReactions)}
                                            sx={{
                                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                                                backdropFilter: 'blur(10px)',
                                                '&:hover': {
                                                    bgcolor: theme.palette.background.paper,
                                                    transform: 'scale(1.1)'
                                                }
                                            }}
                                        >
                                            <Smile size={14} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="More Options" placement={message.isOwn ? 'left' : 'right'}>
                                        <IconButton
                                            size="small"
                                            onClick={handleMenuOpen}
                                            sx={{
                                                bgcolor: alpha(theme.palette.background.paper, 0.9),
                                                backdropFilter: 'blur(10px)',
                                                '&:hover': {
                                                    bgcolor: theme.palette.background.paper,
                                                    transform: 'scale(1.1)'
                                                }
                                            }}
                                        >
                                            <MoreVertical size={14} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Fade>
                        </Box>

                        {/* Reactions */}
                        {message.reactions && Object.keys(message.reactions).length > 0 && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{
                                    mt: 0.5,
                                    ml: message.isOwn ? 0 : 1,
                                    mr: message.isOwn ? 1 : 0
                                }}
                            >
                                {Object.entries(message.reactions).map(([emoji, users]) => (
                                    <Chip
                                        key={emoji}
                                        label={`${emoji} ${users.length}`}
                                        size="small"
                                        clickable
                                        onClick={() => handleReaction(emoji)}
                                        sx={{
                                            height: 24,
                                            fontSize: '0.7rem',
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                            animation: `${reactionPop} 0.3s ease-out`,
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    />
                                ))}
                            </Stack>
                        )}

                        {/* Quick Reactions */}
                        {showReactions && (
                            <Fade in timeout={200}>
                                <Paper
                                    elevation={8}
                                    sx={{
                                        p: 1,
                                        mt: 1,
                                        borderRadius: 3,
                                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                                        backdropFilter: 'blur(20px)',
                                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                                    }}
                                >
                                    <Stack direction="row" spacing={0.5}>
                                        {commonReactions.map(({ emoji, label }) => (
                                            <Tooltip key={emoji} title={label}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleReaction(emoji)}
                                                    sx={{
                                                        fontSize: '1.2rem',
                                                        '&:hover': {
                                                            transform: 'scale(1.3)',
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1)
                                                        }
                                                    }}
                                                >
                                                    {emoji}
                                                </IconButton>
                                            </Tooltip>
                                        ))}
                                    </Stack>
                                </Paper>
                            </Fade>
                        )}
                    </Box>
                </Box>
            </Fade>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 180,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                    }
                }}
            >
                {onReply && (
                    <MenuItem onClick={() => { onReply(); handleMenuClose(); }}>
                        <ListItemIcon><Reply size={16} /></ListItemIcon>
                        <ListItemText>Reply</ListItemText>
                    </MenuItem>
                )}
                {onForward && (
                    <MenuItem onClick={() => { onForward(); handleMenuClose(); }}>
                        <ListItemIcon><Forward size={16} /></ListItemIcon>
                        <ListItemText>Forward</ListItemText>
                    </MenuItem>
                )}
                <MenuItem onClick={handleCopy}>
                    <ListItemIcon><Copy size={16} /></ListItemIcon>
                    <ListItemText>Copy</ListItemText>
                </MenuItem>
                {message.isOwn && onEdit && (
                    <MenuItem onClick={() => { setIsEditing(true); handleMenuClose(); }}>
                        <ListItemIcon><Edit size={16} /></ListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </MenuItem>
                )}
                {message.isOwn && onDelete && (
                    <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                        <ListItemIcon><Trash2 size={16} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            {/* Image Dialog */}
            <Dialog
                open={showImageDialog}
                onClose={() => setShowImageDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogContent sx={{ p: 0, bgcolor: 'transparent' }}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Full size"
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: 12
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), backdropFilter: 'blur(20px)' }}>
                    <Button onClick={() => setShowImageDialog(false)}>Close</Button>
                    <Button onClick={() => selectedImage && window.open(selectedImage, '_blank')}>
                        Download
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ModernMessageBubble;
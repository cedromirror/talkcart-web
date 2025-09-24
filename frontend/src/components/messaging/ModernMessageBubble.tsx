import React, { useState } from 'react';
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
import { format } from 'date-fns';
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

// Common reaction emojis with labels
const commonReactions = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🔥', label: 'Fire' }
];

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
                                            p: message.content ? 2 : 1,
                                            borderRadius: message.isOwn ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                                            background: message.isOwn
                                                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 10%, ${alpha(theme.palette.primary.dark, 0.95)} 90%)`
                                                : theme.palette.mode === 'dark'
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.grey[800], 0.85)} 0%, ${alpha(theme.palette.grey[700], 0.9)} 100%)`
                                                    : `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
                                            color: message.isOwn
                                                ? theme.palette.primary.contrastText
                                                : theme.palette.text.primary,
                                            border: message.isOwn
                                                ? `1px solid ${alpha(theme.palette.primary.light, 0.2)}`
                                                : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                            position: 'relative',
                                            minWidth: message.content ? 'auto' : 0,
                                            maxWidth: '70%',
                                            boxShadow: message.isOwn
                                                ? `0 6px 18px ${alpha(theme.palette.primary.main, 0.3)}`
                                                : `0 4px 14px ${alpha(theme.palette.grey[500], 0.12)}`,
                                            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            transform: isHovered ? 'translateY(-3px) scale(1.01)' : 'translateY(0) scale(1)',
                                            backdropFilter: 'blur(10px)',
                                            animation: `${messageSlideIn} 0.4s ease-out`,
                                            '&:hover': {
                                                boxShadow: message.isOwn
                                                    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                                                    : `0 6px 18px ${alpha(theme.palette.grey[500], 0.2)}`
                                            },
                                            '&::before': message.isOwn ? {
                                                content: '""',
                                                position: 'absolute',
                                                right: -10,
                                                bottom: 10,
                                                width: 0,
                                                height: 0,
                                                borderLeft: `10px solid ${theme.palette.primary.dark}`,
                                                borderTop: '10px solid transparent',
                                                borderBottom: '10px solid transparent',
                                                filter: 'drop-shadow(3px 3px 3px rgba(0,0,0,0.15))'
                                            } : {
                                                content: '""',
                                                position: 'absolute',
                                                left: -10,
                                                bottom: 10,
                                                width: 0,
                                                height: 0,
                                                borderRight: `10px solid ${theme.palette.mode === 'dark' ? alpha(theme.palette.grey[800], 0.9) : alpha(theme.palette.background.paper, 0.95)}`,
                                                borderTop: '10px solid transparent',
                                                borderBottom: '10px solid transparent',
                                                filter: 'drop-shadow(-3px 3px 3px rgba(0,0,0,0.08))'
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
                                    <Fade in={isHovered} timeout={250}>
                                        <Box
                                            className="message-actions"
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.7,
                                                opacity: 0,
                                                transform: message.isOwn ? 'translateX(10px)' : 'translateX(-10px)',
                                                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                            }}
                                        >
                                            <Tooltip title="Add Reaction" placement={message.isOwn ? 'left' : 'right'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setShowReactions(!showReactions)}
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                                                        backdropFilter: 'blur(12px)',
                                                        boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
                                                        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                        '&:hover': {
                                                            bgcolor: theme.palette.background.paper,
                                                            transform: 'scale(1.15)',
                                                            boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                                                        }
                                                    }}
                                                >
                                                    <Smile size={14} color={theme.palette.primary.main} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="More Options" placement={message.isOwn ? 'left' : 'right'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleMenuOpen}
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                                                        backdropFilter: 'blur(12px)',
                                                        boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
                                                        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                        '&:hover': {
                                                            bgcolor: theme.palette.background.paper,
                                                            transform: 'scale(1.15)',
                                                            boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`
                                                        }
                                                    }}
                                                >
                                                    <MoreVertical size={14} color={theme.palette.primary.main} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Fade>
                                </Box>

                                {/* Reactions */}
                                {message.reactions && Object.keys(message.reactions).length > 0 && (
                                    <Stack
                                        direction="row"
                                        spacing={0.7}
                                        sx={{
                                            mt: 0.7,
                                            ml: message.isOwn ? 0 : 1.5,
                                            mr: message.isOwn ? 1.5 : 0
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
                                                    height: 26,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                                    boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.15)}`,
                                                    animation: `${reactionPop} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`,
                                                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                        transform: 'scale(1.08)',
                                                        boxShadow: `0 3px 8px ${alpha(theme.palette.primary.main, 0.25)}`
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}

                                {/* Quick Reactions */}
                                {showReactions && (
                                    <Fade in timeout={250}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.2,
                                                mt: 1.2,
                                                borderRadius: 4,
                                                bgcolor: alpha(theme.palette.background.paper, 0.95),
                                                backdropFilter: 'blur(20px)',
                                                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                                                animation: `${messageSlideIn} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)`
                                            }}
                                        >
                                            <Stack direction="row" spacing={0.8}>
                                                {commonReactions.map(({ emoji, label }) => (
                                                    <Tooltip key={emoji} title={label}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleReaction(emoji)}
                                                            sx={{
                                                                fontSize: '1.25rem',
                                                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                                '&:hover': {
                                                                    transform: 'scale(1.35)',
                                                                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                                                                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`
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
                        </Slide>
                    </Box>
                </Box>
            </Fade>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                TransitionComponent={Fade}
                transitionDuration={250}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        minWidth: 200,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                        boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                        overflow: 'hidden',
                        '& .MuiMenuItem-root': {
                            transition: 'background-color 0.2s ease',
                            px: 2,
                            py: 1.2
                        }
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
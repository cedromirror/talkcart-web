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
    Tooltip
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
    VolumeX
} from 'lucide-react';
import { Message } from '@/types/message';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import VoiceMessageBubble from './VoiceMessageBubble';

interface EnhancedMessageBubbleV2Props {
    message: Message;
    showAvatar?: boolean;
    onReply?: () => void;
    onEdit?: (messageId: string, content: string) => Promise<boolean>;
    onDelete?: (messageId: string) => Promise<boolean>;
    onReaction?: (messageId: string, emoji: string) => Promise<boolean>;
    onForward?: () => void;
}

const EnhancedMessageBubbleV2: React.FC<EnhancedMessageBubbleV2Props> = ({
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
    const [audioStates, setAudioStates] = useState<Record<string, { playing: boolean; currentTime: number; duration: number; muted: boolean }>>({});
    const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

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
            return <CheckCheck size={14} color={theme.palette.primary.main} />;
        } else {
            return <Check size={14} color={theme.palette.text.secondary} />;
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAudioPlay = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        const currentState = audioStates[mediaUrl] || { playing: false, currentTime: 0, duration: 0, muted: false };

        if (currentState.playing) {
            audio.pause();
        } else {
            // Pause all other audio elements
            Object.values(audioRefs.current).forEach(otherAudio => {
                if (otherAudio !== audio) {
                    otherAudio.pause();
                }
            });
            audio.play();
        }
    };

    const handleAudioTimeUpdate = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                ...prev[mediaUrl],
                currentTime: audio.currentTime,
                duration: audio.duration || 0
            }
        }));
    };

    const handleAudioLoadedMetadata = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                ...prev[mediaUrl],
                duration: audio.duration
            }
        }));
    };

    const handleAudioEnded = (mediaUrl: string) => {
        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                ...prev[mediaUrl],
                playing: false,
                currentTime: 0
            }
        }));
    };

    const toggleMute = (mediaUrl: string) => {
        const audio = audioRefs.current[mediaUrl];
        if (!audio) return;

        audio.muted = !audio.muted;
        setAudioStates(prev => ({
            ...prev,
            [mediaUrl]: {
                ...prev[mediaUrl],
                muted: audio.muted
            }
        }));
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
                    const mediaKey = `${message.id}-${index}`;
                    const audioState = audioStates[media.url] || { playing: false, currentTime: 0, duration: 0, muted: false };

                    switch (media.type) {
                        case 'image':
                            return (
                                <Box key={index} sx={{ mb: 1, cursor: 'pointer' }}>
                                    <img
                                        src={media.url}
                                        alt={media.filename}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 300,
                                            borderRadius: 12,
                                            objectFit: 'cover'
                                        }}
                                        onClick={() => {
                                            setSelectedImage(media.url);
                                            setShowImageDialog(true);
                                        }}
                                    />
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                                        {media.filename}
                                    </Typography>
                                </Box>
                            );

                        case 'video':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <video
                                        controls
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 300,
                                            borderRadius: 12
                                        }}
                                    >
                                        <source src={media.url} />
                                        Your browser does not support the video tag.
                                    </video>
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                                        {media.filename}
                                    </Typography>
                                </Box>
                            );

                        case 'audio':
                            // Use the new VoiceMessageBubble for audio files
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <VoiceMessageBubble
                                        audioUrl={media.url}
                                        filename={media.filename}
                                        isOwn={message.isOwn}
                                        timestamp={getMessageTime()}
                                        onDownload={() => window.open(media.url, '_blank')}
                                        onForward={onForward}
                                        onReply={onReply}
                                        onDelete={message.isOwn ? () => handleDelete() : undefined}
                                    />
                                </Box>
                            );

                        default:
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.background.paper, 0.5),
                                            border: `1px solid ${theme.palette.divider}`,
                                            cursor: 'pointer',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.background.paper, 0.7),
                                            }
                                        }}
                                        onClick={() => window.open(media.url, '_blank')}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getMediaIcon(media.type)}
                                            <Typography variant="body2" sx={{ flex: 1 }}>
                                                {media.filename}
                                            </Typography>
                                            <Download size={14} />
                                        </Box>
                                    </Paper>
                                </Box>
                            );
                    }
                })}
            </Box>
        );
    };

    const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    // If this is a voice message (audio type), render it differently
    if (message.type === 'audio' && message.media && message.media.length > 0) {
        const audioMedia = message.media[0];
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: message.isOwn ? 'row' : 'row-reverse',
                    alignItems: 'flex-end',
                    gap: 1,
                    mb: 1,
                }}
            >
                {/* Avatar */}
                {showAvatar && !message.isOwn && (
                    <Avatar
                        src={message.sender.avatar}
                        sx={{ width: 32, height: 32 }}
                    >
                        {message.sender.displayName.charAt(0).toUpperCase()}
                    </Avatar>
                )}
                {!showAvatar && !message.isOwn && (
                    <Box sx={{ width: 32 }} />
                )}

                {/* Voice Message Content */}
                <Box
                    sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.isOwn ? 'flex-start' : 'flex-end'
                    }}
                >
                    {/* Sender Name (for group chats) */}
                    {showAvatar && !message.isOwn && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, ml: 1 }}
                        >
                            {message.sender.displayName}
                        </Typography>
                    )}

                    <VoiceMessageBubble
                        audioUrl={audioMedia.url}
                        filename={audioMedia.filename}
                        isOwn={message.isOwn}
                        timestamp={getMessageTime()}
                        onDownload={() => window.open(audioMedia.url, '_blank')}
                        onForward={onForward}
                        onReply={onReply}
                        onDelete={message.isOwn ? () => handleDelete() : undefined}
                    />

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                                <Chip
                                    key={emoji}
                                    label={`${emoji} ${count}`}
                                    size="small"
                                    clickable
                                    onClick={() => handleReaction(emoji)}
                                    sx={{
                                        height: 24,
                                        fontSize: '0.7rem',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
                </Box>
            </Box>
        );
    }

    // Regular message rendering (text, images, videos, files)
    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: message.isOwn ? 'row' : 'row-reverse',
                    alignItems: 'flex-end',
                    gap: 1,
                    mb: 0.5,
                    '&:hover .message-actions': {
                        opacity: 1
                    }
                }}
            >
                {/* Avatar */}
                {showAvatar && !message.isOwn && (
                    <Avatar
                        src={message.sender.avatar}
                        sx={{ width: 32, height: 32 }}
                    >
                        {message.sender.displayName.charAt(0).toUpperCase()}
                    </Avatar>
                )}
                {!showAvatar && !message.isOwn && (
                    <Box sx={{ width: 32 }} />
                )}

                {/* Message Content */}
                <Box
                    sx={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: message.isOwn ? 'flex-start' : 'flex-end'
                    }}
                >
                    {/* Sender Name (for group chats) */}
                    {showAvatar && !message.isOwn && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, ml: 1 }}
                        >
                            {message.sender.displayName}
                        </Typography>
                    )}

                    {/* Reply Preview */}
                    {message.replyTo && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 1,
                                mb: 0.5,
                                maxWidth: '100%',
                                borderLeft: `3px solid ${theme.palette.primary.main}`,
                                backgroundColor: alpha(theme.palette.background.paper, 0.5),
                                borderRadius: 2
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
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {message.replyTo.content}
                            </Typography>
                        </Paper>
                    )}

                    {/* Message Bubble */}
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: message.content ? 1.5 : 0,
                                borderRadius: 3,
                                backgroundColor: message.isOwn
                                    ? theme.palette.primary.main
                                    : theme.palette.background.paper,
                                color: message.isOwn
                                    ? theme.palette.primary.contrastText
                                    : theme.palette.text.primary,
                                border: message.isOwn
                                    ? 'none'
                                    : `1px solid ${theme.palette.divider}`,
                                position: 'relative',
                                minWidth: message.content ? 'auto' : 0
                            }}
                        >
                            {/* Forwarded Message Indicator */}
                            {message.isForwarded && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: 'block',
                                        fontStyle: 'italic',
                                        opacity: 0.7,
                                        mb: 0.5
                                    }}
                                >
                                    Forwarded
                                </Typography>
                            )}

                            {/* Message Content */}
                            {message.isDeleted ? (
                                <Typography
                                    variant="body2"
                                    sx={{ fontStyle: 'italic', opacity: 0.7 }}
                                >
                                    This message was deleted
                                </Typography>
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
                                        width: '100%'
                                    }}
                                />
                            ) : message.content ? (
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                    {message.content}
                                </Typography>
                            ) : null}

                            {/* Media Content */}
                            {renderMediaContent()}

                            {/* Message Info */}
                            {message.content && (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                    sx={{ mt: 0.5, justifyContent: 'flex-end' }}
                                >
                                    {message.isEdited && (
                                        <Typography
                                            variant="caption"
                                            sx={{ opacity: 0.7, fontSize: '0.7rem' }}
                                        >
                                            edited
                                        </Typography>
                                    )}
                                    <Typography
                                        variant="caption"
                                        sx={{ opacity: 0.7, fontSize: '0.7rem' }}
                                    >
                                        {getMessageTime()}
                                    </Typography>
                                    {getReadStatus()}
                                </Stack>
                            )}
                        </Paper>

                        {/* Message Actions */}
                        <Box
                            className="message-actions"
                            sx={{
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                display: 'flex',
                                gap: 0.5
                            }}
                        >
                            <IconButton
                                size="small"
                                onClick={() => onReply?.()}
                                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                                title="Reply"
                            >
                                <Reply size={14} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => setShowReactions(!showReactions)}
                                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                                title="React"
                            >
                                <Typography sx={{ fontSize: '0.8rem' }}>😊</Typography>
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => onForward?.()}
                                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                                title="Forward"
                            >
                                <Forward size={14} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={handleMenuOpen}
                                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                                title="More options"
                            >
                                <MoreVertical size={14} />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            {Object.entries(
                                message.reactions.reduce((acc, reaction) => {
                                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                                <Chip
                                    key={emoji}
                                    label={`${emoji} ${count}`}
                                    size="small"
                                    clickable
                                    onClick={() => handleReaction(emoji)}
                                    sx={{
                                        height: 24,
                                        fontSize: '0.7rem',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    {/* Reaction Picker */}
                    {showReactions && (
                        <Paper
                            elevation={3}
                            sx={{
                                p: 1,
                                mt: 1,
                                display: 'flex',
                                gap: 0.5,
                                borderRadius: 2
                            }}
                        >
                            {commonReactions.map((emoji) => (
                                <IconButton
                                    key={emoji}
                                    size="small"
                                    onClick={() => handleReaction(emoji)}
                                >
                                    <Typography sx={{ fontSize: '1rem' }}>{emoji}</Typography>
                                </IconButton>
                            ))}
                        </Paper>
                    )}
                </Box>

                {/* Context Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => { handleMenuClose(); onReply?.(); }}>
                        <ListItemIcon>
                            <Reply size={16} />
                        </ListItemIcon>
                        <ListItemText>Reply</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={() => { handleMenuClose(); onForward?.(); }}>
                        <ListItemIcon>
                            <Forward size={16} />
                        </ListItemIcon>
                        <ListItemText>Forward</ListItemText>
                    </MenuItem>

                    <MenuItem onClick={handleCopy}>
                        <ListItemIcon>
                            <Copy size={16} />
                        </ListItemIcon>
                        <ListItemText>Copy</ListItemText>
                    </MenuItem>

                    {message.isOwn && !message.isDeleted && (
                        <MenuItem onClick={() => { handleMenuClose(); setIsEditing(true); }}>
                            <ListItemIcon>
                                <Edit size={16} />
                            </ListItemIcon>
                            <ListItemText>Edit</ListItemText>
                        </MenuItem>
                    )}

                    {message.isOwn && (
                        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                            <ListItemIcon>
                                <Trash2 size={16} color={theme.palette.error.main} />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    )}
                </Menu>
            </Box>

            {/* Image Dialog */}
            <Dialog
                open={showImageDialog}
                onClose={() => setShowImageDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ p: 0 }}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Full size"
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '80vh',
                                objectFit: 'contain'
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowImageDialog(false)}>Close</Button>
                    {selectedImage && (
                        <Button onClick={() => window.open(selectedImage, '_blank')}>
                            Download
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

export default EnhancedMessageBubbleV2;
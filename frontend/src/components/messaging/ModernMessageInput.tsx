import React, { useState, useRef, useCallback } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    alpha,
    Tooltip,
    Fade,
    Zoom,
    CircularProgress,
    Typography,
    Chip,
    Stack,
    keyframes
} from '@mui/material';
import {
    Send,
    AttachFile,
    EmojiEmotions,
    Mic,
    MicOff,
    Image as ImageIcon,
    VideoCall as VideoIcon,
    Description as FileText,
    CameraAlt as Camera,
    AttachFile as Paperclip,
    EmojiEmotions as Smile,
    Add as Plus,
    Close as X
} from '@mui/icons-material';

interface ModernMessageInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    onTyping?: () => void;
    placeholder?: string;
    disabled?: boolean;
    sending?: boolean;
    onFileUpload?: (files: FileList) => void;
    onVoiceRecord?: (audioBlob: Blob) => void;
    maxLength?: number;
    showTypingIndicator?: boolean;
    typingUsers?: string[];
}

// Animation keyframes
const sendButtonPulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const recordingPulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const attachmentSlide = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const ModernMessageInput: React.FC<ModernMessageInputProps> = ({
    value,
    onChange,
    onSend,
    onTyping,
    placeholder = "Type a message...",
    disabled = false,
    sending = false,
    onFileUpload,
    onVoiceRecord,
    maxLength = 1000,
    showTypingIndicator = false,
    typingUsers = []
}) => {
    const theme = useTheme();
    const [attachmentMenu, setAttachmentMenu] = useState<null | HTMLElement>(null);
    const [emojiMenu, setEmojiMenu] = useState<null | HTMLElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showAttachments, setShowAttachments] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const textFieldRef = useRef<HTMLInputElement>(null);

    const handleSend = useCallback(() => {
        if (value.trim() && !disabled && !sending) {
            onSend();
        }
    }, [value, disabled, sending, onSend]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (newValue.length <= maxLength) {
            onChange(newValue);
            onTyping?.();
        }
    };

    const handleFileSelect = (type: 'file' | 'image' | 'video') => {
        const inputRef = type === 'image' ? imageInputRef : type === 'video' ? videoInputRef : fileInputRef;
        inputRef.current?.click();
        setAttachmentMenu(null);
        setShowAttachments(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && onFileUpload) {
            onFileUpload(files);
        }
        // Reset input
        e.target.value = '';
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                onVoiceRecord?.(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const formatRecordingTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '❤️', '🎉', '🔥', '💯', '✨'];

    const attachmentOptions = [
        { icon: <ImageIcon />, label: 'Photo', type: 'image' as const, color: theme.palette.success.main },
        { icon: <VideoIcon />, label: 'Video', type: 'video' as const, color: theme.palette.info.main },
        { icon: <FileText />, label: 'Document', type: 'file' as const, color: theme.palette.warning.main },
        { icon: <Camera />, label: 'Camera', type: 'camera' as const, color: theme.palette.error.main }
    ];

    return (
        <Box>
            {/* Typing Indicator */}
            {showTypingIndicator && typingUsers.length > 0 && (
                <Fade in>
                    <Box sx={{ px: 2, py: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                        </Typography>
                    </Box>
                </Fade>
            )}

            {/* Main Input Container */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                    backdropFilter: 'blur(20px)',
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 0
                }}
            >
                {/* Attachment Options */}
                {showAttachments && (
                    <Fade in timeout={200}>
                        <Box sx={{ mb: 2 }}>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                {attachmentOptions.map((option, index) => (
                                    <Zoom in timeout={200 + index * 50} key={option.type}>
                                        <Tooltip title={option.label}>
                                            <IconButton
                                                onClick={() => handleFileSelect(option.type)}
                                                sx={{
                                                    bgcolor: alpha(option.color, 0.1),
                                                    color: option.color,
                                                    animation: `${attachmentSlide} 0.3s ease-out`,
                                                    animationDelay: `${index * 0.05}s`,
                                                    '&:hover': {
                                                        bgcolor: alpha(option.color, 0.2),
                                                        transform: 'scale(1.1)'
                                                    }
                                                }}
                                            >
                                                {option.icon}
                                            </IconButton>
                                        </Tooltip>
                                    </Zoom>
                                ))}
                            </Stack>
                        </Box>
                    </Fade>
                )}

                {/* Input Row */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    {/* Attachment Button */}
                    <Tooltip title="Attachments">
                        <IconButton
                            onClick={() => setShowAttachments(!showAttachments)}
                            sx={{
                                bgcolor: showAttachments ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                color: showAttachments ? theme.palette.primary.main : theme.palette.text.secondary,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    transform: 'rotate(45deg)'
                                }
                            }}
                        >
                            {showAttachments ? <X /> : <Plus />}
                        </IconButton>
                    </Tooltip>

                    {/* Text Input */}
                    <Box sx={{ flex: 1, position: 'relative' }}>
                        <TextField
                            ref={textFieldRef}
                            fullWidth
                            multiline
                            maxRows={4}
                            value={value}
                            onChange={handleChange}
                            onKeyPress={handleKeyPress}
                            placeholder={placeholder}
                            disabled={disabled || isRecording}
                            variant="outlined"
                            size="small"
                            InputProps={{
                                sx: {
                                    borderRadius: 6,
                                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                                    backdropFilter: 'blur(10px)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: alpha(theme.palette.primary.main, 0.3)
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: theme.palette.primary.main,
                                        borderWidth: 2
                                    },
                                    '& .MuiInputBase-input': {
                                        fontSize: '14px',
                                        lineHeight: 1.4
                                    }
                                }
                            }}
                        />

                        {/* Character Counter */}
                        {value.length > maxLength * 0.8 && (
                            <Fade in>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        bottom: -20,
                                        right: 8,
                                        color: value.length >= maxLength ? 'error.main' : 'text.secondary',
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    {value.length}/{maxLength}
                                </Typography>
                            </Fade>
                        )}
                    </Box>

                    {/* Emoji Button */}
                    <Tooltip title="Emoji">
                        <IconButton
                            onClick={(e) => setEmojiMenu(e.currentTarget)}
                            sx={{
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    color: theme.palette.warning.main,
                                    transform: 'scale(1.1)'
                                }
                            }}
                        >
                            <EmojiEmotions />
                        </IconButton>
                    </Tooltip>

                    {/* Voice Recording */}
                    {onVoiceRecord && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isRecording && (
                                <Fade in>
                                    <Chip
                                        label={formatRecordingTime(recordingTime)}
                                        size="small"
                                        sx={{
                                            bgcolor: theme.palette.error.main,
                                            color: 'white',
                                            animation: `${recordingPulse} 1s ease-in-out infinite`
                                        }}
                                    />
                                </Fade>
                            )}
                            <Tooltip title={isRecording ? "Stop Recording" : "Voice Message"}>
                                <IconButton
                                    onClick={isRecording ? stopRecording : startRecording}
                                    sx={{
                                        bgcolor: isRecording ? theme.palette.error.main : alpha(theme.palette.primary.main, 0.1),
                                        color: isRecording ? 'white' : theme.palette.primary.main,
                                        animation: isRecording ? `${recordingPulse} 1s ease-in-out infinite` : 'none',
                                        '&:hover': {
                                            bgcolor: isRecording ? theme.palette.error.dark : alpha(theme.palette.primary.main, 0.2),
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    {isRecording ? <MicOff /> : <Mic />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    {/* Send Button */}
                    <Tooltip title="Send Message">
                        <span>
                            <IconButton
                                onClick={handleSend}
                                disabled={!value.trim() || disabled || sending || isRecording}
                                sx={{
                                    bgcolor: value.trim() && !disabled && !sending ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.1),
                                    color: value.trim() && !disabled && !sending ? 'white' : theme.palette.text.secondary,
                                    animation: value.trim() && !disabled && !sending ? `${sendButtonPulse} 2s ease-in-out infinite` : 'none',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        bgcolor: value.trim() && !disabled && !sending ? theme.palette.primary.dark : alpha(theme.palette.text.secondary, 0.2),
                                        transform: value.trim() && !disabled && !sending ? 'scale(1.1)' : 'scale(1)'
                                    },
                                    '&:disabled': {
                                        bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                        color: theme.palette.text.secondary
                                    }
                                }}
                            >
                                {sending ? <CircularProgress size={20} color="inherit" /> : <Send />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Paper>

            {/* Hidden File Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Emoji Menu */}
            <Menu
                anchorEl={emojiMenu}
                open={Boolean(emojiMenu)}
                onClose={() => setEmojiMenu(null)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        p: 1
                    }
                }}
            >
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
                    {commonEmojis.map((emoji) => (
                        <IconButton
                            key={emoji}
                            onClick={() => {
                                onChange(value + emoji);
                                setEmojiMenu(null);
                                textFieldRef.current?.focus();
                            }}
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
                    ))}
                </Box>
            </Menu>
        </Box>
    );
};

export default ModernMessageInput;
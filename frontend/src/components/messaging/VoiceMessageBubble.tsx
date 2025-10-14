import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Paper,
    useTheme,
    alpha,
    Tooltip,
    Slider,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Chip
} from '@mui/material';
import {
    Play,
    Pause,
    MoreVertical,
    Mic,
    FileAudio,
    Reply,
    Forward
} from 'lucide-react';

interface VoiceMessageBubbleProps {
    audioUrl: string;
    filename: string;
    duration?: number;
    fileSize?: number;
    isOwn: boolean;
    timestamp: string;
    onDownload?: () => void;
    onDelete?: () => void;
    onForward?: () => void;
    onReply?: () => void;
}

const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
    audioUrl,
    filename,
    duration = 0,
    fileSize,
    isOwn,
    timestamp,
    onDownload,
    onDelete,
    onForward,
    onReply
}) => {
    const theme = useTheme();
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);
    const [isLoading, setIsLoading] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    // Removed waveform generation

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setAudioDuration(audio.duration);
            setIsLoading(false);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        const handleLoadStart = () => {
            setIsLoading(true);
        };

        const handleCanPlay = () => {
            setIsLoading(false);
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('canplay', handleCanPlay);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('loadstart', handleLoadStart);
            audio.removeEventListener('canplay', handleCanPlay);
        };
    }, []);

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play();
            setIsPlaying(true);
        }
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const audio = audioRef.current;
        if (!audio) return;

        const seekTime = (newValue as number) * audioDuration / 100;
        audio.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleSkip = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = Math.max(0, Math.min(audioDuration, currentTime + seconds));
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const changePlaybackRate = (rate: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = rate;
        setPlaybackRate(rate);
        setMenuAnchor(null);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    // Handle known missing files
    const isKnownMissingFile = audioUrl && typeof audioUrl === 'string' && (
      audioUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
      audioUrl.includes('file_1760163879851_tt3fdqqim9') ||
      audioUrl.includes('file_1760263843073_w13593s5t8l') ||
      audioUrl.includes('file_1760276276250_3pqeekj048s')
    );

    // If it's a known missing file, hide the element
    if (isKnownMissingFile) {
        console.warn('Known missing file detected in voice message, hiding element:', audioUrl);
        return null; // Don't render anything for known missing files
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover .voice-message-actions': {
                    opacity: 1
                }
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 0.75,
                    borderRadius: 2,
                    minWidth: 100,
                    maxWidth: 140,
                    bgcolor: isOwn
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.background.paper, 0.8),
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        bgcolor: isOwn ? theme.palette.primary.main : theme.palette.secondary.main,
                        opacity: 0.6
                    }
                }}
            >
                {/* Ultra Compact Header with inline layout */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                            onClick={handlePlayPause}
                            disabled={isLoading}
                            sx={{
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                width: 20,
                                height: 20,
                                minWidth: 'unset',
                                '&:hover': {
                                    bgcolor: theme.palette.primary.dark,
                                },
                                '&.Mui-disabled': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                                }
                            }}
                        >
                            {isLoading ? (
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        border: `1px solid ${theme.palette.primary.contrastText}`,
                                        borderTop: '1px solid transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        '@keyframes spin': {
                                            '0%': { transform: 'rotate(0deg)' },
                                            '100%': { transform: 'rotate(360deg)' }
                                        }
                                    }}
                                />
                            ) : isPlaying ? (
                                <Pause size={10} />
                            ) : (
                                <Play size={10} />
                            )}
                        </IconButton>
                        <Mic size={8} color={theme.palette.primary.main} />
                        <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ fontSize: '0.6rem' }}>Voice</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                            {formatTime(currentTime)} / {formatTime(audioDuration)}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 }, width: 16, height: 16, minWidth: 'unset' }}
                        >
                            <MoreVertical size={8} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Removed Waveform - Using simple progress bar instead */}

                {/* Removed duplicate controls - now integrated in header */}

                {/* Minimal Progress Bar */}
                <Box sx={{ px: 0.5, mb: 0 }}>
                    <Slider
                        value={progress}
                        onChange={handleSeek}
                        size="small"
                        sx={{
                            height: 1.5,
                            '& .MuiSlider-track': {
                                bgcolor: theme.palette.primary.main,
                                border: 'none'
                            },
                            '& .MuiSlider-rail': {
                                bgcolor: alpha(theme.palette.text.secondary, 0.15)
                            },
                            '& .MuiSlider-thumb': {
                                width: 4,
                                height: 4,
                                bgcolor: theme.palette.primary.main,
                                '&:hover': {
                                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`
                                }
                            }
                        }}
                    />
                </Box>

                {/* Removed Footer - timestamp already in main message */}

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    style={{ display: 'none' }}
                />

                {/* Simplified Context Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => changePlaybackRate(0.75)}>0.75x Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1)}>Normal Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.25)}>1.25x Speed</MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.5)}>1.5x Speed</MenuItem>

                    {onReply && (
                        <MenuItem onClick={() => { onReply(); setMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Reply size={16} />
                            </ListItemIcon>
                            <ListItemText>Reply</ListItemText>
                        </MenuItem>
                    )}

                    {onForward && (
                        <MenuItem onClick={() => { onForward(); setMenuAnchor(null); }}>
                            <ListItemIcon>
                                <Forward size={16} />
                            </ListItemIcon>
                            <ListItemText>Forward</ListItemText>
                        </MenuItem>
                    )}

                    {onDelete && (
                        <MenuItem
                            onClick={() => { onDelete(); setMenuAnchor(null); }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <FileAudio size={16} color={theme.palette.error.main} />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    )}
                </Menu>
            </Paper>

            {/* Quick Action Buttons */}
            <Box
                className="voice-message-actions"
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
                    onClick={() => onForward?.()}
                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                    title="Forward"
                >
                    <Forward size={14} />
                </IconButton>
            </Box>
        </Box>
    );
};

export default VoiceMessageBubble;
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
    Download,
    MoreVertical,
    Volume2,
    VolumeX,
    SkipBack,
    SkipForward,
    Mic,
    Clock,
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
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [waveformData, setWaveformData] = useState<number[]>([]);

    // Generate mock waveform data (in a real app, this would come from audio analysis)
    useEffect(() => {
        const generateWaveform = () => {
            const bars = 40;
            const data = Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
            setWaveformData(data);
        };
        generateWaveform();
    }, []);

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

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.muted = !audio.muted;
        setIsMuted(audio.muted);
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
                    p: 2,
                    borderRadius: 3,
                    minWidth: 280,
                    maxWidth: 350,
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
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                p: 0.5,
                                borderRadius: '50%',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Mic size={14} color={theme.palette.primary.main} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                            Voice Message
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {fileSize && (
                            <Chip
                                label={formatFileSize(fileSize)}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: alpha(theme.palette.background.paper, 0.5)
                                }}
                            />
                        )}
                        <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                            <MoreVertical size={14} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Waveform Visualization */}
                <Box sx={{ mb: 2, px: 1 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'end',
                            gap: 0.5,
                            height: 40,
                            cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            const seekTime = percentage * audioDuration;
                            if (audioRef.current) {
                                audioRef.current.currentTime = seekTime;
                                setCurrentTime(seekTime);
                            }
                        }}
                    >
                        {waveformData.map((height, index) => {
                            const barProgress = (index / waveformData.length) * 100;
                            const isActive = barProgress <= progress;

                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        flex: 1,
                                        height: `${height * 100}%`,
                                        bgcolor: isActive
                                            ? theme.palette.primary.main
                                            : alpha(theme.palette.text.secondary, 0.3),
                                        borderRadius: 1,
                                        transition: 'all 0.2s ease',
                                        minHeight: 4,
                                        transform: isPlaying && isActive ? 'scaleY(1.2)' : 'scaleY(1)',
                                        animation: isPlaying && isActive ? 'pulse 1s infinite' : 'none',
                                        '@keyframes pulse': {
                                            '0%, 100%': { opacity: 1 },
                                            '50%': { opacity: 0.7 }
                                        }
                                    }}
                                />
                            );
                        })}
                    </Box>
                </Box>

                {/* Controls */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {/* Skip Back */}
                    <Tooltip title="Skip back 10s">
                        <IconButton
                            size="small"
                            onClick={() => handleSkip(-10)}
                            disabled={currentTime < 10}
                            sx={{ opacity: currentTime < 10 ? 0.3 : 0.7 }}
                        >
                            <SkipBack size={16} />
                        </IconButton>
                    </Tooltip>

                    {/* Play/Pause */}
                    <IconButton
                        onClick={handlePlayPause}
                        disabled={isLoading}
                        sx={{
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            width: 40,
                            height: 40,
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
                                    width: 16,
                                    height: 16,
                                    border: `2px solid ${theme.palette.primary.contrastText}`,
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' }
                                    }
                                }}
                            />
                        ) : isPlaying ? (
                            <Pause size={18} />
                        ) : (
                            <Play size={18} />
                        )}
                    </IconButton>

                    {/* Skip Forward */}
                    <Tooltip title="Skip forward 10s">
                        <IconButton
                            size="small"
                            onClick={() => handleSkip(10)}
                            disabled={currentTime > audioDuration - 10}
                            sx={{ opacity: currentTime > audioDuration - 10 ? 0.3 : 0.7 }}
                        >
                            <SkipForward size={16} />
                        </IconButton>
                    </Tooltip>

                    {/* Time Display */}
                    <Box sx={{ flex: 1, mx: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {formatTime(currentTime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatTime(audioDuration)}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Mute */}
                    <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                        <IconButton size="small" onClick={toggleMute} sx={{ opacity: 0.7 }}>
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ px: 1, mb: 1 }}>
                    <Slider
                        value={progress}
                        onChange={handleSeek}
                        sx={{
                            height: 4,
                            '& .MuiSlider-track': {
                                bgcolor: theme.palette.primary.main,
                                border: 'none'
                            },
                            '& .MuiSlider-rail': {
                                bgcolor: alpha(theme.palette.text.secondary, 0.2)
                            },
                            '& .MuiSlider-thumb': {
                                width: 12,
                                height: 12,
                                bgcolor: theme.palette.primary.main,
                                '&:hover': {
                                    boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`
                                }
                            }
                        }}
                    />
                </Box>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Clock size={12} />
                        <Typography variant="caption" color="text.secondary">
                            {timestamp}
                        </Typography>
                    </Box>

                    <Chip
                        label={`${playbackRate}x`}
                        size="small"
                        clickable
                        onClick={(e) => setMenuAnchor(e.currentTarget)}
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2)
                            }
                        }}
                    />
                </Box>

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    style={{ display: 'none' }}
                />

                {/* Context Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => changePlaybackRate(0.5)}>
                        <ListItemText>0.5x Speed</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(0.75)}>
                        <ListItemText>0.75x Speed</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1)}>
                        <ListItemText>Normal Speed</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.25)}>
                        <ListItemText>1.25x Speed</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(1.5)}>
                        <ListItemText>1.5x Speed</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => changePlaybackRate(2)}>
                        <ListItemText>2x Speed</ListItemText>
                    </MenuItem>

                    {onDownload && (
                        <>
                            <MenuItem onClick={() => { onDownload(); setMenuAnchor(null); }}>
                                <ListItemIcon>
                                    <Download size={16} />
                                </ListItemIcon>
                                <ListItemText>Download</ListItemText>
                            </MenuItem>
                        </>
                    )}

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
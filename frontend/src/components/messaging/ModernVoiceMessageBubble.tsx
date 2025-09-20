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
    Chip,
    LinearProgress,
    Fade,
    Zoom,
    keyframes
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
    Forward,
    Trash2,
    Headphones,
    Waves
} from 'lucide-react';

interface ModernVoiceMessageBubbleProps {
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

// Animation keyframes
const waveAnimation = keyframes`
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
`;

const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
`;

const ModernVoiceMessageBubble: React.FC<ModernVoiceMessageBubbleProps> = ({
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
    const [isHovered, setIsHovered] = useState(false);

    // Generate mock waveform data
    useEffect(() => {
        const generateWaveform = () => {
            const bars = 50;
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
    }, [audioUrl]);

    const handlePlayPause = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                await audio.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    };

    const handleSeek = (event: Event, newValue: number | number[]) => {
        const audio = audioRef.current;
        if (!audio || Array.isArray(newValue)) return;

        const seekTime = (newValue / 100) * audioDuration;
        audio.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleSpeedChange = (speed: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = speed;
        setPlaybackRate(speed);
        setMenuAnchor(null);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.muted = !audio.muted;
        setIsMuted(audio.muted);
    };

    const skip = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        const newTime = Math.max(0, Math.min(audioDuration, currentTime + seconds));
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgress = () => {
        if (!audioDuration) return 0;
        return (currentTime / audioDuration) * 100;
    };

    const renderWaveform = () => {
        const progress = getProgress();

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3,
                    height: 32,
                    flex: 1,
                    mx: 1,
                    cursor: 'pointer'
                }}
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = (clickX / rect.width) * 100;
                    handleSeek(e.nativeEvent, percentage);
                }}
            >
                {waveformData.map((height, index) => {
                    const barProgress = (index / waveformData.length) * 100;
                    const isActive = barProgress <= progress;

                    return (
                        <Box
                            key={index}
                            sx={{
                                width: 3,
                                height: `${height * 100}%`,
                                bgcolor: isActive
                                    ? (isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main)
                                    : alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.text.secondary, 0.3),
                                borderRadius: 1.5,
                                transition: 'all 0.3s ease',
                                animation: isPlaying && isActive ? `${waveAnimation} 0.8s ease-in-out infinite` : 'none',
                                animationDelay: `${index * 0.05}s`,
                                transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)'
                            }}
                        />
                    );
                })}
            </Box>
        );
    };

    return (
        <>
            <Fade in timeout={300}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        borderRadius: 4,
                        background: isOwn
                            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                            : theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.grey[700]} 100%)`
                                : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                        color: isOwn
                            ? theme.palette.primary.contrastText
                            : theme.palette.text.primary,
                        border: isOwn
                            ? 'none'
                            : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: isOwn
                            ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                            : `0 2px 10px ${alpha(theme.palette.grey[500], 0.1)}`,
                        transition: 'all 0.3s ease',
                        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                        maxWidth: 350,
                        minWidth: 280,
                        position: 'relative',
                        '&::before': isOwn ? {
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
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main, 0.1),
                                color: isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                animation: isPlaying ? `${pulseAnimation} 1.5s ease-in-out infinite` : 'none'
                            }}
                        >
                            <Mic size={16} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.85rem' }}>
                                Voice Message
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                {fileSize && `${(fileSize / 1024 / 1024).toFixed(1)} MB • `}{formatTime(audioDuration)}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{
                                color: 'inherit',
                                opacity: 0.7,
                                '&:hover': { opacity: 1 }
                            }}
                        >
                            <MoreVertical size={16} />
                        </IconButton>
                    </Box>

                    {/* Main Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {/* Skip Back */}
                        <Tooltip title="Skip back 10s">
                            <IconButton
                                size="small"
                                onClick={() => skip(-10)}
                                disabled={currentTime <= 0}
                                sx={{
                                    color: 'inherit',
                                    opacity: currentTime <= 0 ? 0.3 : 0.7,
                                    '&:hover': { opacity: 1, transform: 'scale(1.1)' }
                                }}
                            >
                                <SkipBack size={16} />
                            </IconButton>
                        </Tooltip>

                        {/* Play/Pause Button */}
                        <Zoom in timeout={200}>
                            <IconButton
                                onClick={handlePlayPause}
                                disabled={isLoading}
                                sx={{
                                    bgcolor: alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main, 0.2),
                                    color: 'inherit',
                                    width: 40,
                                    height: 40,
                                    '&:hover': {
                                        bgcolor: alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main, 0.3),
                                        transform: 'scale(1.1)'
                                    },
                                    '&:disabled': {
                                        opacity: 0.5
                                    }
                                }}
                            >
                                {isLoading ? (
                                    <Box
                                        sx={{
                                            width: 20,
                                            height: 20,
                                            border: `2px solid ${alpha('currentColor', 0.3)}`,
                                            borderTop: '2px solid currentColor',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite',
                                            '@keyframes spin': {
                                                '0%': { transform: 'rotate(0deg)' },
                                                '100%': { transform: 'rotate(360deg)' }
                                            }
                                        }}
                                    />
                                ) : isPlaying ? (
                                    <Pause size={20} />
                                ) : (
                                    <Play size={20} />
                                )}
                            </IconButton>
                        </Zoom>

                        {/* Skip Forward */}
                        <Tooltip title="Skip forward 10s">
                            <IconButton
                                size="small"
                                onClick={() => skip(10)}
                                disabled={currentTime >= audioDuration}
                                sx={{
                                    color: 'inherit',
                                    opacity: currentTime >= audioDuration ? 0.3 : 0.7,
                                    '&:hover': { opacity: 1, transform: 'scale(1.1)' }
                                }}
                            >
                                <SkipForward size={16} />
                            </IconButton>
                        </Tooltip>

                        {/* Waveform */}
                        {renderWaveform()}

                        {/* Volume */}
                        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
                            <IconButton
                                size="small"
                                onClick={toggleMute}
                                sx={{
                                    color: 'inherit',
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1, transform: 'scale(1.1)' }
                                }}
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Progress and Time */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8, minWidth: 35 }}>
                            {formatTime(currentTime)}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={getProgress()}
                                sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.text.secondary, 0.2),
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main,
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8, minWidth: 35 }}>
                            {formatTime(audioDuration)}
                        </Typography>
                    </Box>

                    {/* Speed Indicator */}
                    {playbackRate !== 1 && (
                        <Chip
                            label={`${playbackRate}x`}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(isOwn ? theme.palette.primary.contrastText : theme.palette.primary.main, 0.2),
                                color: 'inherit',
                                mb: 1
                            }}
                        />
                    )}

                    {/* Footer */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Clock size={10} />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                {timestamp}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Headphones size={10} />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                {filename}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Hidden Audio Element */}
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="metadata"
                        style={{ display: 'none' }}
                    />
                </Paper>
            </Fade>

            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
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
                <MenuItem onClick={() => handleSpeedChange(0.5)}>
                    <ListItemIcon><Waves size={16} /></ListItemIcon>
                    <ListItemText>0.5x Speed</ListItemText>
                    {playbackRate === 0.5 && <Typography variant="caption">✓</Typography>}
                </MenuItem>
                <MenuItem onClick={() => handleSpeedChange(1)}>
                    <ListItemIcon><Waves size={16} /></ListItemIcon>
                    <ListItemText>Normal Speed</ListItemText>
                    {playbackRate === 1 && <Typography variant="caption">✓</Typography>}
                </MenuItem>
                <MenuItem onClick={() => handleSpeedChange(1.5)}>
                    <ListItemIcon><Waves size={16} /></ListItemIcon>
                    <ListItemText>1.5x Speed</ListItemText>
                    {playbackRate === 1.5 && <Typography variant="caption">✓</Typography>}
                </MenuItem>
                <MenuItem onClick={() => handleSpeedChange(2)}>
                    <ListItemIcon><Waves size={16} /></ListItemIcon>
                    <ListItemText>2x Speed</ListItemText>
                    {playbackRate === 2 && <Typography variant="caption">✓</Typography>}
                </MenuItem>
                <MenuItem divider />
                {onReply && (
                    <MenuItem onClick={() => { onReply(); setMenuAnchor(null); }}>
                        <ListItemIcon><Reply size={16} /></ListItemIcon>
                        <ListItemText>Reply</ListItemText>
                    </MenuItem>
                )}
                {onForward && (
                    <MenuItem onClick={() => { onForward(); setMenuAnchor(null); }}>
                        <ListItemIcon><Forward size={16} /></ListItemIcon>
                        <ListItemText>Forward</ListItemText>
                    </MenuItem>
                )}
                {onDownload && (
                    <MenuItem onClick={() => { onDownload(); setMenuAnchor(null); }}>
                        <ListItemIcon><Download size={16} /></ListItemIcon>
                        <ListItemText>Download</ListItemText>
                    </MenuItem>
                )}
                {onDelete && (
                    <MenuItem onClick={() => { onDelete(); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
                        <ListItemIcon><Trash2 size={16} color={theme.palette.error.main} /></ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};

export default ModernVoiceMessageBubble;
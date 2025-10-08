import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  Fade,
  useTheme,
  alpha,
  Fab,
} from '@mui/material';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import { useVideoFeed } from './VideoFeedManager';
import { getVolumeIcon, getVolumeTooltip } from '@/utils/videoUtils';
import toast from 'react-hot-toast';
import { useMediaMute } from '@/hooks/useMediaMute'; // Import the new hook

interface VideoPostCardProps {
  post: any;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  autoPlay?: boolean;
  showFullControls?: boolean;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const VideoPostCard: React.FC<VideoPostCardProps> = ({
  post,
  onLike,
  onShare,
  onBookmark,
  onComment,
  onUserClick,
  onHashtagClick,
  autoPlay = true,
  showFullControls = true,
  maxHeight = 400,
  className,
  style,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    isLoading: true,
    hasError: false,
    errorMessage: null as string | null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    buffered: 0,
    userInteracted: false,
    viewCount: 0,
  });

  const { 
    registerVideo, 
    unregisterVideo, 
    playVideo, 
    pauseVideo, 
    currentPlayingVideo,
    settings 
  } = useVideoFeed();

  // Use the unified media mute hook - moved after settings is defined
  const { isMuted, toggleMute, setMuted } = useMediaMute({
    initialMuted: settings.muteByDefault,
    globalMuteSetting: settings.muteByDefault,
    userInteracted: videoState.userInteracted
  });

  const postId = post._id || post.id;
  const videoItem = post.media?.[0];
  const videoUrl = videoItem?.secure_url || videoItem?.url;
  const isOwnPost = user?.id === post.author?.id;

  // Handle comment click
  const handleCommentClick = useCallback(() => {
    if (onComment) {
      onComment(postId);
    }
  }, [onComment, postId]);

  // Handle follow action
  const handleFollow = async () => {
    // Check if user is authenticated
    if (!user || !user.id) {
      toast.error('You must be logged in to follow users');
      return;
    }
    
    // Prevent users from following themselves
    if (isOwnPost) {
      toast.error('You cannot follow yourself');
      return;
    }
    
    try {
      if (isFollowing) {
        await api.users.unfollow(post.author.id);
        toast.success(`Unfollowed ${post.author.displayName || post.author.username}`);
      } else {
        await api.users.follow(post.author.id);
        toast.success(`Followed ${post.author.displayName || post.author.username}`);
      }
      setIsFollowing(!isFollowing);
      
      // Emit WebSocket event
      if (socket) {
        socket.emit('user:follow', { userId: post.author.id, followerId: user.id });
      }
    } catch (error) {
      toast.error('Failed to follow user');
      console.error('Follow error:', error);
    }
  };

  // Reset controls timeout
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    setShowControls(true);
    
    const timeout = setTimeout(() => {
      if (videoState.isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
  }, [controlsTimeout, videoState.isPlaying]);

  // Handle video events
  const handleVideoPlay = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleVideoPause = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: false }));
    setShowControls(true);
  }, []);

  const handleVideoEnded = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: false }));
    setShowControls(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setVideoState(prev => ({
      ...prev,
      currentTime: video.currentTime,
      duration: video.duration || 0,
    }));
  }, []);

  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const error = video.error;
    
    // Only log specific error types to reduce console spam
    if (error?.code === 4) {
      // MEDIA_ELEMENT_ERROR: Format error - don't spam console
      console.warn(`Video format not supported for ${postId}`);
    } else if (error?.code === 2) {
      // NETWORK_ERROR: Network error - log once
      console.warn(`Video network error for ${postId}: ${error.message}`);
    } else if (error?.code === 3) {
      // DECODE_ERROR: Decoding error - log once
      console.warn(`Video decode error for ${postId}: ${error.message}`);
    } else if (error?.code === 1) {
      // ABORTED_ERROR: Aborted error - don't log (usually user action)
    } else {
      // Other errors - log once
      const errorMessage = error ? `Video error ${error.code}: ${error.message}` : 'Unknown video error';
      console.warn(`Video error for ${postId}:`, errorMessage);
    }

    // Provide a clearer message for unsupported sources
    const unsupported = !video.currentSrc && !video.src;
    setVideoState(prev => ({
      ...prev,
      hasError: true,
      errorMessage: unsupported
        ? 'No supported video source found'
        : (error?.code === 4 ? 'Video format not supported' : 'Video failed to load'),
      isLoading: false,
    }));
  }, [postId]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;

    const buffered = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
    setVideoState(prev => ({ ...prev, buffered }));
  }, []);

  // Manual play/pause toggle
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;

    setVideoState(prev => ({ ...prev, userInteracted: true }));

    if (videoState.isPlaying) {
      pauseVideo(postId);
    } else {
      // Unmute when user initiates play
      if (isMuted) {
        setMuted(false);
      }
      await playVideo(postId);
    }
  }, [videoState.isPlaying, postId, playVideo, pauseVideo, isMuted, setMuted]);

  // Synchronize video element muted state with hook state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video element muted state matches hook state
    if (video.muted !== isMuted) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  // Auto-hide controls on mouse movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseLeave = () => {
      if (videoState.isPlaying) {
        setShowControls(false);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [resetControlsTimeout, videoState.isPlaying]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

  if (!videoUrl) {
    return (
      <Card 
        sx={{
          mb: 3,
          borderRadius: 2,
          border: 'none',
          transition: 'all 0.3s ease',
          bgcolor: theme.palette.background.paper,
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.1)}`,
          '&:hover': {
            boxShadow: `0 8px 24px ${alpha(theme.palette.divider, 0.15)}`,
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Box
          sx={{
            maxHeight,
            bgcolor: 'black',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            color: 'white',
            borderRadius: 1,
            overflow: 'hidden'
          }}
        >
          <AlertCircle size={48} color="#ff9800" />
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, color: 'white' }}>
            No Video Source
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: 2,
        border: 'none',
        transition: 'all 0.3s ease',
        bgcolor: theme.palette.background.paper,
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxShadow: `0 4px 12px ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(theme.palette.divider, 0.15)}`,
          transform: 'translateY(-2px)',
        },
        ...style 
      }} 
      className={className}
    >
      {/* Video Container */}
      <Box
        ref={containerRef}
        data-video-container
        data-video-id={postId}
        sx={{
          position: 'relative',
          width: '100%',
          maxHeight: 500,
          bgcolor: 'black',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          id={`video-${postId}`}
          src={videoUrl}
          poster={videoItem.thumbnail_url || videoItem.thumbnail}
          preload={settings.preloadStrategy}
          muted={isMuted}
          loop={true}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            maxHeight: 500,
            objectFit: 'cover',
            display: 'block',
          }}
          onClick={togglePlay}
          onError={handleVideoError}
        />

        {/* Follow Button */}
        {!isOwnPost && (
          <Button
            size="small"
            variant={isFollowing ? "outlined" : "contained"}
            startIcon={isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              handleFollow();
            }}
            sx={
              {
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 4,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.7rem',
                px: 1,
                py: 0.3,
                minWidth: 'auto',
                color: isFollowing ? 'white' : 'black',
                borderColor: 'white',
                bgcolor: isFollowing ? 'transparent' : 'white',
                '&:hover': {
                  bgcolor: isFollowing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                  borderColor: 'white',
                }
              }
            }
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}

        {/* Loading Indicator */}
        {videoState.isLoading && !videoState.hasError && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 2,
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="caption">Loading video...</Typography>
            </Box>
          </Box>
        )}

        {/* Error Display */}
        {videoState.hasError && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: 2,
              zIndex: 2,
            }}
          >
            <AlertCircle size={48} color="#f44336" />
            <Typography variant="subtitle1" sx={{ mt: 2, textAlign: 'center' }}>
              {videoState.errorMessage || 'Failed to load video'}
            </Typography>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<RotateCcw size={16} />}
              sx={{ mt: 2 }}
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.load();
                  setVideoState(prev => ({ ...prev, hasError: false, errorMessage: null, isLoading: true }));
                }
              }}
            >
              Retry
            </Button>
          </Box>
        )}

        {/* Video Controls */}
        <Fade in={showControls || !videoState.isPlaying}>
          <Box
            className="video-controls"
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px 16px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 3,
              transition: 'opacity 0.3s ease',
              opacity: showControls || !videoState.isPlaying ? 1 : 0,
            }}
          >
            {/* Left Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={videoState.isPlaying ? "Pause" : "Play"}>
                <IconButton
                  onClick={togglePlay}
                  size="large"
                  sx={{
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  {videoState.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Right Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Comment">
                <IconButton
                  onClick={handleCommentClick}
                  size="small"
                  sx={{
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <MessageSquare size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title={getVolumeTooltip(isMuted)}>
                <IconButton
                  onClick={toggleMute}
                  size="small"
                  sx={{
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  {getVolumeIcon(isMuted, videoState.volume, 18)}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Fade>

        {/* Large Play Button (center) */}
        {!videoState.isPlaying && !videoState.isLoading && !videoState.hasError && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            <Fab
              size="medium" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': { 
                  bgcolor: 'rgba(255,255,255,0.95)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              onClick={togglePlay}
            >
              <Play size={24} color="black" fill="black" />
            </Fab>
          </Box>
        )}

        {/* Mute/Unmute button */}
        <Fab 
          size="small" 
          sx={{ 
            position: 'absolute', 
            bottom: 16,
            right: 16,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            '&:hover': { 
              bgcolor: 'rgba(0,0,0,0.8)',
            },
          }}
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Fab>
      </Box>
    </Card>
  );
};
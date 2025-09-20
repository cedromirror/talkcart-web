import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  IconButton,
  Button,
  Avatar,
  Chip,
  Tooltip,
  LinearProgress,
  Fade,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MapPin,
  Eye,
  Clock,
  AlertCircle,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import PostAuthor from '@/components/common/PostAuthor';
import ShareDialog from '@/components/share/ShareDialog';
import FollowButton from '@/components/common/FollowButton';
import { useVideoFeed } from './VideoFeedManager';
import { VideoPost, VideoMediaItem } from './types';
import { getVolumeIcon, getVolumeTooltip, formatVideoTime } from '@/utils/videoUtils';
import { formatTextWithMentions } from '@/utils/mentionUtils';
import CommentSection from '@/components/Comments/CommentSection';

interface VideoPostCardProps {
  post: VideoPost;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    isMuted: true,
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

  const postId = post._id || post.id;
  const videoItem = post.media?.[0] as VideoMediaItem;
  const videoUrl = videoItem?.secure_url || videoItem?.url;
  const mimeType = React.useMemo(() => {
    if (!videoUrl) return undefined;
    const ext = videoItem?.format || videoUrl.split('?')[0].split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ogg':
      case 'ogv':
        return 'video/ogg';
      case 'm3u8':
        return 'application/vnd.apple.mpegurl';
      case 'mpd':
        return 'application/dash+xml';
      default:
        return undefined;
    }
  }, [videoUrl, videoItem?.format]);

  // Use centralized time formatting utility
  const formatTime = formatVideoTime;

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
      await playVideo(postId);
    }
  }, [videoState.isPlaying, postId, playVideo, pauseVideo]);

  // Toggle mute - unified mute control
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !videoState.isMuted;
    video.muted = newMutedState;
    setVideoState(prev => ({ 
      ...prev, 
      isMuted: newMutedState,
      userInteracted: true // Mark as user interaction
    }));
  }, [videoState.isMuted]);

  // Handle seek
  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * video.duration;
    
    video.currentTime = newTime;
  }, []);

  // Register video with feed manager
  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const cleanup = registerVideo(postId, videoRef.current, containerRef.current);
    return cleanup;
  }, [postId, registerVideo]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('ended', handleVideoEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
    };
  }, [handleVideoPlay, handleVideoPause, handleVideoEnded, handleTimeUpdate, handleProgress]);

  // Synchronize video element muted state with component state and global settings
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure video element muted state matches component state
    if (video.muted !== videoState.isMuted) {
      video.muted = videoState.isMuted;
    }

    // Also respect global mute settings
    if (settings.muteByDefault && !videoState.userInteracted) {
      video.muted = true;
      setVideoState(prev => ({ ...prev, isMuted: true }));
    }
  }, [videoState.isMuted, settings.muteByDefault, videoState.userInteracted]);

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

  // Calculate progress percentage
  const progressPercentage = videoState.duration > 0 
    ? Math.min(100, Math.max(0, (videoState.currentTime / videoState.duration) * 100))
    : 0;

  const isCurrentlyPlaying = currentPlayingVideo === postId;

  if (!videoUrl) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        sx={{ 
          mb: 3,
          cursor: 'pointer',
          borderRadius: 4,
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.08)',
          background: theme.palette.mode === 'dark' 
            ? 'rgba(30, 41, 59, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
            : '0 8px 32px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 20px 40px rgba(0, 0, 0, 0.6)' 
              : '0 20px 40px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-4px)',
            borderColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.2)' 
              : theme.palette.primary.main,
            '& .post-actions': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
          ...style 
        }} 
        className={className}
      >
        <CardContent>
          {/* Post Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <PostAuthor
              author={post.author}
              createdAt={post.createdAt}
              size="medium"
              showRole={true}
              showViews={true}
              viewCount={post.views}
              onAuthorClick={(authorId) => onUserClick?.(authorId)}
              sx={{ flex: 1 }}
            />
            
            <Box display="flex" alignItems="center" gap={1}>
              <FollowButton
                user={post.author}
                variant="button"
                size="small"
                context="video"
              />
              <IconButton size="small">
                <MoreHorizontal size={16} />
              </IconButton>
            </Box>
          </Box>

          {/* Post Content */}
          {post.content && (
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: theme.palette.text.primary,
                lineHeight: 1.6,
                fontSize: '1rem',
                fontWeight: 400,
                ...(theme.palette.mode === 'dark' && {
                  color: 'rgba(248, 250, 252, 0.87)',
                }),
                ...(theme.palette.mode === 'light' && {
                  color: 'rgba(30, 41, 59, 0.87)',
                })
              }}
            >
              {formatTextWithMentions(post.content, { context: 'video' })}
            </Typography>
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {post.hashtags.map((tag: string, index: number) => (
                <Chip
                  key={index}
                  label={`#${tag}`}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
                  onClick={() => onHashtagClick?.(tag)}
                />
              ))}
            </Box>
          )}

          {/* Location */}
          {post.location && (
            <Box display="flex" alignItems="center" gap={0.5} sx={{ mb: 1 }}>
              <MapPin size={14} />
              <Typography 
                variant="caption" 
                sx={{
                  color: theme.palette.text.secondary,
                  ...(theme.palette.mode === 'dark' && {
                    color: 'rgba(203, 213, 225, 0.7)',
                  }),
                  ...(theme.palette.mode === 'light' && {
                    color: 'rgba(71, 85, 105, 0.7)',
                  })
                }}
              >
                {post.location}
              </Typography>
            </Box>
          )}

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
              borderRadius: 3,
              overflow: 'hidden',
              mt: 2,
              mb: 1,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                '& video': {
                  transform: 'scale(1.05)',
                },
              },
            }}
          >
            {/* Video Element */}
            <video
              ref={videoRef}
              id={`video-${postId}`}
              src={mimeType && mimeType.startsWith('video/') ? videoUrl : undefined}
              poster={videoItem.secure_url}
              preload={settings.preloadStrategy}
              muted={videoState.isMuted}
              loop={true}
              playsInline
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 500,
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={togglePlay}
              onError={handleVideoError}
            >
              {/* Prefer explicit source for better type detection */}
              {mimeType && (
                <source src={videoUrl} type={mimeType} />
              )}
            </video>

            {/* Gradient overlay - matching PostCard image styling */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '30%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '.MuiBox-root:hover &': {
                  opacity: 1,
                },
                zIndex: 1,
              }}
            />
            
            {/* Video info overlay - matching PostCard image styling */}
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                opacity: 0,
                transform: 'translateY(-10px)',
                transition: 'all 0.3s ease',
                '.MuiBox-root:hover &': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
                zIndex: 1,
              }}
            >
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                VIDEO • {videoItem.format?.toUpperCase() || 'MP4'}
              </Typography>
            </Box>

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
                  <LinearProgress sx={{ mb: 2, width: 200 }} />
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
            {showFullControls && (
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
                  {/* Progress Bar */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={handleSeek}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={progressPercentage}
                      sx={{
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'primary.main',
                        },
                      }}
                    />
                  </Box>

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

                    <Typography variant="caption" sx={{ color: 'white', minWidth: 80 }}>
                      {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                    </Typography>
                  </Box>

                  {/* Right Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={getVolumeTooltip(videoState.isMuted)}>
                      <IconButton
                        onClick={toggleMute}
                        size="small"
                        sx={{
                          color: 'white',
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                        }}
                      >
                        {getVolumeIcon(videoState.isMuted, videoState.volume, 18)}
                      </IconButton>
                    </Tooltip>

                    {videoItem.duration && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Clock size={14} />
                        <Typography variant="caption" sx={{ color: 'white' }}>
                          {formatTime(videoItem.duration)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Fade>
            )}

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
                <IconButton
                  onClick={togglePlay}
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    },
                    width: 64,
                    height: 64,
                  }}
                >
                  <Play size={32} />
                </IconButton>
              </Box>
            )}

            {/* Playing Indicator */}
            {isCurrentlyPlaying && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  zIndex: 3,
                }}
              >
                <Chip
                  icon={<Play size={14} />}
                  label="Playing"
                  size="small"
                  color="primary"
                  sx={{ backgroundColor: 'rgba(25, 118, 210, 0.8)' }}
                />
              </Box>
            )}
          </Box>

          {/* Post Actions */}
                  <Box 
          className="post-actions"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mt: 3,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'grey.100',
            opacity: 0.8,
            transform: 'translateY(4px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
            <Box display="flex" alignItems="center" gap={2}>
              <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: post.isLiked 
                      ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'primary.50')
                      : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.50'),
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <IconButton
                  size="small"
                  sx={{
                    color: post.isLiked ? 'primary.500' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      transform: 'scale(1.2)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onClick={() => onLike?.(postId)}
                >
                  <Heart 
                    size={20} 
                    fill={post.isLiked ? 'currentColor' : 'none'} 
                    stroke={post.isLiked ? 'currentColor' : 'currentColor'}
                  />
                </IconButton>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: post.isLiked ? 'primary.600' : 'text.secondary',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {post.likeCount || 0}
                </Typography>
              </Box>

              <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'grey.50',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <IconButton 
                  size="small" 
                  onClick={() => setCommentsExpanded(!commentsExpanded)}
                  sx={{
                    color: commentsExpanded ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'primary.500',
                      transform: 'scale(1.2)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <MessageCircle size={20} />
                </IconButton>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'text.secondary',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {post.commentCount || 0}
                </Typography>
              </Box>

              <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'grey.50',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <IconButton 
                  size="small" 
                  onClick={() => setShareDialogOpen(true)}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: 'primary.500',
                      transform: 'scale(1.2)',
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Share size={20} />
                </IconButton>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'text.secondary',
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {post.shareCount || 0}
                </Typography>
              </Box>
            </Box>

            <IconButton
              size="small"
              sx={{
                color: post.isBookmarked ? 'primary.500' : 'text.secondary',
                backgroundColor: post.isBookmarked 
                  ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'primary.50')
                  : 'transparent',
                border: '1px solid',
                borderColor: post.isBookmarked 
                  ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'primary.200')
                  : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'grey.200'),
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: post.isBookmarked 
                    ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'primary.100')
                    : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.50'),
                  borderColor: post.isBookmarked 
                    ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.4)' : 'primary.300')
                    : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'grey.300'),
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={() => onBookmark?.(postId)}
            >
              <Bookmark size={18} fill={post.isBookmarked ? 'currentColor' : 'none'} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Comments Section */}
      {commentsExpanded && (
        <Box sx={{ mt: 1 }}>
          <CommentSection
            postId={postId}
            initialCommentCount={post.commentCount || 0}
            isExpanded={commentsExpanded}
            onToggle={setCommentsExpanded}
            enableRealTime={true}
          />
        </Box>
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        post={post}
      />
    </>
  );
};

export default VideoPostCard;
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
  Typography,
  Fade,
} from '@mui/material';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
} from 'lucide-react';
import { convertToProxyUrl } from '@/utils/urlConverter';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

// Types for video media item (matching backend structure)
interface VideoMediaItem {
  public_id: string;
  secure_url: string;
  url?: string;
  resource_type: 'video';
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
  created_at?: string;
  thumbnail?: string;
}

// Props for the ModernVideoContainer component
interface ModernVideoContainerProps {
  videoItem: VideoMediaItem;
  videoId: string;
  autoPlay?: boolean;
  autoMute?: boolean;
  loop?: boolean;
  controls?: boolean;
  maxHeight?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
  style?: React.CSSProperties;
  pauseOthersOnPlay?: boolean;
}

// Video state interface
interface VideoState {
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  buffered: number;
  userInteracted: boolean;
  manuallyPaused: boolean;
  manuallyPlaying: boolean;
  canAutoplay: boolean;
}

export const ModernVideoContainer: React.FC<ModernVideoContainerProps> = ({
  videoItem,
  videoId,
  autoPlay = false,
  autoMute = true,
  loop = true,
  controls = true,
  maxHeight = 400,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  className,
  style,
  pauseOthersOnPlay = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Video state
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    isMuted: autoMute,
    isLoading: true,
    hasError: false,
    errorMessage: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    buffered: 0,
    userInteracted: false,
    manuallyPaused: false,
    manuallyPlaying: false,
    canAutoplay: true,
  });

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get video URL with fallback
  const videoUrl = videoItem.secure_url || videoItem.url;
  const proxiedVideoUrl = videoUrl ? proxyCloudinaryUrl(convertToProxyUrl(videoUrl)) : undefined;
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

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

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

  // Pause other videos when this one plays
  const pauseOtherVideos = useCallback(() => {
    if (!pauseOthersOnPlay) return;
    
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video) => {
      if (video !== videoRef.current && !video.paused) {
        video.pause();
        
        // Dispatch event to notify other video containers
        const videoContainer = video.closest('[data-video-container]');
        if (videoContainer) {
          const event = new CustomEvent('video-pause-by-other', {
            detail: { pausedBy: videoId }
          });
          videoContainer.dispatchEvent(event);
        }
      }
    });

    // Dispatch global event for coordination
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('video-playing', {
        detail: { videoId, source: 'scroll-autoplay' }
      }));
    }
  }, [pauseOthersOnPlay, videoId]);

  // Video control functions
  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      // Mark as user interaction
      setVideoState(prev => ({ ...prev, userInteracted: true }));

      if (videoState.isPlaying) {
        // User manually paused
        video.pause();
        setVideoState(prev => ({ 
          ...prev, 
          manuallyPaused: true, 
          manuallyPlaying: false,
          canAutoplay: false // Disable autoplay after manual pause
        }));
      } else {
        // User manually played
        pauseOtherVideos();
        await video.play();
        setVideoState(prev => ({ 
          ...prev, 
          manuallyPlaying: true, 
          manuallyPaused: false,
          canAutoplay: true // Re-enable autoplay after manual play
        }));
      }
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  }, [videoState.isPlaying, pauseOtherVideos]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const newMutedState = !videoState.isMuted;
    video.muted = newMutedState;
    setVideoState(prev => ({ ...prev, isMuted: newMutedState }));
  }, [videoState.isMuted]);

  // Handle video events
  const handleVideoPlay = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    onPlay?.();
    resetControlsTimeout();
  }, [onPlay, resetControlsTimeout]);

  const handleVideoPause = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: false }));
    onPause?.();
    setShowControls(true);
  }, [onPause]);

  const handleVideoEnded = useCallback(() => {
    setVideoState(prev => ({
      ...prev,
      isPlaying: false,
      manuallyPaused: false,
      manuallyPlaying: false,
      canAutoplay: true, // Reset autoplay state when video ends
    }));
    onEnded?.();
    setShowControls(true);
  }, [onEnded]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setVideoState(prev => ({
      ...prev,
      currentTime: video.currentTime,
      duration: video.duration || 0,
    }));

    onTimeUpdate?.(video.currentTime, video.duration || 0);
  }, [onTimeUpdate]);

  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const error = video.error;
    
    // Only log specific error types to reduce console spam
    let errorMessage = 'Video failed to load';
    if (error?.code === 4) {
      // MEDIA_ELEMENT_ERROR: Format error - don't spam console
      errorMessage = 'Video format not supported';
      console.warn(`Video format not supported for ${videoId || 'unknown'}`);
    } else if (error?.code === 2) {
      // NETWORK_ERROR: Network error - log once
      errorMessage = 'Video network error';
      console.warn(`Video network error for ${videoId || 'unknown'}: ${error.message}`);
    } else if (error?.code === 3) {
      // DECODE_ERROR: Decoding error - log once
      errorMessage = 'Video decode error';
      console.warn(`Video decode error for ${videoId || 'unknown'}: ${error.message}`);
    } else if (error?.code === 1) {
      // ABORTED_ERROR: Aborted error - don't log (usually user action)
      errorMessage = 'Video playback aborted';
    } else {
      // Other errors - log once
      errorMessage = error ? `Video error ${error.code}` : 'Unknown video error';
      console.warn(`Video error for ${videoId || 'unknown'}:`, error);
    }

    setVideoState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      isLoading: false,
    }));
    
    onError?.(errorMessage);
  }, [onError, videoId]);

  // Native event handler for addEventListener
  const handleVideoErrorNative = useCallback((event: Event) => {
    const video = event.target as HTMLVideoElement;
    const error = video.error;
    
    // Only log specific error types to reduce console spam
    let errorMessage = 'Video failed to load';
    if (error?.code === 4) {
      // MEDIA_ELEMENT_ERROR: Format error - don't spam console
      errorMessage = 'Video format not supported';
      console.warn(`Video format not supported for ${videoId || 'unknown'}`);
    } else if (error?.code === 2) {
      // NETWORK_ERROR: Network error - log once
      errorMessage = 'Video network error';
      console.warn(`Video network error for ${videoId || 'unknown'}: ${error.message}`);
    } else if (error?.code === 3) {
      // DECODE_ERROR: Decoding error - log once
      errorMessage = 'Video decode error';
      console.warn(`Video decode error for ${videoId || 'unknown'}: ${error.message}`);
    } else if (error?.code === 1) {
      // ABORTED_ERROR: Aborted error - don't log (usually user action)
      errorMessage = 'Video playback aborted';
    } else {
      // Other errors - log once
      errorMessage = error ? `Video error ${error.code}` : 'Unknown video error';
      console.warn(`Video error for ${videoId || 'unknown'}:`, error);
    }

    setVideoState(prev => ({
      ...prev,
      hasError: true,
      errorMessage,
      isLoading: false,
    }));
    
    onError?.(errorMessage);
  }, [onError, videoId]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;

    const buffered = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100;
    setVideoState(prev => ({ ...prev, buffered }));
  }, []);

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

  // Intersection Observer for autoplay scroll behavior
  useEffect(() => {
    if (!autoPlay || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIntersecting = entry.isIntersecting;
          const intersectionRatio = entry.intersectionRatio;
          
          if (isIntersecting && intersectionRatio >= 0.6) {
            // Video is sufficiently in view - try to autoplay if conditions are met
            const video = videoRef.current;
            if (video && !videoState.isPlaying && !videoState.manuallyPaused && videoState.canAutoplay) {
              pauseOtherVideos();
              video.play().catch(err => {
                console.warn('Autoplay prevented:', err);
              });
            }
          } else if (!isIntersecting && videoState.isPlaying && !videoState.manuallyPlaying) {
            // Video is out of view - pause if it wasn't manually played
            const video = videoRef.current;
            if (video) {
              video.pause();
            }
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [
    autoPlay,
    videoState.isPlaying,
    videoState.manuallyPaused,
    videoState.manuallyPlaying,
    videoState.canAutoplay,
    pauseOtherVideos
  ]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('error', handleVideoErrorNative);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('error', handleVideoErrorNative);
      video.removeEventListener('ended', handleVideoEnded);
    };
  }, [handleVideoPlay, handleVideoPause, handleTimeUpdate, handleProgress, handleVideoErrorNative, handleVideoEnded]);

  // Listen for global video events for better coordination
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleVideoPauseByOther = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log(`Video ${videoId} paused by ${customEvent.detail?.pausedBy || 'unknown'}`);
      
      // Only update state if this wasn't a manual pause
      if (!videoState.manuallyPaused) {
        setVideoState(prev => ({ ...prev, manuallyPaused: false }));
      }
    };

    const handleGlobalVideoPlaying = (event: Event) => {
      const customEvent = event as CustomEvent;
      const playingVideoId = customEvent.detail?.videoId;
      
      if (playingVideoId && playingVideoId !== videoId && videoState.isPlaying) {
        console.log(`Video ${videoId} should pause because ${playingVideoId} is playing`);
        const video = videoRef.current;
        if (video && !videoState.manuallyPlaying) {
          video.pause();
        }
      }
    };

    // Add event listeners
    container.addEventListener('video-pause-by-other', handleVideoPauseByOther as EventListener);
    window.addEventListener('video-playing', handleGlobalVideoPlaying as EventListener);

    return () => {
      container.removeEventListener('video-pause-by-other', handleVideoPauseByOther as EventListener);
      window.removeEventListener('video-playing', handleGlobalVideoPlaying as EventListener);
    };
  }, [videoId, videoState.isPlaying, videoState.manuallyPaused, videoState.manuallyPlaying]);

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

  // Validate video URL
  if (!videoUrl) {
    return (
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
    );
  }

  return (
    <Box
      ref={containerRef}
      data-video-container
      data-video-id={videoId}
      className={className}
      sx={{
        position: 'relative',
        maxHeight,
        width: '100%',
        bgcolor: 'black',
        borderRadius: 1,
        overflow: 'hidden',
        '&:hover': {
          '& .video-controls': {
            opacity: 1,
          },
        },
        ...style,
      }}
      role="region"
      aria-label="Video player"
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        id={`video-${videoId}`}
        src={mimeType && mimeType.startsWith('video/') ? proxiedVideoUrl : undefined}
        poster={videoItem.thumbnail}
        preload="metadata"
        muted={videoState.isMuted}
        loop={loop}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          maxHeight,
          objectFit: 'contain',
          display: 'block',
        }}
        onClick={togglePlay}
        aria-label="Video content"
        role="video"
      >
        {mimeType && proxiedVideoUrl && (
          <source src={proxiedVideoUrl} type={mimeType} />
        )}
        Your browser does not support the video tag.
      </video>

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
          <CircularProgress color="primary" size={48} />
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
        </Box>
      )}

      {/* Video Controls */}
      {controls && (
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
                height: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                overflow: 'hidden',
              }}
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
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={videoState.isMuted ? "Unmute" : "Mute"}>
                <IconButton
                  onClick={toggleMute}
                  size="small"
                  sx={{
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  {videoState.isMuted ? (
                    <VolumeX size={18} />
                  ) : videoState.volume > 0.5 ? (
                    <Volume2 size={18} />
                  ) : (
                    <Volume1 size={18} />
                  )}
                </IconButton>
              </Tooltip>
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
    </Box>
  );
};
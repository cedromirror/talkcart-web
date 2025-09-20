import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Fab, Tooltip, Badge } from '@mui/material';
import { 
  Pause, 
  Play, 
  Settings,
  BarChart3,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useVideoAutoscroll, VideoAutoscrollSettings } from '@/hooks/useVideoAutoscroll';
import { getSmoothScrollVideoManager } from '@/utils/smoothScrollVideoManager';
import { getVolumeIcon, getVolumeTooltip } from '@/utils/videoUtils';
import toast from 'react-hot-toast';

interface VideoFeedContextValue {
  registerVideo: (videoId: string, element: HTMLVideoElement, container: HTMLElement) => () => void;
  unregisterVideo: (videoId: string) => void;
  playVideo: (videoId: string) => Promise<void>;
  pauseVideo: (videoId: string) => void;
  pauseAllVideos: () => void;
  currentPlayingVideo: string | null;
  isScrolling: boolean;
  settings: VideoAutoscrollSettings;
  updateSettings: (newSettings: Partial<VideoAutoscrollSettings>) => void;
  getVideoStats: () => any;
}

const VideoFeedContext = createContext<VideoFeedContextValue | null>(null);

export const useVideoFeed = () => {
  const context = useContext(VideoFeedContext);
  if (!context) {
    throw new Error('useVideoFeed must be used within a VideoFeedProvider');
  }
  return context;
};

interface VideoFeedProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<VideoAutoscrollSettings>;
  onVideoView?: (videoId: string, viewTime: number) => void;
  showControls?: boolean;
  showStats?: boolean;
}

export const VideoFeedProvider: React.FC<VideoFeedProviderProps> = ({
  children,
  initialSettings = {},
  onVideoView,
  showControls = true,
  showStats = false,
}) => {
  const [settings, setSettings] = useState<VideoAutoscrollSettings>({
    enabled: true,
    threshold: 0.6,
    pauseOnScroll: true,
    muteByDefault: true,
    preloadStrategy: 'metadata',
    maxConcurrentVideos: 2,
    scrollPauseDelay: 150,
    viewTrackingThreshold: 3,
    autoplayOnlyOnWifi: false,
    respectReducedMotion: true,
    ...initialSettings,
  });

  const [isOnline, setIsOnline] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(settings.muteByDefault);
  const [scrollVideoManager] = useState(() => getSmoothScrollVideoManager({
    scrollThreshold: 50,
    velocityThreshold: 2,
    debounceMs: 16,
    preloadDistance: 200,
    smoothTransition: true,
    adaptiveQuality: true,
  }));

  // Handle video events
  const handleVideoPlay = useCallback((videoId: string) => {
    console.log(`Video ${videoId} started playing`);
  }, []);

  const handleVideoPause = useCallback((videoId: string) => {
    console.log(`Video ${videoId} paused`);
  }, []);

  const handleVideoView = useCallback((videoId: string, viewTime: number) => {
    console.log(`Video ${videoId} viewed for ${viewTime} seconds`);
    onVideoView?.(videoId, viewTime);
    
    // Track view analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'video_view', {
        video_id: videoId,
        view_time: viewTime,
      });
    }
  }, [onVideoView]);

  const handleVideoError = useCallback((videoId: string, error: string) => {
    // Only log non-format errors to reduce console spam
    if (!error.includes('format not supported') && !error.includes('Format not supported')) {
      console.warn(`Video ${videoId} error:`, error);
    }
    
    // Show user-friendly error message
    if (error !== 'Format not supported' && error !== 'format not supported') {
      toast.error(`Video playback error: ${error}`);
    }
  }, []);

  // Memoize the options to prevent unnecessary re-renders
  const autoscrollOptions = useMemo(() => ({
    settings,
    onVideoPlay: handleVideoPlay,
    onVideoPause: handleVideoPause,
    onVideoView: handleVideoView,
    onVideoError: handleVideoError,
  }), [settings, handleVideoPlay, handleVideoPause, handleVideoView, handleVideoError]);

  const {
    videos,
    currentPlayingVideo,
    isScrolling,
    registerVideo: registerVideoHook,
    unregisterVideo,
    playVideo: playVideoHook,
    pauseVideo: pauseVideoHook,
    pauseAllVideos: pauseAllVideosHook,
    getVideoStats,
  } = useVideoAutoscroll(autoscrollOptions);

  // Enhanced video registration with smooth scroll manager
  const registerVideo = useCallback((videoId: string, element: HTMLVideoElement, container: HTMLElement) => {
    // Register with both systems
    const unregisterHook = registerVideoHook(videoId, element, container);
    const unregisterSmooth = scrollVideoManager.registerVideo(videoId, element, container);
    
    // Return combined cleanup function
    return () => {
      unregisterHook();
      unregisterSmooth();
    };
  }, [registerVideoHook, scrollVideoManager]);

  // Enhanced video controls with smooth scroll manager
  const playVideo = useCallback(async (videoId: string) => {
    await Promise.all([
      playVideoHook(videoId),
      scrollVideoManager.playVideo(videoId)
    ]);
  }, [playVideoHook, scrollVideoManager]);

  const pauseVideo = useCallback(async (videoId: string) => {
    await Promise.all([
      pauseVideoHook(videoId),
      scrollVideoManager.pauseVideo(videoId)
    ]);
  }, [pauseVideoHook, scrollVideoManager]);

  const pauseAllVideos = useCallback(async () => {
    await Promise.all([
      pauseAllVideosHook(),
      scrollVideoManager.pauseAllVideos()
    ]);
  }, [pauseAllVideosHook, scrollVideoManager]);

  // Setup smooth scroll manager callbacks
  useEffect(() => {
    scrollVideoManager.onVideoPlayCallback(handleVideoPlay);
    scrollVideoManager.onVideoPauseCallback(handleVideoPause);
    scrollVideoManager.onVideoSwitchCallback((fromId, toId) => {
      console.log(`Video switched from ${fromId} to ${toId}`);
    });
    scrollVideoManager.onScrollStateChangeCallback((isScrolling, velocity) => {
      console.log(`Scroll state: ${isScrolling ? 'scrolling' : 'stopped'}, velocity: ${velocity}`);
    });

    return () => {
      scrollVideoManager.destroy();
    };
  }, [scrollVideoManager, handleVideoPlay, handleVideoPause]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<VideoAutoscrollSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('videoFeedSettings', JSON.stringify({ ...settings, ...newSettings }));
    }
  }, [settings]);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('videoFeedSettings');
      if (saved) {
        try {
          const parsedSettings = JSON.parse(saved);
          setSettings(prev => ({ ...prev, ...parsedSettings }));
        } catch (error) {
          console.warn('Failed to load video settings:', error);
        }
      }
    }
  }, []);

  // Handle global mute toggle
  const toggleGlobalMute = useCallback(() => {
    const newMutedState = !globalMuted;
    setGlobalMuted(newMutedState);
    
    // Apply to all video elements
    videos.forEach((video) => {
      if (video.element) {
        video.element.muted = newMutedState;
      }
    });
    
    updateSettings({ muteByDefault: newMutedState });
    toast.success(newMutedState ? 'Videos muted' : 'Videos unmuted');
  }, [globalMuted, videos, updateSettings]);

  // Handle pause all videos
  const handlePauseAll = useCallback(() => {
    pauseAllVideos();
    toast.success('All videos paused');
  }, [pauseAllVideos]);

  // Handle autoplay toggle
  const toggleAutoplay = useCallback(() => {
    const newEnabled = !settings.enabled;
    updateSettings({ enabled: newEnabled });
    
    if (!newEnabled) {
      pauseAllVideos();
    }
    
    toast.success(newEnabled ? 'Autoplay enabled' : 'Autoplay disabled');
  }, [settings.enabled, updateSettings, pauseAllVideos]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: VideoFeedContextValue = useMemo(() => ({
    registerVideo,
    unregisterVideo,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    currentPlayingVideo,
    isScrolling,
    settings,
    updateSettings,
    getVideoStats,
  }), [
    registerVideo,
    unregisterVideo,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    currentPlayingVideo,
    isScrolling,
    settings,
    updateSettings,
    getVideoStats,
  ]);

  const stats = getVideoStats();

  return (
    <VideoFeedContext.Provider value={contextValue}>
      {children}
      
      {/* Floating Controls */}
      {showControls && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 1000,
          }}
        >
          {/* Network Status */}
          {!isOnline && (
            <Fab
              size="small"
              color="error"
              sx={{ opacity: 0.8 }}
            >
              <WifiOff size={20} />
            </Fab>
          )}

          {/* Stats */}
          {showStats && stats.totalVideos > 0 && (
            <Tooltip title={`${stats.playingVideos}/${stats.totalVideos} playing • ${stats.viewedVideos} viewed`}>
              <Fab
                size="small"
                color="info"
                sx={{ opacity: 0.8 }}
              >
                <Badge badgeContent={stats.playingVideos} color="primary">
                  <BarChart3 size={20} />
                </Badge>
              </Fab>
            </Tooltip>
          )}

          {/* Global Mute Toggle */}
          <Tooltip title={getVolumeTooltip(globalMuted)}>
            <Fab
              size="small"
              color={globalMuted ? "default" : "primary"}
              onClick={toggleGlobalMute}
              sx={{ opacity: 0.8 }}
            >
              {getVolumeIcon(globalMuted, undefined, 20)}
            </Fab>
          </Tooltip>

          {/* Pause All */}
          {stats.playingVideos > 0 && (
            <Tooltip title="Pause all videos">
              <Fab
                size="small"
                color="secondary"
                onClick={handlePauseAll}
                sx={{ opacity: 0.8 }}
              >
                <Pause size={20} />
              </Fab>
            </Tooltip>
          )}

          {/* Autoplay Toggle */}
          <Tooltip title={settings.enabled ? 'Disable autoplay' : 'Enable autoplay'}>
            <Fab
              size="small"
              color={settings.enabled ? "primary" : "default"}
              onClick={toggleAutoplay}
              sx={{ opacity: 0.8 }}
            >
              {settings.enabled ? <Play size={20} /> : <Pause size={20} />}
            </Fab>
          </Tooltip>
        </Box>
      )}
    </VideoFeedContext.Provider>
  );
};

export default VideoFeedProvider;
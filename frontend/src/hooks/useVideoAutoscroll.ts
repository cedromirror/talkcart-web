import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface VideoAutoscrollSettings {
  enabled: boolean;
  threshold: number; // Intersection threshold (0-1)
  pauseOnScroll: boolean;
  muteByDefault: boolean;
  preloadStrategy: 'none' | 'metadata' | 'auto';
  maxConcurrentVideos: number;
  scrollPauseDelay: number; // ms to wait after scroll stops
  viewTrackingThreshold: number; // seconds watched to count as view
  autoplayOnlyOnWifi: boolean;
  respectReducedMotion: boolean;
}

export interface VideoState {
  id: string;
  isPlaying: boolean;
  isVisible: boolean;
  isIntersecting: boolean;
  intersectionRatio: number;
  hasBeenViewed: boolean;
  viewTime: number;
  lastPlayTime: number;
  element: HTMLVideoElement | null;
  container: HTMLElement | null;
}

export interface UseVideoAutoscrollOptions {
  settings?: Partial<VideoAutoscrollSettings>;
  onVideoPlay?: (videoId: string) => void;
  onVideoPause?: (videoId: string) => void;
  onVideoView?: (videoId: string, viewTime: number) => void;
  onVideoError?: (videoId: string, error: string) => void;
}

const DEFAULT_SETTINGS: VideoAutoscrollSettings = {
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
};

export const useVideoAutoscroll = (options: UseVideoAutoscrollOptions = {}) => {
  const {
    settings: userSettings = {},
    onVideoPlay,
    onVideoPause,
    onVideoView,
    onVideoError,
  } = options;

  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...userSettings }), [userSettings]);
  
  const [videos, setVideosState] = useState<Map<string, VideoState>>(new Map());
  
  // Custom setter that also updates the ref
  const setVideos = useCallback((updater: React.SetStateAction<Map<string, VideoState>>) => {
    setVideosState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      videosRef.current = newState;
      return newState;
    });
  }, []);
  const [isScrolling, setIsScrolling] = useState(false);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<string | null>(null);
  const [networkType, setNetworkType] = useState<string>('unknown');
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [videoQueue, setVideoQueue] = useState<string[]>([]);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewTrackingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastScrollTime = useRef<number>(0);
  const scrollVelocity = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const preloadQueue = useRef<Set<string>>(new Set());
  const evaluateVideoPlaybackRef = useRef<(() => Promise<void>) | null>(null);
  const updateVideoQueueRef = useRef<((updates: Map<string, Partial<VideoState>>) => void) | null>(null);
  const videosRef = useRef<Map<string, VideoState>>(new Map());

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check network connection type
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkType(connection?.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setNetworkType(connection?.effectiveType || 'unknown');
      };
      
      connection?.addEventListener('change', handleConnectionChange);
      return () => connection?.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  // Check if video should autoplay
  const shouldAutoplay = useCallback((videoId: string) => {
    return (
      settings.enabled &&
      !prefersReducedMotion() &&
      (!settings.autoplayOnlyOnWifi || networkType === '4g' || networkType === 'wifi') &&
      !isScrolling
    );
  }, [settings, networkType, isScrolling]);

  // Start tracking view time for a video
  const startViewTracking = useCallback((videoId: string) => {
    if (viewTrackingIntervals.current.has(videoId)) {
      clearInterval(viewTrackingIntervals.current.get(videoId));
    }

    const interval = setInterval(() => {
      setVideos(prev => {
        const updated = new Map(prev);
        const current = updated.get(videoId);
        if (current) {
          updated.set(videoId, {
            ...current,
            viewTime: current.viewTime + 1,
            hasBeenViewed: current.viewTime + 1 >= settings.viewTrackingThreshold,
          });
        }
        return updated;
      });
    }, 1000);

    viewTrackingIntervals.current.set(videoId, interval);
  }, [settings.viewTrackingThreshold]);

  // Stop tracking view time for a video
  const stopViewTracking = useCallback((videoId: string) => {
    const interval = viewTrackingIntervals.current.get(videoId);
    if (interval) {
      clearInterval(interval);
      viewTrackingIntervals.current.delete(videoId);
    }

    // Report view time if threshold met - use current state
    setVideos(prev => {
      const videoState = prev.get(videoId);
      if (videoState && videoState.hasBeenViewed) {
        onVideoView?.(videoId, videoState.viewTime);
      }
      return prev; // Don't modify state, just access it
    });
  }, [onVideoView]);

  // Pause all other videos except the specified one
  const pauseOtherVideos = useCallback(async (exceptVideoId: string) => {
    setVideos(prev => {
      const playingVideos = Array.from(prev.entries())
        .filter(([id, state]) => id !== exceptVideoId && state.isPlaying && state.element)
        .slice(0, settings.maxConcurrentVideos);

      for (const [id, state] of playingVideos) {
        if (state.element) {
          state.element.pause();
          onVideoPause?.(id);
          stopViewTracking(id);
        }
      }
      
      return prev; // Don't modify state, just access it
    });
  }, [settings.maxConcurrentVideos, onVideoPause, stopViewTracking]);

  // Preload next videos for smooth playback
  const preloadNextVideos = useCallback((visibleVideoIds: string[]) => {
    const currentIndex = visibleVideoIds.indexOf(currentPlayingVideo || '');
    const nextVideos = visibleVideoIds.slice(currentIndex + 1, currentIndex + 3); // Preload next 2
    
    setVideos(prev => {
      nextVideos.forEach(videoId => {
        if (!preloadQueue.current.has(videoId)) {
          const video = prev.get(videoId);
          if (video?.element && video.element.readyState < 2) {
            preloadQueue.current.add(videoId);
            
            // Preload metadata
            video.element.preload = 'metadata';
            video.element.load();
            
            // Remove from preload queue after loading
            const handleLoadedMetadata = () => {
              preloadQueue.current.delete(videoId);
              video.element?.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
            
            video.element.addEventListener('loadedmetadata', handleLoadedMetadata);
          }
        }
      });
      
      return prev; // Don't modify state, just access it
    });
  }, [currentPlayingVideo]);

  // Pause a specific video
  const pauseVideo = useCallback(async (videoId: string) => {
    setVideos(prev => {
      const videoState = prev.get(videoId);
      if (!videoState || !videoState.element) return prev;

      videoState.element.pause();
      onVideoPause?.(videoId);
      stopViewTracking(videoId);
      
      if (currentPlayingVideo === videoId) {
        setCurrentPlayingVideo(null);
      }
      
      return prev; // Don't modify state, just access it
    });
  }, [currentPlayingVideo, onVideoPause, stopViewTracking]);

  // Intelligent video playback evaluation
  const evaluateVideoPlayback = useCallback(async () => {
    if (isScrolling || !settings.enabled) return;

    const visibleVideos = Array.from(videosRef.current.entries())
      .filter(([_, video]) => video.isIntersecting && video.element)
      .map(([id, video]) => ({
        id,
        video,
        rect: video.container?.getBoundingClientRect(),
        intersectionRatio: video.intersectionRatio,
      }))
      .filter(item => item.rect)
      .sort((a, b) => {
        // Sort by how centered the video is in viewport
        const viewportCenter = window.innerHeight / 2;
        const aCenterDistance = Math.abs((a.rect!.top + a.rect!.height / 2) - viewportCenter);
        const bCenterDistance = Math.abs((b.rect!.top + b.rect!.height / 2) - viewportCenter);
        
        // Prioritize videos with higher intersection ratio and closer to center
        const aScore = a.intersectionRatio * 100 - aCenterDistance * 0.1;
        const bScore = b.intersectionRatio * 100 - bCenterDistance * 0.1;
        
        return bScore - aScore;
      });

    if (visibleVideos.length === 0) {
      // No visible videos, pause current if any
      if (currentPlayingVideo) {
        await pauseVideo(currentPlayingVideo);
      }
      return;
    }

    const bestVideo = visibleVideos[0];
    const shouldSwitchVideo = currentPlayingVideo !== bestVideo.id;

    if (shouldSwitchVideo) {
      // Pause current video
      if (currentPlayingVideo) {
        const currentVideo = videos.get(currentPlayingVideo);
        if (currentVideo?.element && !currentVideo.element.paused) {
          currentVideo.element.pause();
          onVideoPause?.(currentPlayingVideo);
          stopViewTracking(currentPlayingVideo);
        }
      }

      // Play the best video
      try {
        const video = bestVideo.video;
        if (video.element && shouldAutoplay(bestVideo.id)) {
          // Set mute state
          video.element.muted = settings.muteByDefault;
          
          // Attempt to play
          await video.element.play();
          setCurrentPlayingVideo(bestVideo.id);
          onVideoPlay?.(bestVideo.id);
          startViewTracking(bestVideo.id);
          
          // Update video state
          setVideos(prev => {
            const updated = new Map(prev);
            updated.set(bestVideo.id, { ...video, isPlaying: true, lastPlayTime: Date.now() });
            return updated;
          });
        }
      } catch (error) {
        console.warn(`Autoplay failed for video ${bestVideo.id}:`, error);
        onVideoError?.(bestVideo.id, `Autoplay failed: ${error}`);
      }
    }

    // Pause videos that are no longer optimal
    visibleVideos.slice(settings.maxConcurrentVideos).forEach(({ id, video }) => {
      if (video.isPlaying && video.element && !video.element.paused) {
        video.element.pause();
        onVideoPause?.(id);
        stopViewTracking(id);
      }
    });
  }, [isScrolling, settings, currentPlayingVideo, onVideoPlay, onVideoPause, onVideoError, pauseVideo, shouldAutoplay, startViewTracking, stopViewTracking]);

  // Store the function in ref for use in scroll handler
  useEffect(() => {
    evaluateVideoPlaybackRef.current = evaluateVideoPlayback;
  }, [evaluateVideoPlayback]);

  // Enhanced scroll detection with direction and velocity
  useEffect(() => {
    if (!settings.enabled) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const currentTime = performance.now();
          const timeDelta = currentTime - lastScrollTime.current;
          
          // Calculate scroll direction
          const direction = currentScrollY > lastScrollY ? 'down' : 'up';
          setScrollDirection(direction);
          
          // Calculate scroll velocity (pixels per millisecond)
          const distance = Math.abs(currentScrollY - lastScrollY);
          scrollVelocity.current = timeDelta > 0 ? distance / timeDelta : 0;
          
          setLastScrollY(currentScrollY);
          lastScrollTime.current = currentTime;
          
          // Set scrolling state
          setIsScrolling(true);
          
          // Clear existing timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          
          // Adaptive delay based on scroll velocity
          const adaptiveDelay = Math.min(
            settings.scrollPauseDelay,
            Math.max(50, settings.scrollPauseDelay - (scrollVelocity.current * 100))
          );
          
          scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
            setScrollDirection(null);
            scrollVelocity.current = 0;
            
            // Trigger video evaluation after scroll stops
            evaluateVideoPlaybackRef.current?.();
          }, adaptiveDelay);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [settings.enabled, settings.scrollPauseDelay, lastScrollY]);

  // Update video queue based on visibility and scroll position
  const updateVideoQueue = useCallback((updates: Map<string, Partial<VideoState>>) => {
    setVideoQueue(prevQueue => {
      const visibleVideos: Array<{ id: string; position: number; ratio: number }> = [];
      
      // Get all visible videos with their positions
      videos.forEach((video, videoId) => {
        const update = updates.get(videoId);
        const isVisible = update?.isVisible ?? video.isVisible;
        const intersectionRatio = update?.intersectionRatio ?? video.intersectionRatio;
        
        if (isVisible && video.container) {
          const rect = video.container.getBoundingClientRect();
          const position = rect.top + rect.height / 2; // Center of video
          visibleVideos.push({ 
            id: videoId, 
            position, 
            ratio: intersectionRatio 
          });
        }
      });

      // Sort by position (top to bottom)
      visibleVideos.sort((a, b) => a.position - b.position);
      
      const newQueue = visibleVideos.map(v => v.id);
      
      // Only update if queue actually changed
      if (JSON.stringify(newQueue) !== JSON.stringify(prevQueue)) {
        // Preload next videos
        preloadNextVideos(newQueue);
        return newQueue;
      }
      
      return prevQueue;
    });
  }, [preloadNextVideos]);

  // Update refs when values change
  useEffect(() => {
    updateVideoQueueRef.current = updateVideoQueue;
  }, [updateVideoQueue]);

  // Enhanced intersection observer with better threshold detection
  useEffect(() => {
    if (!settings.enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const updates = new Map<string, Partial<VideoState>>();
        
        entries.forEach((entry) => {
          const videoId = entry.target.getAttribute('data-video-id');
          if (!videoId) return;

          const intersectionRatio = entry.intersectionRatio;
          const isIntersecting = entry.isIntersecting && intersectionRatio >= settings.threshold;

          updates.set(videoId, {
            isVisible: entry.isIntersecting,
            isIntersecting,
            intersectionRatio,
          });
        });

        // Batch update videos state
        if (updates.size > 0) {
          setVideos(prev => {
            const updated = new Map(prev);
            updates.forEach((update, videoId) => {
              const current = updated.get(videoId);
              if (current) {
                updated.set(videoId, { ...current, ...update });
              }
            });
            return updated;
          });

          // Update video queue based on visibility
          updateVideoQueueRef.current?.(updates);
        }
      },
      {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1],
        rootMargin: '-10% 0px -10% 0px', // More precise detection
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [settings.enabled, settings.threshold]);

  // Simplified intersection handler - main logic moved to evaluateVideoPlayback
  const handleVideoIntersection = useCallback(async (videoId: string, isIntersecting: boolean) => {
    // This is now mainly used for immediate pause when video goes completely out of view
    if (!isIntersecting) {
      const videoState = videosRef.current.get(videoId);
      if (videoState?.isPlaying && videoState.element && !videoState.element.paused) {
        videoState.element.pause();
        onVideoPause?.(videoId);
        stopViewTracking(videoId);
        
        if (currentPlayingVideo === videoId) {
          setCurrentPlayingVideo(null);
        }
      }
    }
  }, [currentPlayingVideo, onVideoPause, stopViewTracking]);

  // Play a specific video
  const playVideo = useCallback(async (videoId: string) => {
    const videoState = videosRef.current.get(videoId);
    if (!videoState || !videoState.element) return;

    try {
      // Pause other videos first
      await pauseOtherVideos(videoId);
      
      // Set mute state
      videoState.element.muted = settings.muteByDefault;
      
      // Attempt to play
      await videoState.element.play();
      setCurrentPlayingVideo(videoId);
      onVideoPlay?.(videoId);
      startViewTracking(videoId);
      
    } catch (error) {
      console.warn(`Failed to play video ${videoId}:`, error);
      onVideoError?.(videoId, `Play failed: ${error}`);
    }
  }, [settings.muteByDefault, pauseOtherVideos, onVideoPlay, onVideoError, startViewTracking]);

  // Register a video element
  const registerVideo = useCallback((
    videoId: string,
    element: HTMLVideoElement,
    container: HTMLElement
  ) => {
    const videoState: VideoState = {
      id: videoId,
      isPlaying: false,
      isVisible: false,
      isIntersecting: false,
      intersectionRatio: 0,
      hasBeenViewed: false,
      viewTime: 0,
      lastPlayTime: 0,
      element,
      container,
    };

    setVideos(prev => new Map(prev).set(videoId, videoState));

    // Set up video event listeners
    const handlePlay = () => {
      setVideos(prev => {
        const updated = new Map(prev);
        const current = updated.get(videoId);
        if (current) {
          updated.set(videoId, { ...current, isPlaying: true, lastPlayTime: Date.now() });
        }
        return updated;
      });
    };

    const handlePause = () => {
      setVideos(prev => {
        const updated = new Map(prev);
        const current = updated.get(videoId);
        if (current) {
          updated.set(videoId, { ...current, isPlaying: false });
        }
        return updated;
      });
      stopViewTracking(videoId);
    };

    const handleError = (event: Event) => {
      const error = (event.target as HTMLVideoElement).error;
      
      // Only log specific error types to reduce console spam
      let errorMessage = 'Unknown video error';
      if (error?.code === 4) {
        // MEDIA_ELEMENT_ERROR: Format error - don't spam console
        errorMessage = 'Format not supported';
      } else if (error?.code === 2) {
        // NETWORK_ERROR: Network error
        errorMessage = `Network error: ${error.message}`;
      } else if (error?.code === 3) {
        // DECODE_ERROR: Decoding error
        errorMessage = `Decode error: ${error.message}`;
      } else if (error?.code === 1) {
        // ABORTED_ERROR: Aborted error - don't log (usually user action)
        errorMessage = 'Playback aborted';
      } else {
        // Other errors
        errorMessage = error ? `Video error ${error.code}: ${error.message}` : 'Unknown video error';
      }
      
      onVideoError?.(videoId, errorMessage);
    };

    element.addEventListener('play', handlePlay);
    element.addEventListener('pause', handlePause);
    element.addEventListener('error', handleError);

    // Set preload strategy
    element.preload = settings.preloadStrategy;

    // Observe the container
    if (observerRef.current && container) {
      container.setAttribute('data-video-id', videoId);
      observerRef.current.observe(container);
    }

    // Cleanup function
    return () => {
      element.removeEventListener('play', handlePlay);
      element.removeEventListener('pause', handlePause);
      element.removeEventListener('error', handleError);
      
      if (observerRef.current && container) {
        observerRef.current.unobserve(container);
      }
      
      stopViewTracking(videoId);
      
      setVideos(prev => {
        const updated = new Map(prev);
        updated.delete(videoId);
        return updated;
      });
    };
  }, [settings.preloadStrategy, onVideoError, stopViewTracking]);

  // Unregister a video element
  const unregisterVideo = useCallback((videoId: string) => {
    setVideos(prev => {
      const videoState = prev.get(videoId);
      if (videoState) {
        if (observerRef.current && videoState.container) {
          observerRef.current.unobserve(videoState.container);
        }
        stopViewTracking(videoId);
      }
      
      const updated = new Map(prev);
      updated.delete(videoId);
      return updated;
    });
  }, [stopViewTracking]);

  // Pause all videos
  const pauseAllVideos = useCallback(() => {
    videosRef.current.forEach((state, id) => {
      if (state.isPlaying && state.element) {
        state.element.pause();
        onVideoPause?.(id);
        stopViewTracking(id);
      }
    });
    setCurrentPlayingVideo(null);
  }, [onVideoPause, stopViewTracking]);

  // Get video statistics
  const getVideoStats = useCallback(() => {
    const stats = {
      totalVideos: videosRef.current.size,
      playingVideos: 0,
      visibleVideos: 0,
      viewedVideos: 0,
      totalViewTime: 0,
    };

    videosRef.current.forEach((state) => {
      if (state.isPlaying) stats.playingVideos++;
      if (state.isVisible) stats.visibleVideos++;
      if (state.hasBeenViewed) stats.viewedVideos++;
      stats.totalViewTime += state.viewTime;
    });

    return stats;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      viewTrackingIntervals.current.forEach((interval) => {
        clearInterval(interval);
      });
      viewTrackingIntervals.current.clear();

      // Clear scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    videos: Array.from(videos.values()),
    currentPlayingVideo,
    isScrolling,
    scrollDirection,
    videoQueue,
    settings,
    
    // Actions
    registerVideo,
    unregisterVideo,
    playVideo,
    pauseVideo,
    pauseAllVideos,
    evaluateVideoPlayback,
    
    // Utils
    getVideoStats,
  };
};

export default useVideoAutoscroll;
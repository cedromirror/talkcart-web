// Video Components
export { ModernVideoContainer } from './ModernVideoContainer';
export { EnhancedVideoUpload } from './EnhancedVideoUpload';
export { VideoPostCard } from './VideoPostCard';
export { VideoFeedProvider, useVideoFeed } from './VideoFeedManager';
export { VideoSettings } from './VideoSettings';
export { VideoAnalytics } from './VideoAnalytics';
export { VideoControls } from './VideoControls';
export { VideoPerformanceMonitor } from './VideoPerformanceMonitor';
export { SmoothScrollMonitor } from './SmoothScrollMonitor';

// Hooks
export { useVideoAutoscroll } from '../../hooks/useVideoAutoscroll';

// Utils
export { 
  getVideoMaintenanceManager, 
  videoOptimizationUtils 
} from '../../utils/videoMaintenance';
export { 
  getVideoQualityManager 
} from '../../utils/videoQualityManager';
export { 
  getSmoothScrollVideoManager,
  createSmoothScrollVideoManager 
} from '../../utils/smoothScrollVideoManager';
export { 
  getVideoIntersectionOptimizer,
  createVideoIntersectionOptimizer 
} from '../../utils/videoIntersectionOptimizer';

// Types
export type {
  VideoMediaItem,
  VideoPost,
  VideoContainerProps,
  VideoPostCardProps,
  UseVideoPostOptions,
  VideoPostState,
  VideoPostActions,
  VideoState,
} from './types';
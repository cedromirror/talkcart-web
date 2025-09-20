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
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
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
  BarChart3,
  TrendingUp,
  Edit,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CommentSection from '@/components/Comments/CommentSection';
import UserAvatar from '@/components/common/UserAvatar';
import PostAuthor from '@/components/common/PostAuthor';
import ShareDialog from '@/components/share/ShareDialog';
import FollowButton from '@/components/common/FollowButton';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { VideoAnalyticsTracker } from './VideoAnalyticsTracker';

interface EnhancedVideoPostCardProps {
  post: any;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserClick?: (userId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  autoPlay?: boolean;
  showAnalytics?: boolean;
  isCreator?: boolean;
}

export const EnhancedVideoPostCard: React.FC<EnhancedVideoPostCardProps> = ({
  post,
  onLike,
  onShare,
  onBookmark,
  onComment,
  onUserClick,
  onHashtagClick,
  autoPlay = false,
  showAnalytics = false,
  isCreator = false,
}) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Use video analytics hook
  const {
    metrics,
    trackEvent,
    getAnalyticsReport,
  } = useVideoAnalytics({
    postId: post.id || post._id,
    videoElement: videoRef.current,
    autoTrack: true,
    onEvent: (event) => {
      console.log('📊 Video Event:', event.type, event);
    },
    onMetricsUpdate: (newMetrics) => {
      console.log('📈 Metrics Updated:', newMetrics);
    },
  });

  // Intersection Observer for auto-play
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          video.play();
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, [autoPlay]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleLike = () => {
    onLike?.(post.id || post._id);
    trackEvent('seek', { action: 'like' });
  };

  const handleComment = () => {
    setCommentsExpanded(!commentsExpanded);
    trackEvent('seek', { action: 'comment' });
  };

  const handleShare = () => {
    setShowShareDialog(true);
    trackEvent('seek', { action: 'share' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoMedia = () => {
    return post.media?.find((m: any) => m.resource_type === 'video');
  };

  const videoMedia = getVideoMedia();
  if (!videoMedia) return null;

  return (
    <>
      <Card sx={{ 
        mb: 2, 
        position: 'relative',
        background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${theme.palette.divider}`,
      }}>
        {/* Header */}
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <PostAuthor
              author={post.author}
              createdAt={post.createdAt}
              size="small"
              showRole={true}
              showLocation={!!post.location}
              onAuthorClick={(authorId) => onUserClick?.(authorId)}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FollowButton
                user={post.author}
                variant="button"
                size="small"
                context="video"
              />
              {/* Real-time Analytics Badge */}
              {metrics.engagementScore > 0 && (
                <Tooltip title={`Engagement Score: ${metrics.engagementScore.toFixed(1)}/100`}>
                  <Badge 
                    badgeContent={Math.floor(metrics.engagementScore)}
                    color={metrics.engagementScore > 70 ? 'success' : metrics.engagementScore > 40 ? 'warning' : 'error'}
                    sx={{ mr: 1 }}
                  >
                    <TrendingUp size={16} />
                  </Badge>
                </Tooltip>
              )}

              {/* Analytics Button for Creators */}
              {(isCreator || showAnalytics) && (
                <Tooltip title="View Analytics">
                  <IconButton 
                    size="small"
                    onClick={() => setShowAnalyticsDialog(true)}
                  >
                    <BarChart3 size={16} />
                  </IconButton>
                </Tooltip>
              )}

              <IconButton size="small">
                <MoreHorizontal size={16} />
              </IconButton>
            </Box>
          </Box>

          {/* Content */}
          <Typography variant="body1" sx={{ mb: 2 }}>
            {post.content}
          </Typography>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {post.hashtags.map((hashtag: string, index: number) => (
                <Chip
                  key={index}
                  label={`#${hashtag}`}
                  size="small"
                  variant="outlined"
                  onClick={() => onHashtagClick?.(hashtag)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main + '20',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </CardContent>

        {/* Video Player */}
        <Box sx={{ position: 'relative', width: '100%' }}>
          <video
            ref={videoRef}
            src={videoMedia.secure_url || videoMedia.url}
            poster={videoMedia.eager?.[0]?.secure_url}
            muted={isMuted}
            loop
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 500,
              display: 'block',
              borderRadius: 0,
            }}
            onClick={togglePlayPause}
          />

          {/* Video Controls Overlay */}
          <Fade in={!isPlaying || !isVisible} timeout={300}>
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
            }}
            onClick={togglePlayPause}
            >
              <IconButton 
                sx={{ 
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
                size="large"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </IconButton>
            </Box>
          </Fade>

          {/* Video Info Overlay */}
          <Box sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            borderRadius: 1,
            px: 1,
            py: 0.5,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'white' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
              
              {/* Video Enhancement Indicators */}
              {post.videoSettings?.hasEdits && (
                <Tooltip title="Video has custom edits">
                  <Chip 
                    icon={<Edit size={10} />} 
                    label="Edited" 
                    size="small" 
                    color="primary"
                    variant="filled"
                    sx={{ height: 20, fontSize: '0.6rem' }}
                  />
                </Tooltip>
              )}
              
              {post.media?.[0]?.edits?.effects?.filter && post.media[0].edits.effects.filter !== 'none' && (
                <Tooltip title="Video has filters applied">
                  <Chip 
                    icon={<Filter size={10} />} 
                    label="Filtered" 
                    size="small" 
                    color="secondary"
                    variant="filled"
                    sx={{ height: 20, fontSize: '0.6rem' }}
                  />
                </Tooltip>
              )}
            </Box>

            <IconButton 
              size="small" 
              onClick={toggleMute}
              sx={{ color: 'white' }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </IconButton>
          </Box>

          {/* Progress Bar */}
          {duration > 0 && (
            <LinearProgress
              variant="determinate"
              value={(currentTime / duration) * 100}
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />
          )}
        </Box>

        {/* Engagement Actions */}
        <CardActions sx={{ 
          px: 2, 
          py: 1, 
          borderTop: `1px solid ${theme.palette.divider}`,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<Heart size={16} />}
                onClick={handleLike}
                color={post.isLiked ? 'error' : 'inherit'}
                size="small"
              >
                {post.likeCount || post.likes || 0}
              </Button>

              <Button
                startIcon={<MessageCircle size={16} />}
                onClick={handleComment}
                size="small"
              >
                {post.commentCount || post.comments || 0}
              </Button>

              <Button
                startIcon={<Share size={16} />}
                onClick={handleShare}
                size="small"
              >
                {post.shareCount || post.shares || 0}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Live Metrics */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Eye size={14} />
                <Typography variant="caption">
                  {(post.views || 0) + metrics.playCount}
                </Typography>
              </Box>

              <IconButton
                size="small"
                onClick={() => onBookmark?.(post.id || post._id)}
                color={post.isBookmarked ? 'primary' : 'default'}
              >
                <Bookmark size={16} />
              </IconButton>
            </Box>
          </Box>
        </CardActions>
      </Card>

      {/* Comments Section */}
      {commentsExpanded && (
        <Box sx={{ mt: 1 }}>
          <CommentSection
            postId={post.id || post._id}
            initialCommentCount={post.commentCount || post.comments || 0}
            isExpanded={commentsExpanded}
            onToggle={setCommentsExpanded}
            enableRealTime={true}
          />
        </Box>
      )}

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        post={post}
      />

      {/* Analytics Dialog */}
      <Dialog
        open={showAnalyticsDialog}
        onClose={() => setShowAnalyticsDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Video Analytics</DialogTitle>
        <DialogContent>
          <VideoAnalyticsTracker
            videoData={{
              postId: post.id || post._id,
              videoUrl: videoMedia.secure_url || videoMedia.url,
              title: post.content.substring(0, 50),
              uploadTime: new Date(post.createdAt),
              duration: duration,
              views: (post.views || 0) + metrics.playCount,
              likes: post.likeCount || post.likes || 0,
              comments: post.commentCount || post.comments || 0,
              shares: post.shareCount || post.shares || 0,
              downloads: 0,
              averageWatchTime: metrics.averageWatchTime,
              retentionRate: metrics.retentionPoints.map(point => point / Math.max(metrics.playCount, 1)),
              viewsByHour: Array.from({length: 24}, (_, i) => ({ 
                hour: i, 
                views: Math.floor(Math.random() * 100) 
              })),
              demographics: {
                ageGroups: [
                  { age: '18-24', percentage: 35 },
                  { age: '25-34', percentage: 40 },
                  { age: '35-44', percentage: 15 },
                  { age: '45+', percentage: 10 },
                ],
                locations: [
                  { country: 'United States', views: 150 },
                  { country: 'United Kingdom', views: 80 },
                  { country: 'Canada', views: 45 },
                ]
              },
              engagement: {
                likeRate: (post.likeCount || 0) / Math.max((post.views || 0) + metrics.playCount, 1),
                commentRate: (post.commentCount || 0) / Math.max((post.views || 0) + metrics.playCount, 1),
                shareRate: (post.shareCount || 0) / Math.max((post.views || 0) + metrics.playCount, 1),
                bounceRate: metrics.pauseCount / Math.max(metrics.playCount, 1),
              },
              performance: {
                loadTime: metrics.loadTime,
                bufferingEvents: metrics.bufferEvents,
                qualityChanges: metrics.qualityChanges,
                completionRate: metrics.completionRate,
              }
            }}
            isLive={false}
            onExportData={() => {
              const report = getAnalyticsReport();
              console.log('📊 Exporting analytics report:', report);
              // In a real app, trigger download or send to API
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
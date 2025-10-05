import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  alpha,
  Fab,
} from '@mui/material';
import { 
  Play,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Heart,
  MessageSquare,
  Share,
  Bookmark,
  BookmarkCheck,
  UserPlus,
  UserCheck,
  Eye,
  Hash,
  Clock,
  Flag,
  ExternalLink,
  Copy,
  BarChart,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import { Post } from '@/types/social';
import UserAvatar from '@/components/common/UserAvatar';
import toast from 'react-hot-toast';

interface PostCardProps {
  post: Post;
  onBookmark?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

export const PostCardEnhanced: React.FC<PostCardProps> = ({ post, onBookmark, onLike, onShare, onComment }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useWebSocket();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || post.likes || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments || 0);
  const [shareCount, setShareCount] = useState(post.shareCount || post.shares || 0);
  const [viewCount, setViewCount] = useState(post.views || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if current user is the post author
  const isOwnPost = user?.id === post.author.id;

  // Toggle play state for videos
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Ensure video is unmuted when user initiates play
        videoRef.current.muted = false;
        setIsMuted(false);
        
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.log('Video play failed:', error);
        });
      }
    }
  };

  // Toggle mute state for videos
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Handle like action
  const handleLike = async () => {
    // Prevent users from liking their own posts
    if (isOwnPost) {
      toast.error('You cannot like your own post');
      return;
    }
    
    try {
      if (isLiked) {
        // Unlike is handled by calling like again (toggles on backend)
        await api.posts.like(post.id);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await api.posts.like(post.id);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
      
      // Notify parent component if callback provided
      if (onLike) onLike(post.id);
      
      // Emit WebSocket event
      if (socket) {
        socket.emit('post:like', { postId: post.id, userId: user?.id });
      }
    } catch (error) {
      toast.error('Failed to like post');
      console.error('Like error:', error);
    }
  };

  // Handle bookmark action
  const handleBookmark = async () => {
    try {
      if (isBookmarked) {
        // Unbookmark is handled by calling bookmark again (toggles on backend)
        await api.posts.bookmark(post.id);
      } else {
        await api.posts.bookmark(post.id);
      }
      setIsBookmarked(!isBookmarked);
      
      // Notify parent component if callback provided
      if (onBookmark) onBookmark(post.id);
      
      // Emit WebSocket event
      if (socket) {
        socket.emit('post:bookmark', { postId: post.id, userId: user?.id });
      }
    } catch (error) {
      toast.error('Failed to bookmark post');
      console.error('Bookmark error:', error);
    }
  };

  // Handle share action
  const handleShare = async () => {
    try {
      await api.posts.share(post.id);
      setShareCount(prev => prev + 1);
      
      // Notify parent component if callback provided
      if (onShare) onShare(post.id);
      
      // Emit WebSocket event
      if (socket) {
        socket.emit('post:share', { postId: post.id, userId: user?.id });
      }
      
      // Copy post URL to clipboard
      const postUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(postUrl);
      toast.success('Post link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to share post');
      console.error('Share error:', error);
    }
  };

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
    } catch (error) {
      toast.error('Failed to follow user');
      console.error('Follow error:', error);
    }
  };

  // Handle comment action
  const handleComment = () => {
    // Notify parent component if callback provided
    if (onComment) onComment(post.id);
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle view analytics
  const handleViewAnalytics = () => {
    // In a real implementation, this would open an analytics modal or navigate to analytics page
    // For now, we'll show a toast with a message
    toast.success('Analytics data would be displayed here');
    handleMenuClose();
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(postUrl);
      toast.success('Post link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
      console.error('Copy link error:', error);
    }
    handleMenuClose();
  };

  // Handle open post
  const handleOpenPost = () => {
    // Navigate to the post detail page
    router.push(`/post/${post.id}`);
    handleMenuClose();
  };

  // Handle report post
  const handleReport = async () => {
    try {
      // In a real implementation, this would call an API endpoint to report the post
      // For now, we'll just show a success message
      toast.success('Post reported successfully');
    } catch (error) {
      toast.error('Failed to report post');
      console.error('Report error:', error);
    }
    handleMenuClose();
  };

  // Format post creation time
  const formatPostTime = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Format view count
  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

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
      
      {/* Main content area with vertical action icons on the right */}
      <Box sx={{ 
        display: 'flex', 
        position: 'relative',
        bgcolor: 'black'
      }}>
        {/* Main content (post content and media) - Full screen */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Gradient overlay for text readability */}
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />
          
          {/* Post content - Positioned at bottom with overlay */}
          <CardContent sx={{ 
            pt: 1, 
            pb: 1.5,
            px: 1.5,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            color: 'white'
          }}>
            {/* User info bar at top of content with three-dot menu */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 1,
              gap: 1
            }}>
              <UserAvatar 
                src={post.author.avatar}
                alt={post.author.displayName || post.author.username}
                size={40}
                isVerified={post.author.isVerified}
                sx={{ 
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  cursor: 'pointer',
                }} 
              />
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                >
                  {post.author.displayName || post.author.username}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.75rem'
                  }}
                >
                  @{post.author.username}
                </Typography>
              </Box>
              
              {/* Three-dot menu icon positioned next to username */}
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                sx={{
                  color: 'white',
                  ml: 'auto',
                  p: 0.5
                }}
              >
                <MoreHorizontal size={18} />
              </IconButton>
              
              {/* Follow button - only one instance */}
              {!isOwnPost && (
                <Button
                  size="small"
                  variant={isFollowing ? "outlined" : "contained"}
                  startIcon={isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  onClick={handleFollow}
                  sx={{
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
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </Box>
            
            {/* Post text content */}
            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.9)',
                maxHeight: 100,
                overflow: 'hidden'
              }}
            >
              {post.content}
            </Typography>
            
            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4, mb: 1 }}>
                {post.hashtags.map((tag, index) => (
                  <Chip
                    key={index}
                    icon={<Hash size={12} />}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderRadius: 1,
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      fontSize: '0.7rem',
                      height: 20,
                      '& .MuiChip-icon': {
                        color: 'white',
                        width: 12,
                        height: 12
                      }
                    }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
          
          {/* Media content - Auto height */}
          <Box 
            sx={{ 
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              bgcolor: 'black',
            }}
          >
            {post.media && post.media.length > 0 ? (
              // Show only the first media item for feed view
              (() => {
                const mediaItem = post.media[0];
                return (
                  <Box 
                    sx={{ 
                      position: 'relative',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {mediaItem.resource_type === 'image' ? (
                      <Box
                        component="img"
                        src={mediaItem.secure_url || mediaItem.url}
                        alt={`Post image`}
                        loading="lazy"
                        sx={{
                          width: '100%',
                          maxHeight: 500,
                          objectFit: 'cover',
                          cursor: 'pointer',
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.objectFit = 'contain';
                          target.style.backgroundColor = alpha(theme.palette.divider, 0.2);
                        }}
                      />
                    ) : mediaItem.resource_type === 'video' ? (
                      <Box sx={{ 
                        position: 'relative',
                        width: '100%',
                        maxHeight: 500,
                      }}>
                        <video
                          ref={videoRef}
                          style={{
                            width: '100%',
                            maxHeight: 500,
                            objectFit: 'cover',
                            backgroundColor: 'black',
                          }}
                          poster={mediaItem.thumbnail_url || (mediaItem as any).thumbnail}
                          muted={isMuted}
                          loop
                          playsInline
                          controls={false}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={mediaItem.secure_url || mediaItem.url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        {/* Play/Pause overlay */}
                        <Fab 
                          size="medium" 
                          sx={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'rgba(255,255,255,0.8)',
                            '&:hover': { 
                              bgcolor: 'rgba(255,255,255,0.95)',
                              transform: 'translate(-50%, -50%) scale(1.1)',
                            },
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                          onClick={togglePlay}
                        >
                          <Play size={24} color="black" fill="black" />
                        </Fab>
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
                    ) : (
                      <Box
                        component="img"
                        src={mediaItem.secure_url || mediaItem.url}
                        alt="Post content"
                        sx={{
                          width: '100%',
                          maxHeight: 500,
                          objectFit: 'cover',
                        }}
                      />
                    )}
                  </Box>
                );
              })()
            ) : (
              // Placeholder for text-only posts
              <Box sx={{ 
                width: '100%',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.divider, 0.1),
              }}>
                <Typography variant="body2" color="text.secondary">
                  Text Post
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        {/* Vertical action icons on the right side */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start',
          gap: 2,
          p: 1.5,
          position: 'relative'
        }}>
          {/* Like Icon - TikTok style */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Tooltip title={isLiked ? "Unlike" : "Like"}>
              <IconButton 
                onClick={handleLike}
                sx={{ 
                  color: isLiked ? 'error.main' : 'white',
                  mb: 0.5
                }}
              >
                <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
              </IconButton>
            </Tooltip>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            >
              {formatViewCount(likeCount)}
            </Typography>
          </Box>
          
          {/* Comment Icon - TikTok style */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Tooltip title="Comment">
              <IconButton 
                onClick={handleComment}
                sx={{ color: 'white', mb: 0.5 }}
              >
                <MessageSquare size={24} />
              </IconButton>
            </Tooltip>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            >
              {formatViewCount(commentCount)}
            </Typography>
          </Box>
          
          {/* Share Icon - TikTok style */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Tooltip title="Share">
              <IconButton 
                onClick={handleShare}
                sx={{ color: 'white', mb: 0.5 }}
              >
                <Share size={24} />
              </IconButton>
            </Tooltip>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem'
              }}
            >
              {formatViewCount(shareCount)}
            </Typography>
          </Box>
          
          {/* Bookmark Icon - TikTok style */}
          <Tooltip title={isBookmarked ? "Remove bookmark" : "Bookmark"}>
            <IconButton 
              onClick={handleBookmark}
              sx={{ 
                color: isBookmarked ? 'primary.main' : 'white',
                mt: 1
              }}
            >
              {isBookmarked ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
            </IconButton>
          </Tooltip>
          
          {/* User Avatar for profile */}
          <UserAvatar 
            src={post.author.avatar}
            alt={post.author.displayName || post.author.username}
            size={40}
            isVerified={post.author.isVerified}
            sx={{ 
              border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              cursor: 'pointer',
              mt: 1
            }} 
          />
        </Box>
      </Box>
      
      {/* Menu for additional actions */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            mt: 1,
            boxShadow: `0 4px 20px ${alpha(theme.palette.divider, 0.25)}`,
          }
        }}
      >
        <MenuItem onClick={handleViewAnalytics}>
          <BarChart size={18} style={{ marginRight: 8 }} />
          View Analytics
        </MenuItem>
        <MenuItem onClick={handleOpenPost}>
          <ExternalLink size={18} style={{ marginRight: 8 }} />
          Open Post
        </MenuItem>
        <MenuItem onClick={handleCopyLink}>
          <Copy size={18} style={{ marginRight: 8 }} />
          Copy Link
        </MenuItem>
        {!isOwnPost && (
          <>
            <Divider />
            <MenuItem onClick={handleReport} sx={{ color: 'error.main' }}>
              <Flag size={18} style={{ marginRight: 8 }} />
              Report Post
            </MenuItem>
          </>
        )}
      </Menu>
    </Card>
  );
};
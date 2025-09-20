import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { 
  MoreHorizontal, 
  Heart, 
  MessageSquare, 
  Share, 
  Bookmark,
  Video,
  AlertCircle
} from 'lucide-react';
import { usePostInteractions } from '@/hooks/usePostInteractions';
import { Post } from '@/types/social';
import UserAvatar from '@/components/common/UserAvatar';
import CommentSection from '@/components/Comments/CommentSection';

interface PostCardProps {
  post: Post;
  onBookmark?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onBookmark }) => {
  const theme = useTheme();
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  
  const {
    liked,
    likeCount,
    shareCount,
    isLikePending,
    isSharePending,
    handleLike,
    handleShare,
  } = usePostInteractions({
    initialLiked: post.isLiked || false,
    initialLikeCount: post.likeCount || post.likes || 0,
    initialShareCount: post.shareCount || post.shares || 0,
    postId: post.id,
  });

  // Custom comment handler for inline commenting
  const handleComment = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCommentsExpanded(!commentsExpanded);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format content with hashtags
  const formatContent = (content: string) => {
    return content.split(' ').map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {word}{' '}
          </Typography>
        );
      }
      return word + ' ';
    });
  };

  const handleBookmarkClick = () => {
    if (onBookmark) {
      onBookmark(post.id);
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        '&:hover': {
          boxShadow: theme.shadows[2],
        },
      }}
    >
      <CardHeader
        avatar={
          <UserAvatar
            src={post.author?.avatar || ''}
            alt={post.author?.displayName || post.author?.username || 'User'}
            size="medium"
            isVerified={!!post.author?.isVerified}
            isOnline={false}
          />
        }
        action={
          <IconButton size="small">
            <MoreHorizontal size={18} />
          </IconButton>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {post.author?.displayName || post.author?.username || 'Unknown User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{post.author?.username || 'unknown'}
            </Typography>
          </Box>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {formatDate(post.createdAt)}
          </Typography>
        }
        sx={{ pb: 1 }}
      />
      
      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
          {formatContent(post.content)}
        </Typography>
        
        {/* Media content */}
        {post.media && post.media.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {post.media.map((mediaItem, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                {mediaItem.resource_type === 'image' ? (
                  <Box
                    component="img"
                    src={mediaItem.secure_url || mediaItem.url}
                    alt={mediaItem.alt || `Image ${index + 1}`}
                    sx={{
                      width: '100%',
                      maxHeight: 400,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(mediaItem.secure_url || mediaItem.url, '_blank')}
                  />
                ) : mediaItem.resource_type === 'video' ? (
                  <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                    <video
                      controls
                      style={{
                        width: '100%',
                        maxHeight: '400px',
                        objectFit: 'cover',
                      }}
                      poster={mediaItem.thumbnail_url || (mediaItem as any).thumbnail}
                    >
                      <source src={mediaItem.secure_url || mediaItem.url} type="video/mp4" />
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: 200,
                        bgcolor: alpha(theme.palette.background.paper, 0.1),
                        color: 'text.secondary'
                      }}>
                        <Video size={48} />
                        <Typography sx={{ ml: 2 }}>Video not supported by browser</Typography>
                      </Box>
                    </video>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 2, 
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    borderRadius: 1,
                    color: 'warning.main'
                  }}>
                    <AlertCircle size={20} />
                    <Typography sx={{ ml: 1 }}>
                      Unsupported media type: {mediaItem.resource_type || 'unknown'}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
        
        {/* Interaction buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              color={liked ? 'primary' : 'default'} 
              size="small"
              onClick={handleLike}
              disabled={isLikePending}
            >
              <Heart size={18} fill={liked ? theme.palette.primary.main : 'none'} />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, mr: 2 }}>
              {likeCount}
            </Typography>
            
            <IconButton 
              color="default" 
              size="small"
              onClick={handleComment}
            >
              <MessageSquare size={18} />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5, mr: 2 }}>
              {post.commentCount || post.comments || 0}
            </Typography>
            
            <IconButton 
              color="default" 
              size="small"
              onClick={handleShare}
              disabled={isSharePending}
            >
              <Share size={18} />
            </IconButton>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              {shareCount}
            </Typography>
          </Box>
        
          <IconButton 
            color={post.isBookmarked ? 'primary' : 'default'} 
            size="small"
            onClick={handleBookmarkClick}
          >
            <Bookmark size={18} fill={post.isBookmarked ? theme.palette.primary.main : 'none'} />
          </IconButton>
        </Box>
      </CardContent>
      
      {/* Comments Section */}
      {commentsExpanded && (
        <CommentSection
          postId={post.id || (post as any)._id}
          initialCommentCount={post.commentCount || post.comments || 0}
          isExpanded={commentsExpanded}
          onToggle={setCommentsExpanded}
          enableRealTime={true}
        />
      )}
    </Card>
  );
};

export default PostCard;
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { formatPostContent } from '@/utils/postFormatUtils';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Skeleton,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  Video,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/common/UserAvatar';
import PostAuthor from '@/components/common/PostAuthor';
import CommentSection from '@/components/Comments/CommentSection';
import toast from 'react-hot-toast';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { convertToProxyUrl } from '@/utils/urlConverter';
import { debugMediaLoading } from '@/utils/mediaDebugUtils';

const PostDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsExpanded, setCommentsExpanded] = useState(true);

  // Validate ObjectId (24 hex chars)
  const isValidId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  // Fetch post data
  const {
    data: postData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.posts.getById(id as string),
    enabled: !!id && isValidId,
  });

  // Update state when post data changes
  React.useEffect(() => {
    if (postData && typeof postData === 'object' && 'data' in postData) {
      const post = (postData as any).data;
      setLiked(post.isLiked || false);
      setLikesCount(post.likes || post.likeCount || 0);
    }
  }, [postData]);

  // Get consistent post ID
  const getPostId = (post: any) => {
    const candidate = post?.id || post?._id || id;
    // Ensure we pass a Mongo ObjectId to backend routes that require it
    return typeof candidate === 'string' ? candidate : String(candidate || '');
  };

  // Like post mutation
  const likeMutation = useMutation({
    mutationFn: () => api.posts.like(id as string),
    onSuccess: () => {
      setLiked(true);
      setLikesCount(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: () => {
      toast.error('Failed to like post');
    }
  });

  // Unlike post mutation
  const unlikeMutation = useMutation({
    mutationFn: () => api.posts.unlike(id as string),
    onSuccess: () => {
      setLiked(false);
      setLikesCount(prev => prev - 1);
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: () => {
      toast.error('Failed to unlike post');
    }
  });

  const handleLikeToggle = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like posts');
      router.push('/auth/login');
      return;
    }

    if (liked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const renderMedia = (media: any[]) => {
    if (!media || media.length === 0) return null;

    const firstMedia = media[0];

    // Check if the URL is a post detail page URL (which is invalid for media)
    const mediaUrl = firstMedia.secure_url || firstMedia.url;
    
    // Check if this is a known missing file pattern
    const isKnownMissingFile = mediaUrl && typeof mediaUrl === 'string' && (
      mediaUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
      mediaUrl.includes('file_1760163879851_tt3fdqqim9') ||
      mediaUrl.includes('file_1760263843073_w13593s5t8l') ||
      mediaUrl.includes('file_1760276276250_3pqeekj048s')
    );
    
    const isPostDetailUrl = mediaUrl && typeof mediaUrl === 'string' && mediaUrl.includes('/post/');
    
    // Cross-platform URL validation
    const isValidMediaUrl = (url: string) => {
      if (!url || typeof url !== 'string') return false;
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');
    };
    
    if (firstMedia.resource_type === 'image') {
      // If it's a post detail URL or known missing file, show placeholder instead
      if (isPostDetailUrl || isKnownMissingFile || !isValidMediaUrl(mediaUrl)) {
        return (
          <Box
            component="img"
            src="/images/placeholder-image-new.png"
            alt="Invalid image URL"
            sx={{
              width: '100%',
              maxHeight: 600,
              objectFit: 'cover',
              borderRadius: 1,
              mb: 2,
              backgroundColor: 'transparent',
              display: 'block',
            }}
          />
        );
      }
      
      // Convert URL to use proxy if needed
      const convertedUrl = convertToProxyUrl(mediaUrl);
      const imageUrl = proxyCloudinaryUrl(convertedUrl);
      
      return (
        <Box
          component="img"
          src={imageUrl || '/images/placeholder-image-new.png'}
          alt="Post image"
          loading="lazy"
          sx={{
            width: '100%',
            maxHeight: 600,
            objectFit: 'cover',
            borderRadius: 1,
            mb: 2,
            backgroundColor: 'transparent',
            display: 'block',
          }}
          onError={(e) => {
            console.error('Image failed to load, showing placeholder:', {
              originalUrl: mediaUrl,
              convertedUrl: convertedUrl,
              proxiedUrl: imageUrl
            });
            const target = e.target as HTMLImageElement;
            target.src = '/images/placeholder-image-new.png';
            target.style.display = 'block';
            target.style.backgroundColor = 'transparent';
          }}
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'block';
          }}
        />
      );
    }

    if (firstMedia.resource_type === 'video') {
      // Check if video source exists or if it's a post detail URL or known missing file
      const isKnownMissingFile = mediaUrl && typeof mediaUrl === 'string' && (
        mediaUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
        mediaUrl.includes('file_1760163879851_tt3fdqqim9') ||
        mediaUrl.includes('file_1760263843073_w13593s5t8l') ||
        mediaUrl.includes('file_1760276276250_3pqeekj048s')
      );
      
      if (!mediaUrl || isPostDetailUrl || isKnownMissingFile || !isValidMediaUrl(mediaUrl)) {
        return (
          <Box sx={{ 
            width: '100%',
            maxHeight: 600,
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: 1,
            mb: 2,
          }}>
            <Box sx={{ mb: 2, color: 'text.secondary' }}>
              <Video size={48} />
            </Box>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
              Video Not Available
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {!mediaUrl ? 'The video source is missing or unavailable' : 'Invalid video URL detected'}
            </Typography>
          </Box>
        );
      }
      
      // Convert URL to use proxy if needed
      const convertedUrl = convertToProxyUrl(mediaUrl);
      const proxiedUrl = proxyCloudinaryUrl(convertedUrl);
      
      return (
        <Box
          component="video"
          controls
          preload="metadata"
          sx={{
            width: '100%',
            maxHeight: 600,
            borderRadius: 1,
            mb: 2,
          }}
          onError={(e) => {
            // Handle video loading error by showing error message
            console.error('Video failed to load:', e);
            const target = e.target as HTMLVideoElement;
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; background: #000; color: white; text-align: center; padding: 20px; border-radius: 8px;">
                  <div style="font-size: 48px; margin-bottom: 16px;">🎥</div>
                  <div style="font-size: 18px; margin-bottom: 8px;">Video not available</div>
                  <div style="font-size: 14px; opacity: 0.8;">The video file could not be found</div>
                </div>
              `;
            }
          }}
          onLoadStart={() => {
            console.log('🔄 Video loading started:', proxiedUrl);
          }}
          onLoadedData={() => {
            console.log('✅ Video loaded successfully:', proxiedUrl);
          }}
        >
          <source src={proxiedUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </Box>
      );
    }

    if (firstMedia.resource_type === 'audio') {
      // Check if audio source exists or if it's a post detail URL or known missing file
      const isKnownMissingFile = mediaUrl && typeof mediaUrl === 'string' && (
        mediaUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
        mediaUrl.includes('file_1760163879851_tt3fdqqim9') ||
        mediaUrl.includes('file_1760263843073_w13593s5t8l') ||
        mediaUrl.includes('file_1760276276250_3pqeekj048s')
      );
      
      if (!mediaUrl || isPostDetailUrl || isKnownMissingFile) {
        console.warn('Post detail URL or known missing file detected for audio, hiding element:', mediaUrl);
        return null; // Don't render anything for known missing files
      }
      
      // Convert URL to use proxy if needed
      const convertedUrl = convertToProxyUrl(mediaUrl);
      const proxiedUrl = proxyCloudinaryUrl(convertedUrl);
      
      return (
        <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
          <audio controls style={{ width: '100%' }}>
            <source src={proxiedUrl} type={`audio/${firstMedia.format}`} />
            Your browser does not support the audio tag.
          </audio>
        </Box>
      );
    }

    return null;
  };

  if (!isValidId) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Invalid post link.
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box mb={2}>
          <Skeleton variant="rectangular" height={40} />
        </Box>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box flex={1}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            </Box>
            <Skeleton variant="text" height={60} />
            <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load post. Please try again.
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  const post = postData && typeof postData === 'object' && 'data' in postData ? (postData as any).data : null;
  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Post not found.
        </Alert>
        <Button onClick={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  // Safely render content with hashtags/mentions and links without innerHTML
  const renderContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/\S+|#[\w-]+|@[\w-]+)/g);
    return parts.map((part, idx) => {
      if (/^https?:\/\/\S+$/i.test(part)) {
        return (
          <Box
            key={idx}
            component="a"
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: 'primary.main', textDecoration: 'underline' }}
          >
            {part}
          </Box>
        );
      }
      if (/^#[\w-]+$/.test(part)) {
        const tag = part.slice(1);
        return (
          <Box
            key={idx}
            component="span"
            onClick={() => router.push(`/hashtag/${tag}`)}
            sx={{ color: 'primary.main', fontWeight: 500, cursor: 'pointer' }}
          >
            {part}
          </Box>
        );
      }
      if (/^@[\w-]+$/.test(part)) {
        const handle = part.slice(1);
        return (
          <Box
            key={idx}
            component="span"
            onClick={() => router.push(`/profile/${handle}`)}
            sx={{ color: 'secondary.main', fontWeight: 500, cursor: 'pointer' }}
          >
            {part}
          </Box>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box mb={3}>
        <Button
          startIcon={<ArrowLeft size={16} />}
          onClick={() => router.back()}
          variant="outlined"
        >
          Back
        </Button>
      </Box>

      {/* Post Card */}
      <Card>
        <CardContent>
          {/* Post Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <PostAuthor
              author={post.author}
              createdAt={post.createdAt}
              size="large"
              showRole={true}
              onAuthorClick={() => router.push(`/profile/${post.author?.username}`)}
              sx={{ flex: 1 }}
            />
            
            <IconButton size="small">
              <MoreVertical size={16} />
            </IconButton>
          </Box>

          {/* Post Content */}
          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {renderContent(post.content)}
          </Typography>

          {/* Post Media */}
          {renderMedia(post.media)}

          {/* Post Actions */}
          <Box display="flex" alignItems="center" gap={3} sx={{ pt: 2 }}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconButton 
                size="small"
                color={liked ? "primary" : "default"}
                onClick={handleLikeToggle}
                disabled={likeMutation.isPending || unlikeMutation.isPending}
              >
                <Heart size={20} fill={liked ? "#1976d2" : "none"} />
              </IconButton>
              <Typography variant="body2">{likesCount}</Typography>
            </Box>
            
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconButton 
                size="small"
                onClick={() => setCommentsExpanded(!commentsExpanded)}
              >
                <MessageCircle size={20} />
              </IconButton>
              <Typography variant="body2">{post.comments || 0}</Typography>
            </Box>
            
            <IconButton size="small" onClick={handleShare}>
              <Share2 size={20} />
            </IconButton>
            
            <IconButton size="small">
              <Bookmark size={20} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Box mt={3}>
        <CommentSection
          key={getPostId(post)} // Ensure stable key to prevent unnecessary remounts
          postId={getPostId(post)}
          initialCommentCount={post.comments || 0}
          isExpanded={commentsExpanded}
          onToggle={setCommentsExpanded}
        />
      </Box>
    </Container>
  );
};

export default PostDetailPage;

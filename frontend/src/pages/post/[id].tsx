import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
  Button,
} from '@mui/material';
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Share, 
  Bookmark,
  MoreHorizontal,
  ExternalLink,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Post } from '@/types/social';
import { useRouter } from 'next/router';
import CommentSection from '@/components/Comments/CommentSection';
import UserAvatar from '@/components/common/UserAvatar';

const PostDetailPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id, focus } = router.query;
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Mock post data
  const post: Post = {
    id: id as string || '1',
    type: 'image',
    content: 'Just dropped my new NFT collection! Check it out on the marketplace. #NFT #DigitalArt #Crypto',
    author: {
      username: 'digital_creator',
      displayName: 'Digital Creator',
      avatar: '',
      isVerified: true,
      id: '1',
    },
    media: [
      {
        resource_type: 'image',
        secure_url: '',
      }
    ],
    createdAt: new Date().toISOString(),
    likes: 2450,
    comments: 320,
    shares: 180,
    views: 12000,
    isLiked: false,
    isBookmarked: false,
  };

  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked);

  // Scroll to comments when focus=comments query param is present
  useEffect(() => {
    if (focus === 'comments' && commentsSectionRef.current) {
      commentsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [focus]);

  const handleLike = () => {
    if (liked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setLiked(!liked);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post',
        text: post.content,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Toggle play state for videos
  const togglePlay = () => {
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
  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Handle comment button click - scroll to comments
  const handleCommentClick = () => {
    if (commentsSectionRef.current) {
      commentsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format large numbers (e.g., 1.2K, 3.4M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (!id) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading post...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowLeft size={24} />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            Post
          </Typography>
        </Box>
        
        {/* Post Content */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Post Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <UserAvatar
                  src={post.author?.avatar || ''}
                  alt={post.author?.displayName || post.author?.username || 'User'}
                  size={48}
                  isVerified={post.author?.isVerified}
                />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {post.author?.displayName || post.author?.username}
                    </Typography>
                    {post.author?.isVerified && (
                      <Box 
                        component="span" 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          bgcolor: 'primary.main', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}
                      >
                        <Box component="span" sx={{ color: 'white', fontSize: '0.6rem', fontWeight: 'bold' }}>✓</Box>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    @{post.author?.username}
                  </Typography>
                </Box>
              </Box>
              
              <IconButton>
                <MoreHorizontal size={20} />
              </IconButton>
            </Box>
            
            {/* Post Media */}
            <Box 
              sx={{ 
                height: 400, 
                bgcolor: alpha(theme.palette.grey[300], 0.3),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {post.media && post.media.length > 0 && post.media[0].resource_type === 'image' ? (
                <Box
                  component="img"
                  src={post.media[0].secure_url || ''}
                  alt="Post content"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <Box sx={{ 
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                }}>
                  <video
                    ref={videoRef}
                    src={post.media && post.media.length > 0 ? post.media[0].secure_url || '' : ''}
                    muted={isMuted}
                    loop
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Play/Pause overlay */}
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%', 
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' }
                    }}
                    onClick={togglePlay}
                  >
                    <Play size={24} color="black" />
                  </IconButton>
                  {/* Mute/Unmute button */}
                  <IconButton 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 16,
                      right: 16,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                    }}
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </IconButton>
                </Box>
              )}
              
              <IconButton 
                sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16, 
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
                onClick={() => window.open(post.media && post.media.length > 0 ? post.media[0].secure_url || '' : '', '_blank')}
              >
                <ExternalLink size={20} />
              </IconButton>
            </Box>
            
            {/* Post Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 3, pt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  color={liked ? 'error' : 'default'}
                  onClick={handleLike}
                  sx={{
                    color: liked ? '#ff4757' : 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(255,107,107,0.1)',
                    }
                  }}
                >
                  <Heart size={24} fill={liked ? '#ff4757' : 'none'} />
                </IconButton>
                
                <IconButton
                  onClick={handleCommentClick}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(52,152,219,0.1)',
                    }
                  }}
                >
                  <MessageSquare size={24} />
                </IconButton>
                
                <IconButton
                  onClick={handleShare}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(46,204,113,0.1)',
                    }
                  }}
                >
                  <Share size={24} />
                </IconButton>
              </Box>
              
              <IconButton
                color={bookmarked ? 'primary' : 'default'}
                onClick={handleBookmark}
                sx={{
                  color: bookmarked ? theme.palette.primary.main : 'text.primary',
                  '&:hover': {
                    bgcolor: 'rgba(155,89,182,0.1)',
                  }
                }}
              >
                <Bookmark size={24} fill={bookmarked ? theme.palette.primary.main : 'none'} />
              </IconButton>
            </Box>
            
            {/* Post Stats */}
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
                {formatNumber(likeCount)} likes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(post.createdAt)}
              </Typography>
            </Box>
            
            {/* Post Content */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Typography variant="body1">
                {post.content}
              </Typography>
            </Box>
          </CardContent>
        </Card>
        
        {/* Comments Section */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} ref={commentsSectionRef}>
          <CardContent sx={{ p: 0 }}>
            <CommentSection
              postId={post.id}
              initialCommentCount={post.comments || 0}
              isExpanded={true}
              onToggle={() => {}}
              enableRealTime={true}
            />
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default PostDetailPage;
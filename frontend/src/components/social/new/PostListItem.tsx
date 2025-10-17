import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Button } from '@mui/material';
import { Heart, MessageSquare, Share, Bookmark, Video, Image as ImageIcon } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { isClient, normalizeUrl, isValidUrl } from '@/utils/crossPlatformUtils';

// Use the cross-platform utility for URL validation

// Use the cross-platform utility for URL normalization
const normalizeMediaUrl = normalizeUrl;

// Separate component for video rendering with enhanced cross-platform error handling
const VideoMedia: React.FC<{ 
  src: string; 
  poster?: string; 
  alt?: string;
  maxHeight?: string | number;
}> = ({ src, poster, alt = 'Video', maxHeight = '500px' }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Normalize the source URL
  const normalizedSrc = normalizeMediaUrl(src) || src;

  // Client-side hydration check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate URL format
  useEffect(() => {
    if (normalizedSrc && !isValidUrl(normalizedSrc)) {
      console.warn('❌ Invalid video URL detected:', {
        originalSrc: src,
        normalizedSrc,
        isValid: isValidUrl(normalizedSrc)
      });
      setError(true);
    } else if (normalizedSrc) {
      console.log('✅ Valid video URL detected:', normalizedSrc);
    }
  }, [normalizedSrc, src]);

  // Don't render video on server-side to prevent hydration issues
  if (!isClientSide) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Video size={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading video...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !normalizedSrc) {
    // Log more information for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('VideoMedia component falling back to error UI', {
        src,
        normalizedSrc,
        error,
        validationDetails: {
          hasSrc: !!src,
          hasNormalizedSrc: !!normalizedSrc,
          isUrlValid: normalizedSrc ? isValidUrl(normalizedSrc) : false
        }
      });
    }
    
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Video size={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Video not available
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Check console for details
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', backgroundColor: 'black' }}>
      <video
        src={normalizedSrc}
        controls
        preload="metadata"
        style={{ width: '100%', display: 'block', maxHeight }}
        poster={poster}
        onError={(e) => {
          // Enhanced error logging in development mode
          if (process.env.NODE_ENV === 'development') {
            console.warn('❌ Video loading failed:', {
              normalizedSrc,
              errorEvent: e,
              videoElement: e.target,
              // Try to get more details about why the video failed to load
              networkState: (e.target as HTMLVideoElement).networkState,
              readyState: (e.target as HTMLVideoElement).readyState,
              error: (e.target as HTMLVideoElement).error
            });
            
            // Additional debugging information
            console.log('🔍 Debugging video URL:', {
              url: normalizedSrc,
              urlType: typeof normalizedSrc,
              urlLength: normalizedSrc?.length,
              startsWithHttp: normalizedSrc?.startsWith('http'),
              containsUploads: normalizedSrc?.includes('/uploads/'),
              containsTalkcart: normalizedSrc?.includes('talkcart')
            });
          }
          setError(true);
        }}
        onLoadedData={() => {
          setLoaded(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Video loaded successfully:', normalizedSrc);
          }
        }}
        onLoadStart={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Video loading started:', normalizedSrc);
          }
        }}
      />
    </Box>
  );
};

// Separate component for image rendering with enhanced cross-platform error handling
const ImageMedia: React.FC<{ 
  src: string; 
  alt?: string;
  maxHeight?: string | number;
}> = ({ src, alt = 'Image', maxHeight = '500px' }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Normalize the source URL
  const normalizedSrc = normalizeMediaUrl(src) || src;

  // Client-side hydration check
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate URL format
  useEffect(() => {
    if (normalizedSrc && !isValidUrl(normalizedSrc)) {
      console.warn('❌ Invalid image URL detected:', {
        originalSrc: src,
        normalizedSrc,
        isValid: isValidUrl(normalizedSrc)
      });
      setError(true);
    } else if (normalizedSrc) {
      console.log('✅ Valid image URL detected:', normalizedSrc);
    }
  }, [normalizedSrc, src]);

  // Don't render image on server-side to prevent hydration issues
  if (!isClientSide) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <ImageIcon size={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Loading image...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error || !normalizedSrc) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <ImageIcon size={32} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Image not available
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Check console for details
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <img
        src={normalizedSrc}
        alt={alt}
        loading="lazy"
        style={{ width: '100%', display: 'block', maxHeight, objectFit: 'cover' }}
        onError={(e) => {
          // Enhanced error logging in development mode
          if (process.env.NODE_ENV === 'development') {
            console.warn('❌ Image loading failed:', {
              normalizedSrc,
              errorEvent: e,
              imageElement: e.target,
              // Try to get more details about why the image failed to load
              error: (e.target as HTMLImageElement).alt
            });
            
            // Additional debugging information
            console.log('🔍 Debugging image URL:', {
              url: normalizedSrc,
              urlType: typeof normalizedSrc,
              urlLength: normalizedSrc?.length,
              startsWithHttp: normalizedSrc?.startsWith('http'),
              containsUploads: normalizedSrc?.includes('/uploads/'),
              containsTalkcart: normalizedSrc?.includes('talkcart')
            });
          }
          setError(true);
        }}
        onLoad={() => {
          setLoaded(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Image loaded successfully:', normalizedSrc);
          }
        }}
        onLoadStart={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Image loading started:', normalizedSrc);
          }
        }}
      />
    </Box>
  );
};

// Separate component for grid media with enhanced error handling
const GridMedia: React.FC<{ 
  mediaItem: any; 
  content?: string;
}> = ({ mediaItem, content }) => {
  // Normalize the media URL with better error handling
  const mediaUrl = mediaItem.secure_url || mediaItem.url;
  const normalizedMediaUrl = (mediaUrl && normalizeMediaUrl(mediaUrl)) || mediaUrl;
  
  // Validate URL before rendering
  const isValidMedia = normalizedMediaUrl && (normalizedMediaUrl.startsWith('http://') || normalizedMediaUrl.startsWith('https://'));
  
  if (!isValidMedia) {
    // Show placeholder for invalid media
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: '150px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          {mediaItem.resource_type === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
          <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
            Media not available
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
              Invalid URL (DEBUG: Our fix should prevent this!)
            </Typography>
          )}
        </Box>
      </Box>
    );
  }
  
  if (mediaItem.resource_type === 'video') {
    return (
      <Box sx={{ position: 'relative', width: '100%', backgroundColor: 'black' }}>
        <video 
          src={normalizedMediaUrl || ''} 
          controls 
          style={{ width: '100%', display: 'block', height: '150px' }} 
          poster={mediaItem.thumbnail || mediaItem.thumbnail_url}
          onError={(e) => {
            // Enhanced error logging in development mode
            if (process.env.NODE_ENV === 'development') {
              console.warn('❌ Grid video loading failed:', {
                normalizedMediaUrl,
                mediaItem,
                errorEvent: e,
                videoElement: e.target,
                networkState: (e.target as HTMLVideoElement).networkState,
                readyState: (e.target as HTMLVideoElement).readyState,
                error: (e.target as HTMLVideoElement).error
              });
              
              // Additional debugging information
              console.log('🔍 Debugging grid video URL:', {
                url: normalizedMediaUrl,
                mediaItemDetails: {
                  id: mediaItem.id,
                  public_id: mediaItem.public_id,
                  resource_type: mediaItem.resource_type,
                  format: mediaItem.format
                }
              });
            }
            // Replace with fallback UI
            const target = e.target as HTMLVideoElement;
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0,0,0,0.05); color: #666; text-align: center; padding: 10px;">
                  <div style="font-size: 24px; margin-bottom: 8px;">🎥</div>
                  <div style="font-size: 12px;">Video not available</div>
                  ${process.env.NODE_ENV === 'development' ? `<div style="font-size: 10px; margin-top: 4px;">Check console</div>` : ''}
                </div>
              `;
            }
          }}
          onLoadedData={(e) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Grid video loaded successfully:', normalizedMediaUrl);
            }
          }}
        />
      </Box>
    );
  } else {
    return (
      <img 
        src={normalizedMediaUrl || ''} 
        alt={content || 'post image'} 
        loading="lazy" 
        style={{ width: '100%', display: 'block', height: '150px', objectFit: 'cover' }} 
        onError={(e) => {
          // Enhanced error logging in development mode
          if (process.env.NODE_ENV === 'development') {
            console.warn('❌ Grid image loading failed:', {
              normalizedMediaUrl,
              mediaItem,
              errorEvent: e,
              imageElement: e.target
            });
            
            // Additional debugging information
            console.log('🔍 Debugging grid image URL:', {
              url: normalizedMediaUrl,
              mediaItemDetails: {
                id: mediaItem.id,
                public_id: mediaItem.public_id,
                resource_type: mediaItem.resource_type,
                format: mediaItem.format
              }
            });
          }
          // Replace with fallback UI
          const target = e.target as HTMLImageElement;
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: rgba(0,0,0,0.05); color: #666; text-align: center; padding: 10px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                <div style="font-size: 12px;">Image not available</div>
                ${process.env.NODE_ENV === 'development' ? `<div style="font-size: 10px; margin-top: 4px;">Check console</div>` : ''}
              </div>
            `;
          }
        }}
        onLoad={(e) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Grid image loaded successfully:', normalizedMediaUrl);
          }
        }}
      />
    );
  }
};

interface MediaItem {
  id?: string;
  url?: string;
  secure_url?: string;
  resource_type?: string;
  thumbnail?: string;
  thumbnail_url?: string;
}

interface PostListItemProps {
  post: {
    id: string;
    author?: {
      id: string;
      username?: string;
      displayName?: string;
      avatar?: string;
    };
    content?: string;
    media?: MediaItem[];
    createdAt?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    isLiked?: boolean;
  };
  onBookmark?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onComment?: (postId: string) => void;
}

const PostListItem: React.FC<PostListItemProps> = ({ post, onBookmark, onLike, onShare, onComment }) => {
  const createdLabel = post.createdAt ? formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true }) : '';
  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    // Set isClientSide to true only on the client side to prevent hydration errors
    setIsClientSide(isClient());
  }, []);

  const isValidMediaUrl = (url?: string) => {
    if (!url) return false;
    const normalizedUrl = normalizeMediaUrl(url);
    // Additional check for valid URL format
    return normalizedUrl !== null && (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://'));
  };

  const getValidMediaUrl = (mediaItem: MediaItem) => {
    const url = mediaItem.secure_url || mediaItem.url;
    if (!url) return null;
    
    // Special handling for local development URLs
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Processing media URL:', {
        originalUrl: url,
        mediaItem
      });
    }
    
    return normalizeMediaUrl(url);
  };

  // Function to render media content
  const renderMediaContent = (mediaItem: MediaItem) => {
    const mediaUrl = getValidMediaUrl(mediaItem);
    
    // Enhanced validation
    const isMediaUrlValid = mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'));
    
    if (!isMediaUrlValid) {
      // Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('❌ Invalid media URL detected:', {
          mediaItem,
          mediaUrl,
          secure_url: mediaItem.secure_url,
          url: mediaItem.url
        });
      }
      
      // Render placeholder for missing media
      return (
        <Box 
          sx={{ 
            width: '100%', 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: 1
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {mediaItem.resource_type === 'video' ? <Video size={32} /> : <ImageIcon size={32} />}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Media not available
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Invalid URL (DEBUG: Our fix should prevent this!)
              </Typography>
            )}
          </Box>
        </Box>
      );
    }

    if (mediaItem.resource_type === 'video') {
      // Only render video element on client side to prevent hydration errors
      if (!isClientSide) {
        return (
          <Box sx={{ 
            width: '100%', 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            bgcolor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 1
          }}>
            <Video size={32} color="#666" />
          </Box>
        );
      }
      
      return <VideoMedia src={mediaUrl} poster={mediaItem.thumbnail || mediaItem.thumbnail_url} alt={post.content || 'Video'} />;
    } else {
      // Only render image element on client side to prevent hydration errors
      if (!isClientSide) {
        return (
          <Box sx={{ 
            width: '100%', 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: 1
          }}>
            <ImageIcon size={32} color="#666" />
          </Box>
        );
      }
      
      return <ImageMedia src={mediaUrl} alt={post.content || 'Image'} />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <UserAvatar src={post.author?.avatar} alt={post.author?.username || ''} size={36} />
          <Box>
            <Typography variant="subtitle2">{post.author?.displayName || post.author?.username}</Typography>
            {createdLabel && (
              <Typography variant="caption" color="text.secondary">{createdLabel}</Typography>
            )}
          </Box>
        </Box>

        {post.content && (
          <Typography variant="body1" sx={{ mb: 1 }}>
            {post.content}
          </Typography>
        )}

        {Array.isArray(post.media) && post.media.length > 0 && (
          <Box sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', mb: 1 }}>
            {(() => {
              const validMedia = post.media.filter(m => isValidMediaUrl(m.secure_url || m.url));
              if (validMedia.length === 1) {
                const mediaItem = validMedia[0];
                return mediaItem ? renderMediaContent(mediaItem) : null;
              } else {
                return (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {validMedia.slice(0, 4).map((m, idx) => (
                      <Box key={m.id || idx} sx={{ position: 'relative' }}>
                        {!isClientSide ? (
                          // Render placeholder on server side to prevent hydration errors
                          <Box sx={{ 
                            width: '100%', 
                            height: 150, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            bgcolor: 'rgba(0, 0, 0, 0.05)'
                          }}>
                            {m.resource_type === 'video' ? <Video size={24} color="#666" /> : <ImageIcon size={24} color="#666" />}
                          </Box>
                        ) : (
                          // Additional validation before rendering GridMedia
                          isValidMediaUrl(m.secure_url || m.url) ? (
                            <GridMedia mediaItem={m} content={post.content} />
                          ) : (
                            <Box 
                              sx={{ 
                                width: '100%', 
                                height: '150px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                bgcolor: 'rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                {m.resource_type === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
                                <Typography variant="body2" sx={{ mt: 1, fontSize: '0.75rem' }}>
                                  Media not available
                                </Typography>
                              </Box>
                            </Box>
                          )
                        )}
                      </Box>
                    ))}
                  </Box>
                );
              }
            })()}
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => onLike?.(post.id)} aria-label="like" color={post.isLiked ? 'error' : 'default'}>
            <Heart size={16} />
          </IconButton>
          <Typography variant="caption">{post.likeCount || 0}</Typography>

          <IconButton size="small" onClick={() => onComment?.(post.id)} aria-label="comment">
            <MessageSquare size={16} />
          </IconButton>
          <Typography variant="caption">{post.commentCount || 0}</Typography>

          <IconButton size="small" onClick={() => onShare?.(post.id)} aria-label="share">
            <Share size={16} />
          </IconButton>
          <Typography variant="caption">{post.shareCount || 0}</Typography>

          <Box flex={1} />

          <Button size="small" startIcon={<Bookmark size={14} />} onClick={() => onBookmark?.(post.id)}>
            Save
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PostListItem;
export { PostListItem };
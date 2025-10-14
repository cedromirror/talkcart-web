import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Button } from '@mui/material';
import { Heart, MessageSquare, Share, Bookmark, Video, Image as ImageIcon } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { formatDistanceToNow, parseISO } from 'date-fns';

// Debug component that shows exactly what data is being passed
const DebugPostListItem: React.FC<any> = ({ post, onBookmark, onLike, onShare, onComment }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true only on the client side to prevent hydration errors
    setIsClient(true);
  }, []);

  // Debug function to show the exact data structure
  const debugMediaData = (mediaItem: any, index: number) => {
    console.log(`Debug Media Item ${index}:`, JSON.stringify(mediaItem, null, 2));
    
    // Check for specific properties
    const hasSecureUrl = 'secure_url' in mediaItem;
    const hasUrl = 'url' in mediaItem;
    const hasPublicId = 'public_id' in mediaItem;
    const hasResourceType = 'resource_type' in mediaItem;
    
    console.log(`Media Item ${index} Properties:`, {
      hasSecureUrl,
      hasUrl,
      hasPublicId,
      hasResourceType,
      secure_url: mediaItem.secure_url,
      url: mediaItem.url,
      public_id: mediaItem.public_id,
      resource_type: mediaItem.resource_type
    });
    
    // Test our URL functions
    const primaryUrl = mediaItem.secure_url || mediaItem.url;
    if (primaryUrl) {
      try {
        const url = new URL(primaryUrl);
        console.log(`Media Item ${index} URL Protocol:`, url.protocol);
        console.log(`Media Item ${index} URL Host:`, url.host);
        console.log(`Media Item ${index} URL Pathname:`, url.pathname);
      } catch (e) {
        console.log(`Media Item ${index} URL Error:`, e);
      }
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Debug information */}
        <Box sx={{ mb: 2, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Debug Information</Typography>
          <Typography variant="body2">Post ID: {post.id}</Typography>
          <Typography variant="body2">Media Items: {Array.isArray(post.media) ? post.media.length : 0}</Typography>
          <Typography variant="body2">Is Client: {isClient.toString()}</Typography>
          
          {Array.isArray(post.media) && post.media.map((mediaItem: any, index: number) => {
            // Log debug information
            debugMediaData(mediaItem, index);
            
            return (
              <Box key={index} sx={{ mt: 1, p: 1, bgcolor: '#e0e0e0', borderRadius: 1 }}>
                <Typography variant="body2">Media Item {index}:</Typography>
                <Typography variant="caption">secure_url: {mediaItem.secure_url || 'undefined'}</Typography>
                <br />
                <Typography variant="caption">url: {mediaItem.url || 'undefined'}</Typography>
                <br />
                <Typography variant="caption">public_id: {mediaItem.public_id || 'undefined'}</Typography>
                <br />
                <Typography variant="caption">resource_type: {mediaItem.resource_type || 'undefined'}</Typography>
              </Box>
            );
          })}
        </Box>
        
        {/* Original PostListItem content */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <UserAvatar src={post.author?.avatar} alt={post.author?.username || ''} size={36} />
          <Box>
            <Typography variant="subtitle2">{post.author?.displayName || post.author?.username}</Typography>
            {post.createdAt && (
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}
              </Typography>
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
            <Typography variant="body2" sx={{ p: 1, bgcolor: '#ffeeba', color: '#856404' }}>
              Media debugging enabled - check browser console for detailed information
            </Typography>
            {/* We're not rendering the actual media here to avoid the "Video not available" issue */}
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Media items would be displayed here</Typography>
              <Typography variant="caption">Check console for debug information</Typography>
            </Box>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <IconButton size="small" onClick={() => onLike?.(post.id)} aria-label="like">
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

export default DebugPostListItem;
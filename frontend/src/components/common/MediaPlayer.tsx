import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { PlayArrow, Image as ImageIcon, VideoLibrary } from '@mui/icons-material';

interface MediaPlayerProps {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackImage?: string;
  width?: number;
  height?: number;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({
  url,
  type,
  alt = '',
  className = '',
  style = {},
  fallbackImage,
  width = 400,
  height = 300,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState(url);
  const [resourceType, setResourceType] = useState(type);

  // Handle media loading errors
  const handleMediaError = (e: React.SyntheticEvent<HTMLVideoElement | HTMLImageElement>) => {
    console.error('Media loading error:', e);
    setError('Failed to load media. The file may have been deleted or is temporarily unavailable.');
    setLoading(false);
    
    // Try fallback image if it's a video
    if (resourceType === 'video' && fallbackImage) {
      setResourceType('image');
      setMediaUrl(fallbackImage);
    }
  };

  // Handle media load
  const handleMediaLoad = () => {
    console.log('Media loaded successfully');
    setLoading(false);
    setError(null);
  };

  // Reset state when URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMediaUrl(url);
    setResourceType(type);
  }, [url, type]);

  return (
    <Box
      className={`media-player ${className}`}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: height,
        minWidth: width,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {loading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="caption" color="textSecondary">
            Loading media...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert
          severity="warning"
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && resourceType === 'image' && (
        <img
          src={mediaUrl}
          alt={alt}
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: loading ? 'none' : 'block',
          }}
        />
      )}

      {!loading && !error && resourceType === 'video' && (
        <video
          src={mediaUrl}
          controls
          onLoadedData={handleMediaLoad}
          onError={handleMediaError}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: loading ? 'none' : 'block',
          }}
        />
      )}

      {/* Fallback UI if all else fails */}
      {!loading && error && !mediaUrl && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
            textAlign: 'center',
          }}
        >
          {type === 'video' ? <VideoLibrary sx={{ fontSize: 48 }} /> : <ImageIcon sx={{ fontSize: 48 }} />}
          <Typography variant="body2" color="textSecondary">
            Media not available
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MediaPlayer;
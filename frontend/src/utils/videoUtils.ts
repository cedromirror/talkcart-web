import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Validate video file before upload
 */
export const validateVideoFile = (file: File): { valid: boolean; error?: string; details?: string } => {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file size (200MB limit)
  const maxSize = 200 * 1024 * 1024; // 200MB in bytes
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: 'File too large', 
      details: `Selected file is ${fileSizeMB}MB. Maximum allowed size is 200MB.` 
    };
  }

  // Check file type
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/x-matroska' // MKV
  ];

  if (!allowedTypes.includes(file.type)) {
    // Also check file extension as fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      return { 
        valid: false, 
        error: 'Unsupported file type', 
        details: `File type ${file.type || 'unknown'} is not supported. Supported formats: MP4, WebM, OGG, MOV, AVI, MKV.` 
      };
    }
  }

  // Additional validation for video files
  if (file.type.startsWith('video/')) {
    // Check if filename seems valid
    if (!file.name || file.name.length < 5) {
      return { 
        valid: false, 
        error: 'Invalid filename', 
        details: 'The selected file has an invalid name.' 
      };
    }
  }

  return { valid: true };
};

/**
 * Get volume icon based on muted state
 */
export const getVolumeIcon = (
  muted: boolean, 
  volume?: number, 
  size: number = 20
): React.ReactElement => {
  if (muted || volume === 0) {
    return React.createElement(VolumeX, { size });
  }
  
  return React.createElement(Volume2, { size });
};

/**
 * Get volume tooltip text
 */
export const getVolumeTooltip = (muted: boolean, volume?: number): string => {
  if (muted || volume === 0) {
    return 'Unmute';
  }
  
  return 'Mute';
};

/**
 * Format video duration
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Get video quality label
 */
export const getQualityLabel = (width?: number, height?: number): string => {
  if (!width || !height) return 'Unknown';
  
  if (height >= 2160) return '4K';
  if (height >= 1440) return '2K';
  if (height >= 1080) return 'HD';
  if (height >= 720) return 'HD';
  if (height >= 480) return 'SD';
  
  return 'Low';
};

/**
 * Calculate video aspect ratio
 */
export const getAspectRatio = (width?: number, height?: number): number => {
  if (!width || !height) return 16 / 9; // Default aspect ratio
  
  return width / height;
};

/**
 * Check if video format is supported
 */
export const isVideoFormatSupported = (format: string): boolean => {
  const supportedFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  return supportedFormats.includes(format.toLowerCase());
};
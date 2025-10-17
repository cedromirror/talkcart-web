/**
 * Cross-platform utilities for consistent behavior across different environments
 */

/**
 * Detects if the code is running on the client side
 */
export const isClient = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Detects if the code is running on the server side
 */
export const isServer = (): boolean => {
  return typeof window === 'undefined';
};

/**
 * Gets the base URL for API requests with cross-platform support
 */
export const getBaseUrl = (): string => {
  if (isClient()) {
    // Client-side: use current origin
    return window.location.origin;
  } else {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
};

/**
 * Normalizes URLs for cross-platform compatibility
 */
export const normalizeUrl = (url: string): string | null => {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // Handle data URLs (base64 encoded images)
    if (url.startsWith('data:')) {
      return url;
    }
    
    // Handle blob URLs (for client-side generated content)
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // Handle already valid absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Fix duplicate path issues
      if (url.includes('/uploads/talkcart/talkcart/')) {
        return url.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
      }
      return url;
    }
    
    // Handle relative URLs by converting to absolute
    if (url.startsWith('/')) {
      // Fix duplicate path issues
      if (url.includes('/uploads/talkcart/talkcart/')) {
        url = url.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
      }
      
      const baseUrl = getBaseUrl();
      return `${baseUrl}${url}`;
    }
    
    return null;
  } catch (e) {
    console.error('Error normalizing URL:', e);
    return null;
  }
};

/**
 * Validates URLs with cross-platform support
 */
export const isValidUrl = (url: string): boolean => {
  try {
    if (!url || typeof url !== 'string') return false;
    
    // Handle Cloudinary URLs with special characters
    if (url.includes('cloudinary.com')) {
      return url.startsWith('http://') || url.startsWith('https://');
    }
    
    // Handle relative URLs (common in development)
    if (url.startsWith('/')) {
      return true;
    }
    
    // Handle data URLs
    if (url.startsWith('data:')) {
      return true;
    }
    
    // Handle blob URLs
    if (url.startsWith('blob:')) {
      return true;
    }
    
    // Standard URL validation
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Safely handles post data with cross-platform compatibility
 */
export const normalizePostData = (post: any): any => {
  if (!post) return null;
  
  return {
    ...post,
    // Ensure consistent ID field
    id: post.id || post._id || '',
    // Ensure consistent author structure
    author: {
      ...post.author,
      id: post.author?.id || post.author?._id || '',
      name: post.author?.name || post.author?.displayName || post.author?.username || 'Unknown User',
    },
    // Ensure numeric fields are properly handled
    views: post.views || 0,
    likeCount: post.likeCount || post.likes || 0,
    commentCount: post.commentCount || post.comments || 0,
    shareCount: post.shareCount || post.shares || 0,
    bookmarkCount: post.bookmarkCount || post.bookmarks || 0,
    // Ensure media array is properly structured
    media: Array.isArray(post.media) ? post.media.map((media: any) => ({
      ...media,
      id: media.id || media._id || media.public_id || '',
      resource_type: media.resource_type || 'image',
      secure_url: media.secure_url || media.url || '',
      url: media.secure_url || media.url || '',
    })) : [],
    // Ensure arrays are properly handled
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    mentions: Array.isArray(post.mentions) ? post.mentions : [],
    // Ensure boolean fields have defaults
    isLiked: Boolean(post.isLiked),
    isBookmarked: Boolean(post.isBookmarked),
    isShared: Boolean(post.isShared),
    isActive: post.isActive !== false,
  };
};

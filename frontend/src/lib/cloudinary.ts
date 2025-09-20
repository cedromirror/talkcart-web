import { Cloudinary } from '@cloudinary/url-gen';

// Cloudinary configuration
const cloudinary = new Cloudinary({
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  },
});

// Upload preset for unsigned uploads
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'talkcart_uploads';

// Upload URL (using our backend API)
const UPLOAD_URL = '/api/media/upload/single';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
  created_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a file to Cloudinary
 */
export const uploadToCloudinary = async (
  file: File,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    folder?: string;
    tags?: string[];
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<CloudinaryUploadResult> => {
  const { onProgress } = options;
  const formData = new FormData();
  formData.append('file', file);
  
  // Don't add resource_type to FormData - let the backend handle it automatically

  const xhr = new XMLHttpRequest();

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (!response.public_id || !response.secure_url) {
            reject(new Error('Missing required fields in upload response'));
            return;
          }
          resolve({
            public_id: response.public_id,
            secure_url: response.secure_url,
            url: response.url || response.secure_url,
            format: response.format,
            resource_type: response.resource_type || 'auto',
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            duration: response.duration,
            created_at: response.created_at || new Date().toISOString()
          });
        } catch (error) {
          reject(new Error(`Failed to parse upload response: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        // Try to get error details from response
        let errorMessage = `Upload failed with status: ${xhr.status}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error) {
            errorMessage += ` - ${errorResponse.error}`;
          }
          if (errorResponse.details) {
            errorMessage += ` (${errorResponse.details})`;
          }
        } catch (e) {
          // If response is not JSON, include raw response
          if (xhr.responseText) {
            errorMessage += ` - ${xhr.responseText}`;
          }
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.open('POST', UPLOAD_URL);
    xhr.send(formData);
  });
};

/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  files: File[],
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    folder?: string;
    tags?: string[];
    onProgress?: (fileIndex: number, progress: UploadProgress) => void;
    onFileComplete?: (fileIndex: number, result: CloudinaryUploadResult) => void;
  } = {}
): Promise<CloudinaryUploadResult[]> => {
  const { onProgress, onFileComplete, ...uploadOptions } = options;
  
  const uploadPromises = files.map((file, index) => {
    return uploadToCloudinary(file, {
      ...uploadOptions,
      onProgress: onProgress ? (progress) => onProgress(index, progress) : undefined,
    }).then((result) => {
      if (onFileComplete) {
        onFileComplete(index, result);
      }
      return result;
    });
  });

  return Promise.all(uploadPromises);
};

/**
 * Generate optimized image URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
  } = {}
): string => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  let transformations = [`q_${quality}`, `f_${format}`];
  
  if (width || height) {
    const dimensions = [];
    if (width) dimensions.push(`w_${width}`);
    if (height) dimensions.push(`h_${height}`);
    transformations.push(...dimensions, `c_${crop}`);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`;
};

/**
 * Generate video thumbnail URL
 */
export const getVideoThumbnailUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}
): string => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
  return `https://res.cloudinary.com/${cloudName}/video/upload/w_${width},h_${height},c_fill,q_${quality},f_jpg/${publicId}.jpg`;
};

/**
 * Delete a file from Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
  // Note: This requires server-side implementation for security
  // Client-side deletion is not recommended for production
  console.warn('Cloudinary deletion should be implemented on the server side');
  
  // This would typically be done via your backend API
  // Example: await api.cloudinary.delete({ publicId, resourceType });
};

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'audio/mp3', 'audio/wav'],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { isValid: true };
};

/**
 * Get file type category
 */
export const getFileTypeCategory = (file: File): 'image' | 'video' | 'audio' | 'document' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
};

export default cloudinary;

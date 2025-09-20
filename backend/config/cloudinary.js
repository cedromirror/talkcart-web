const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage configuration for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'talkcart',
    resource_type: 'auto', // Automatically detect resource type
    public_id: (req, file) => {
      // Generate unique public_id
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `${file.fieldname}_${timestamp}_${randomString}`;
    },
  },
});

// Multer upload configuration for general uploads
const MAX_UPLOAD_MB = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || '200', 10);
const MAX_FIELD_MB = parseInt(process.env.UPLOAD_MAX_FIELD_SIZE_MB || String(Math.max(200, MAX_UPLOAD_MB)), 10);

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024, // configurable (default 200MB)
    fieldSize: MAX_FIELD_MB * 1024 * 1024, // configurable
    files: 1, // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter check:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check file type
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Video
      'video/mp4',
      'video/mov', // some browsers report MOV as video/quicktime
      'video/quicktime',
      'video/avi',
      'video/x-msvideo',
      'video/x-matroska', // mkv
      'video/webm',
      'video/mpeg',
      'video/3gpp',
      'video/3gpp2',
      // Audio
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/webm'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      console.log('File type allowed:', file.mimetype);
      cb(null, true);
    } else {
      console.log('File type rejected:', file.mimetype);
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
  onError: (err, next) => {
    console.error('Multer onError:', err);
    next(err);
  }
});

// Multer upload configuration specifically for profile pictures
const profilePictureUpload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for profile pictures
  },
  fileFilter: (req, file, cb) => {
    // Check file type - only images allowed for profile pictures
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed for profile pictures. Only JPG, PNG, GIF, and WebP are supported.`), false);
    }
  },
});

/**
 * Upload single file to Cloudinary
 */
const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

/**
 * Upload multiple files to Cloudinary
 */
const uploadMultiple = (fieldName, maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

/**
 * Upload files with different field names
 */
const uploadFields = (fields) => {
  return upload.fields(fields);
};

/**
 * Upload single profile picture to Cloudinary with size validation
 */
const uploadProfilePicture = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = profilePictureUpload.single(fieldName);

    uploadHandler(req, res, (err) => {
      if (err) {
        return next(err);
      }

      // Additional server-side file size validation
      if (req.file && req.file.size) {
        const fileSizeInMB = req.file.size / (1024 * 1024);

        if (fileSizeInMB > 15) {
          return res.status(400).json({
            success: false,
            error: 'Profile picture must be less than 15MB in size',
            details: `Current size: ${fileSizeInMB.toFixed(2)}MB`
          });
        }
      }

      // Make sure we're using the actual uploaded file, not a mock
      if (!req.file || (!req.file.path && !req.file.public_id)) {
        return res.status(400).json({
          success: false,
          error: 'No valid profile picture uploaded',
          details: 'Please select an image from your device'
        });
      }

      next();
    });
  };
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 */
const deleteMultipleFiles = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw error;
  }
};

/**
 * Get optimized image URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    crop,
    secure: true,
  });
};

/**
 * Get video thumbnail URL
 */
const getVideoThumbnail = (publicId, options = {}) => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    width,
    height,
    quality,
    format: 'jpg',
    crop: 'fill',
    secure: true,
  });
};

/**
 * Get optimized video URL for different qualities
 */
const getOptimizedVideoUrl = (publicId, options = {}) => {
  const {
    quality = 'auto',
    format = 'mp4',
    width,
    height,
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    quality,
    format,
    ...(width && { width }),
    ...(height && { height }),
    flags: 'streaming_attachment',
    secure: true,
  });
};

/**
 * Generate video preview for reels/short videos
 */
const getVideoPreview = (publicId, options = {}) => {
  const {
    duration = 10, // Preview duration in seconds
    startOffset = 0,
    width = 300,
    height = 400,
    quality = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    width,
    height,
    crop: 'fill',
    quality,
    start_offset: startOffset,
    duration,
    format: 'mp4',
    secure: true,
  });
};

/**
 * Upload file from URL
 */
const uploadFromUrl = async (url, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: 'talkcart',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary URL upload error:', error);
    throw error;
  }
};

/**
 * Upload file from base64
 */
const uploadFromBase64 = async (base64String, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'talkcart',
      resource_type: 'auto',
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    throw error;
  }
};

/**
 * Get file info from Cloudinary
 */
const getFileInfo = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary get file info error:', error);
    throw error;
  }
};

/**
 * Search files in Cloudinary
 */
const searchFiles = async (expression, options = {}) => {
  try {
    const result = await cloudinary.search
      .expression(expression)
      .sort_by([['created_at', 'desc']])
      .max_results(options.maxResults || 30)
      .execute();
    return result;
  } catch (error) {
    console.error('Cloudinary search error:', error);
    throw error;
  }
};

/**
 * Create upload preset programmatically
 */
const createUploadPreset = async (presetName, options = {}) => {
  try {
    const result = await cloudinary.api.create_upload_preset({
      name: presetName,
      folder: 'talkcart',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mp3', 'wav'],
      ...options,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary create preset error:', error);
    throw error;
  }
};

/**
 * Upload file buffer to Cloudinary
 */
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'talkcart/marketplace',
          resource_type: 'auto',
          ...options,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload buffer error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadProfilePicture,
  deleteFile,
  deleteMultipleFiles,
  getOptimizedUrl,
  getVideoThumbnail,
  getOptimizedVideoUrl,
  getVideoPreview,
  uploadFromUrl,
  uploadFromBase64,
  uploadToCloudinary,
  getFileInfo,
  searchFiles,
  createUploadPreset,
};

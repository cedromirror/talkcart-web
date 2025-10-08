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

    // Allow all file types for now, but log what's being uploaded
    console.log('File type allowed:', file.mimetype);
    cb(null, true);
  },
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

      next();
    });
  };
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Delete multiple files from Cloudinary
 */
const deleteMultipleFiles = async (publicIds) => {
  try {
    return await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Cloudinary delete multiple error:', error);
    throw error;
  }
};

/**
 * Get optimized URL for image
 */
const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  let transformations = [`q_${quality}`, `f_${format}`];
  
  if (width || height) {
    const dimensions = [];
    if (width) dimensions.push(`w_${width}`);
    if (height) dimensions.push(`h_${height}`);
    transformations.push(...dimensions, `c_${crop}`);
  }

  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true,
  });
};

/**
 * Get video thumbnail
 */
const getVideoThumbnail = (publicId, options = {}) => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      { width, height, crop: 'fill' },
      { quality },
      { format: 'jpg' }
    ],
    secure: true,
  });
};

/**
 * Get optimized video URL
 */
const getOptimizedVideoUrl = (publicId, options = {}) => {
  const {
    width,
    height,
    quality = 'auto',
    format = 'mp4',
  } = options;

  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [
      width || height ? { width, height, crop: 'fill' } : {},
      { quality },
      { format }
    ],
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
 * Get file information
 */
const getFileInfo = async (publicId) => {
  try {
    return await cloudinary.api.resource(publicId);
  } catch (error) {
    console.error('Cloudinary file info error:', error);
    throw error;
  }
};

/**
 * Search files
 */
const searchFiles = async (expression, options = {}) => {
  try {
    return await cloudinary.api.resources_by_tag(expression, options);
  } catch (error) {
    console.error('Cloudinary search error:', error);
    throw error;
  }
};

/**
 * Create upload preset
 */
const createUploadPreset = async (name, options = {}) => {
  try {
    return await cloudinary.api.create_upload_preset({
      name,
      folder: 'talkcart',
      ...options,
    });
  } catch (error) {
    console.error('Cloudinary create preset error:', error);
    throw error;
  }
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
 * Upload file buffer to Cloudinary
 */
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'talkcart',
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
  uploadFromUrl,
  getFileInfo,
  searchFiles,
  createUploadPreset,
  getVideoPreview,
  uploadFromBase64,
  uploadToCloudinary,
};
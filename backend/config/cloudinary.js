const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Cloudinary configuration check

// Configure Cloudinary only if credentials are provided
if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

// Create uploads directory if it doesn't exist (for local fallback)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create talkcart subdirectory for local storage (only one level deep)
const talkcartDir = path.join(uploadDir, 'talkcart');
if (!fs.existsSync(talkcartDir)) {
  fs.mkdirSync(talkcartDir, { recursive: true });
}

// Storage configuration - use Cloudinary if credentials are provided, otherwise use local disk storage
let storage;
if (config.cloudinary.enabled) {
  // Cloudinary storage configuration for multer
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'talkcart',
      resource_type: 'auto', // Automatically detect resource type
      public_id: (req, file) => {
        // Generate unique public_id without additional folder nesting
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        return `${file.fieldname}_${timestamp}_${randomString}`;
      },
    },
  });
} else {
  // Local disk storage configuration for multer
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, talkcartDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `file_${uniqueSuffix}_${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
      cb(null, filename);
    }
  });
}

// Multer upload configuration for general uploads
const MAX_UPLOAD_MB = config.upload.maxFileSize;
const MAX_FIELD_MB = config.upload.maxFieldSize;

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024, // configurable (default 200MB)
    fieldSize: MAX_FIELD_MB * 1024 * 1024, // configurable
    files: 1, // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
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
 * Upload single file to Cloudinary or local storage
 */
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(fieldName);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // If using local storage, fix the file URL
      if (!config.cloudinary.enabled && req.file) {
        // Generate proper local URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        req.file.secure_url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
        req.file.url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
        req.file.public_id = `talkcart/${req.file.filename}`;
      }
      
      next();
    });
  };
};

/**
 * Upload multiple files to Cloudinary or local storage
 */
const uploadMultiple = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    const uploadHandler = upload.array(fieldName, maxCount);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // If using local storage, fix the file URLs
      if (!config.cloudinary.enabled && req.files) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        req.files.forEach(file => {
          file.secure_url = `${baseUrl}/uploads/talkcart/${file.filename}`;
          file.url = `${baseUrl}/uploads/talkcart/${file.filename}`;
          file.public_id = `talkcart/${file.filename}`;
        });
      }
      
      next();
    });
  };
};

/**
 * Upload files with different field names
 */
const uploadFields = (fields) => {
  return (req, res, next) => {
    const uploadHandler = upload.fields(fields);
    
    uploadHandler(req, res, async (err) => {
      if (err) {
        return next(err);
      }
      
      // If using local storage, fix the file URLs
      if (!config.cloudinary.enabled) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        // Handle single files
        if (req.file) {
          req.file.secure_url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
          req.file.url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
          req.file.public_id = `talkcart/${req.file.filename}`;
        }
        
        // Handle multiple files
        if (req.files) {
          Object.keys(req.files).forEach(fieldname => {
            const files = req.files[fieldname];
            if (Array.isArray(files)) {
              files.forEach(file => {
                file.secure_url = `${baseUrl}/uploads/talkcart/${file.filename}`;
                file.url = `${baseUrl}/uploads/talkcart/${file.filename}`;
                file.public_id = `talkcart/${file.filename}`;
              });
            }
          });
        }
      }
      
      next();
    });
  };
};

/**
 * Upload single profile picture to Cloudinary or local storage with size validation
 */
const uploadProfilePicture = (fieldName) => {
  return (req, res, next) => {
    const uploadHandler = profilePictureUpload.single(fieldName);

    uploadHandler(req, res, (err) => {
      if (err) {
        return next(err);
      }

      // If using local storage, fix the file URL
      if (!config.cloudinary.enabled && req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        req.file.secure_url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
        req.file.url = `${baseUrl}/uploads/talkcart/${req.file.filename}`;
        req.file.public_id = `talkcart/${req.file.filename}`;
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
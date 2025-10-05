const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// Common validation schemas
const commonSchemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  email: Joi.string().email().lowercase().trim(),
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/).trim(),
  password: Joi.string().min(6).max(128),
  url: Joi.string().uri(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }
};

// Validation schemas for different endpoints
const schemas = {
  // Auth schemas
  register: Joi.object({
    username: commonSchemas.username.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    displayName: Joi.string().max(50).trim().required()
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required()
  }),

  updateProfile: Joi.object({
    displayName: Joi.string().max(50).trim(),
    bio: Joi.string().max(500).trim().allow(''),
    location: Joi.string().max(100).trim().allow(''),
    website: commonSchemas.url.allow(''),
    socialLinks: Joi.object({
      twitter: Joi.string().allow(''),
      discord: Joi.string().allow(''),
      telegram: Joi.string().allow(''),
      instagram: Joi.string().allow(''),
      linkedin: Joi.string().allow('')
    })
  }),

  // User schemas
  followUser: Joi.object({
    userId: commonSchemas.objectId.required()
  }),

  // Post schemas
  createPost: Joi.object({
    content: Joi.string().max(2000).required(),
    type: Joi.string().valid('text', 'image', 'video', 'poll').default('text'),
    privacy: Joi.string().valid('public', 'followers', 'private').default('public'),
    hashtags: Joi.array().items(Joi.string().max(50)).max(10),
    media: Joi.array().items(Joi.object({
      url: Joi.string().required(),
      type: Joi.string().valid('image', 'video').required(),
      thumbnail: Joi.string()
    })).max(10),
    location: Joi.object({
      name: Joi.string().max(100),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }),
    pollOptions: Joi.array().items(Joi.string().max(100)).when('type', {
      is: 'poll',
      then: Joi.array().min(2).max(6),
      otherwise: Joi.forbidden()
    })
  }),

  updatePost: Joi.object({
    content: Joi.string().max(2000),
    privacy: Joi.string().valid('public', 'followers', 'private'),
    hashtags: Joi.array().items(Joi.string().max(50)).max(10)
  }),

  // Comment schemas
  createComment: Joi.object({
    postId: commonSchemas.objectId.required(),
    content: Joi.string().max(1000).required(),
    parentId: commonSchemas.objectId
  }),

  updateComment: Joi.object({
    content: Joi.string().max(1000).required()
  }),

  // Product schemas
  createProduct: Joi.object({
    name: Joi.string().max(200).required(),
    description: Joi.string().max(2000).required(),
    price: Joi.number().min(0).required(),
    currency: Joi.string().valid('ETH', 'BTC', 'USD', 'USDC', 'USDT').default('ETH'),
    category: Joi.string().valid(
      'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
      'Books', 'Collectibles', 'Education', 'Accessories', 
      'Food & Beverages', 'Fitness', 'Other'
    ).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    stock: Joi.number().integer().min(0).default(1),
    isNFT: Joi.boolean().default(false),
    contractAddress: Joi.string().when('isNFT', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.optional()
    }),
    tokenId: Joi.string().when('isNFT', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.optional()
    })
  }),

  updateProduct: Joi.object({
    name: Joi.string().max(200),
    description: Joi.string().max(2000),
    price: Joi.number().min(0),
    currency: Joi.string().valid('ETH', 'BTC', 'USD', 'USDC', 'USDT'),
    category: Joi.string().valid(
      'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
      'Books', 'Collectibles', 'Education', 'Accessories', 
      'Food & Beverages', 'Fitness', 'Other'
    ),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    stock: Joi.number().integer().min(0),
    isActive: Joi.boolean()
  }),

  // Order schemas
  createOrder: Joi.object({
    items: Joi.array().items(Joi.object({
      productId: commonSchemas.objectId.required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required()
    })).min(1).required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    }).required(),
    paymentMethod: Joi.string().valid('crypto', 'stripe', 'flutterwave').required()
  }),

  // Message schemas
  createMessage: Joi.object({
    conversationId: commonSchemas.objectId.required(),
    content: Joi.string().max(5000).required(),
    type: Joi.string().valid('text', 'image', 'video', 'audio', 'file').default('text'),
    media: Joi.object({
      url: Joi.string().required(),
      type: Joi.string().required(),
      size: Joi.number(),
      filename: Joi.string()
    }).when('type', {
      is: Joi.not('text'),
      then: Joi.object().required(),
      otherwise: Joi.forbidden()
    })
  }),

  // Search schemas
  search: Joi.object({
    q: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('all', 'users', 'posts', 'products', 'hashtags').default('all'),
    filters: Joi.string(),
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit
  }),

  // Notification schemas
  createNotification: Joi.object({
    recipient: commonSchemas.objectId.required(),
    type: Joi.string().valid(
      'follow', 'unfollow', 'like', 'comment', 'mention', 'share',
      'message', 'order', 'payment', 'product_approved', 'product_rejected',
      'system', 'admin'
    ).required(),
    title: Joi.string().max(100).required(),
    message: Joi.string().max(500).required(),
    data: Joi.object().default({}),
    relatedId: commonSchemas.objectId,
    relatedModel: Joi.string().valid('Post', 'Comment', 'Product', 'Order', 'Message', 'User'),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    actionUrl: Joi.string()
  }),

  markNotificationsRead: Joi.object({
    notificationIds: Joi.array().items(commonSchemas.objectId).min(1).required()
  }),

  // Admin schemas
  updateUserRole: Joi.object({
    role: Joi.string().valid('user', 'moderator', 'admin').required()
  }),

  suspendUser: Joi.object({
    reason: Joi.string().max(500).required(),
    duration: Joi.number().integer().min(1) // days
  }),

  // Media upload schemas
  uploadMedia: Joi.object({
    type: Joi.string().valid('avatar', 'cover', 'post', 'product', 'message').required()
  }),

  // Review schemas
  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().max(100).trim(),
    comment: Joi.string().max(1000).trim().required()
  })
};

// Validation middleware factory
const validate = (schemaName, source = 'body') => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return next(new ValidationError(`Validation schema '${schemaName}' not found`));
    }

    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return next(new ValidationError('Validation failed', details));
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Validate query parameters
const validateQuery = (schemaName) => validate(schemaName, 'query');

// Validate request parameters
const validateParams = (schemaName) => validate(schemaName, 'params');

// Custom validation for file uploads
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize = 10 * 1024 * 1024, // 10MB
    required = false
  } = options;

  return (req, res, next) => {
    const file = req.file;
    const files = req.files;

    if (!file && !files && required) {
      return next(new ValidationError('File is required'));
    }

    if (!file && !files) {
      return next();
    }

    const filesToCheck = files || [file];

    for (const fileToCheck of filesToCheck) {
      if (!allowedTypes.includes(fileToCheck.mimetype)) {
        return next(new ValidationError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        ));
      }

      if (fileToCheck.size > maxSize) {
        return next(new ValidationError(
          `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
        ));
      }
    }

    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: commonSchemas.pagination.page,
    limit: commonSchemas.pagination.limit,
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'price', 'rating', 'sales').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc', '1', '-1').default('desc')
  });

  const { error, value } = schema.validate(req.query, {
    stripUnknown: false,
    convert: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return next(new ValidationError('Invalid pagination parameters', details));
  }

  // Normalize sort order
  if (value.sortOrder === '1' || value.sortOrder === 'asc') {
    value.sortOrder = 1;
  } else {
    value.sortOrder = -1;
  }

  req.pagination = value;
  next();
};

module.exports = {
  schemas,
  validate,
  validateQuery,
  validateParams,
  validateFileUpload,
  validatePagination,
  commonSchemas
};
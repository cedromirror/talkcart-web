const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
// Load dotenv with explicit path to backend directory
const dotenv = require('dotenv');
const dotenvResult = dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/database');
const config = require('./config/config');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.cors.origin,
    credentials: true,
  }
});

// Socket.IO JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    // Support multiple token sources and normalize possible "Bearer" prefix
    const rawToken =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token) ||
      (socket.handshake.headers && (socket.handshake.headers.authorization || socket.handshake.headers.Authorization));

    let token = typeof rawToken === 'string' ? rawToken : '';
    if (token.startsWith('Bearer ')) token = token.slice(7).trim();

    // Socket connection attempt logged for debugging

    if (!token) {
      // Allow anonymous connections for public features like comment updates
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }

    // Verify JWT token using configuration
    const JWT_SECRET = config.jwt.secret;
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('_id username email isActive');

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication failed: Account inactive'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;
    
    // Register authenticated socket with SocketService
    const socketService = require('./services/socketService');
    if (typeof socketService.getInstance === 'function') {
      socketService.getInstance().registerAuthenticatedSocket(socket);
    } else {
      // If it's a class-based service
      const app = require('./server');
      const service = app.get('socketService');
      if (service && typeof service.registerAuthenticatedSocket === 'function') {
        service.registerAuthenticatedSocket(socket);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', {
      message: error.message,
      name: error.name,
      stack: (error.stack || '').split('\n')[0]
    });
    // Fall back to anonymous connection instead of hard failing in dev
    if (config.server.isDevelopment) {
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }
    next(new Error('Authentication failed'));
  }
});
const PORT = config.server.port;

// Comprehensive security middleware
const { 
  securityHeaders, 
  corsOptions, 
  requestSizeLimiter, 
  ipFilter, 
  userAgentFilter, 
  requestTimingProtection, 
  sqlInjectionProtection, 
  xssProtection, 
  apiSecurityHeaders 
} = require('./middleware/security');

// Apply security headers
if (config.security.headers.enabled) {
  app.use(securityHeaders);
}

// Apply security middleware
app.use(requestSizeLimiter);
app.use(ipFilter);
app.use(userAgentFilter);
app.use(requestTimingProtection);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(apiSecurityHeaders);

// Anonymous access control
const { anonymousAccessControl, logAnonymousAccess } = require('./middleware/anonymousAccess');
app.use(anonymousAccessControl);
app.use(logAnonymousAccess);
app.use(compression());

// Rate limiting
const { generalLimiter, speedLimiter } = require('./middleware/rateLimiting');
app.use('/api/', generalLimiter);
app.use('/api/', speedLimiter);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing middleware (increase limits for large metadata forms)
const BODY_LIMIT = `${config.upload.maxFieldSize}mb`;

// Use body-parser directly for better control
const bodyParser = require('body-parser');

// Skip body parsing for media upload endpoints to avoid corrupting multipart data
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Skip all body parsing for media upload endpoints
  if (url.startsWith('/api/media/upload') || contentType.startsWith('multipart/form-data')) {
    return next();
  }

  // Continue with normal body parsing for other endpoints
  next();
});

// JSON parser for non-upload endpoints
app.use(bodyParser.json({
  limit: BODY_LIMIT,
  type: (req) => {
    const ct = req.headers['content-type'] || '';
    const url = req.originalUrl || req.url || '';

    // Skip JSON parsing for upload and webhook endpoints (webhooks need raw body)
    if (
      url.startsWith('/api/media/upload') ||
      url.startsWith('/api/webhooks') ||
      ct.startsWith('multipart/form-data')
    ) {
      return false;
    }
    return ct.includes('application/json');
  }
}));

// URL-encoded parser for non-upload endpoints
app.use(bodyParser.urlencoded({
  extended: true,
  limit: BODY_LIMIT,
  type: (req) => {
    const ct = req.headers['content-type'] || '';
    const url = req.originalUrl || req.url || '';

    // Skip URL-encoded parsing for upload endpoints
    if (url.startsWith('/api/media/upload') || ct.startsWith('multipart/form-data')) {
      return false;
    }
    return ct.includes('application/x-www-form-urlencoded');
  }
}));

// Custom middleware for handling browser extension interference (non-upload endpoints only)
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Skip this middleware for upload endpoints
  if (url.startsWith('/api/media/upload') || contentType.startsWith('multipart/form-data')) {
    return next();
  }

  // Only process JSON requests that might have extension interference
  if (!req.body || typeof req.body !== 'string') {
    return next();
  }

  const rawBody = req.body;

  // Check for "iammirror" pattern (behind env flag to avoid false positives in dev)
  const shouldBlockExtensionPattern = config.development.blockExtensionInterference;
  const isDevelopment = config.server.isDevelopment;

  if (shouldBlockExtensionPattern && rawBody.includes('iammirror')) {
    // In development, try to clean the request instead of blocking it
    if (isDevelopment) {

      try {
        // Try to extract valid JSON by removing the extension interference
        let cleanedBody = rawBody;

        // Remove common browser extension patterns
        cleanedBody = cleanedBody.replace(/iammirror/g, '');
        cleanedBody = cleanedBody.replace(/^\s*"?\s*/, ''); // Remove leading quotes/spaces
        cleanedBody = cleanedBody.replace(/\s*"?\s*$/, ''); // Remove trailing quotes/spaces

        // Try to find JSON-like content
        const jsonMatch = cleanedBody.match(/\{.*\}/);
        if (jsonMatch) {
          cleanedBody = jsonMatch[0];
        }

        // Try to parse the cleaned body
        const parsedBody = JSON.parse(cleanedBody);
        req.body = parsedBody;
        return next();
      } catch (cleanError) {
        console.error('Failed to clean browser extension interference:', cleanError.message);
        // Fall through to the original error handling
      }
    }

    const email = rawBody.replace(/"/g, '').trim();

    // Block all requests with iammirror pattern (or provide helpful error in dev)
    return res.status(400).json({
      success: false,
      message: isDevelopment
        ? 'Browser extension interference detected. Please disable browser extensions that modify form data (like password managers or auto-fill extensions) and try again.'
        : 'Invalid request format detected. This appears to be from a browser extension interfering with the login process.',
      details: isDevelopment
        ? 'Common culprits: LastPass, 1Password, Dashlane, or other form-filling extensions. Try using an incognito/private window.'
        : 'Please disable any browser extensions that might be interfering with form submissions and try again.',
      detected_pattern: 'Browser extension interference',
      extracted_data: email,
      suggestion: isDevelopment ? 'Try using an incognito/private browser window or disable form-filling extensions.' : undefined
    });
  }

  next();
});



// Logging with custom format
if (config.logging.enableRequestLogging) {
  // Custom morgan format to reduce noise
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    skip: (req, res) => {
      // Skip logging for successful health checks and static files
      return (req.url === '/api/health' && res.statusCode === 200) ||
        req.url.includes('favicon.ico') ||
        req.url.includes('_next/static');
    }
  }));
}

// Image proxy endpoint with proper CORS - accessed from frontend
app.get('/api/image-proxy', cors({
  origin: config.security.cors.origin,
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}), (req, res) => {
  const { path: imagePath } = req.query;
  
  if (!imagePath || typeof imagePath !== 'string') {
    return res.status(400).json({ error: 'Image path parameter is required' });
  }

  // Extract the uploads path from the full URL if provided
  let relPath = imagePath;
  if (imagePath.includes('/uploads/')) {
    relPath = imagePath.split('/uploads/')[1];
  }
  
  const fullPath = path.join(__dirname, 'uploads', relPath);
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  // Set CORS and cache headers
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=3600',
    'Content-Type': 'image/jpeg', // Default, will be overridden by sendFile
  });
  
  // Send the file
  res.sendFile(fullPath, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to send image' });
      }
    }
  });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Static files with CORS headers and proper MIME types
app.use('/uploads', cors({
  origin: config.security.cors.origin,
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}), express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types for common image formats
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mov': 'video/quicktime'
    };
    
    // If file has a known extension, use it
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    } else if (!ext || ext === '') {
      // For files without extension, try to detect from content or default to svg+xml
      // (since we're creating SVG placeholders)
      res.setHeader('Content-Type', 'image/svg+xml');
    }
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Override restrictive CSP for static files to allow cross-origin loading
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src * data: blob:; connect-src *");
  }
}));

// Initialize SocketService
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);

// Make Socket.IO instance and SocketService available to routes
app.set('io', io);
app.set('socketService', socketService);

// Set up global broadcast function for routes
global.broadcastToAll = (event, data) => {
  io.emit(event, data);
};

// Set up targeted broadcast function for post-specific events
// NOTE: Use the same room naming as join-post (post:${postId})
global.broadcastToPost = (postId, event, data) => {
  io.to(`post:${postId}`).emit(event, data);
};

// API Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/marketplace', require('./routes/marketplace'));
// Cart routes removed as part of cart functionality removal
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/dao', require('./routes/dao'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/media', require('./routes/media'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/defi', require('./routes/defi'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/search', require('./routes/search'));
app.use('/api/products', require('./routes/productComparison'));
app.use('/api/notifications', require('./routes/notifications'));
// AI routes removed as part of AI functionality removal
// Admin routes
const adminRouter = require('./routes/admin');
const adminSignupRouter = require('./routes/adminSignup');
app.use('/api/admin/signup', adminSignupRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', require('./routes/webhooks'));

// Error tracking and rate limiting endpoints
const { getErrorStats, clearErrorStats } = require('./middleware/errorTracking');
const { getRateLimitStatus, clearRateLimit } = require('./middleware/rateLimiting');
app.get('/api/error-stats', getErrorStats);
app.delete('/api/error-stats', clearErrorStats);
app.get('/api/rate-limit-status', getRateLimitStatus);
app.post('/api/rate-limit/clear', clearRateLimit);

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  try {
    const cacheService = require('./services/cacheService');
    const stats = cacheService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get cache stats' });
  }
});

app.delete('/api/cache/clear', async (req, res) => {
  try {
    const cacheService = require('./services/cacheService');
    await cacheService.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

app.get('/api/cache/health', async (req, res) => {
  try {
    const redisConfig = require('./config/redis');
    const health = await redisConfig.healthCheck();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check cache health' });
  }
});



// Function to update and emit trending hashtags
const updateAndEmitTrendingHashtags = async () => {
  try {
    const Post = require('./models/Post');
    
    // Aggregate trending hashtags using the same logic as the API endpoint
    const trendingHashtags = await Post.aggregate([
      {
        $match: {
          isActive: true,
          hashtags: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$hashtags' },
      // Compute per-post engagement metrics
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          sharesCount: { $size: { $ifNull: ['$shares', []] } },
          viewsCount: { $ifNull: ['$views', 0] }
        }
      },
      // Lookup comment count for each post
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$post', '$$postId'] }, { $eq: ['$isActive', true] } ] } } },
            { $count: 'count' }
          ],
          as: 'commentAgg'
        }
      },
      {
        $addFields: {
          commentCount: { $ifNull: [ { $arrayElemAt: ['$commentAgg.count', 0] }, 0 ] }
        }
      },
      // Time decay weight based on post age (so newer posts weigh more)
      {
        $addFields: {
          ageHours: { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] },
          decayWeight: { $divide: [ 1, { $add: [ 1, { $divide: [ { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] }, 24 ] } ] } ] }
        }
      },
      // Per-post score with weights
      {
        $addFields: {
          postScore: {
            $multiply: [
              { $add: [
                1, // base
                { $multiply: ['$likesCount', 2] },
                { $multiply: ['$commentCount', 3] },
                { $multiply: ['$sharesCount', 4] },
                { $multiply: ['$viewsCount', 0.1] }
              ] },
              '$decayWeight'
            ]
          }
        }
      },
      // Group by hashtag
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalComments: { $sum: '$commentCount' },
          totalShares: { $sum: '$sharesCount' },
          totalViews: { $sum: '$viewsCount' },
          score: { $sum: '$postScore' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 5 }, // Limit to top 5 trending hashtags
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          totalViews: 1,
          score: 1,
          _id: 0
        }
      }
    ]);

    // Emit trending update to all connected clients
    io.emit('trending:update', trendingHashtags);
  } catch (error) {
    console.error('Error updating trending hashtags:', error);
  }
};

// Schedule periodic trending hashtags updates (every 5 minutes)
cron.schedule('*/5 * * * *', updateAndEmitTrendingHashtags);

// Initial trending hashtags update when server starts
setTimeout(updateAndEmitTrendingHashtags, 5000);

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'TalkCart API',
    version: '1.0.0',
    description: 'Web3 Super Application Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments',
      marketplace: '/api/marketplace',
      messages: '/api/messages',
      chatbot: '/api/chatbot',
      dao: '/api/dao',
      analytics: '/api/analytics',
      media: '/api/media',
      nfts: '/api/nfts',
      wallet: '/api/wallet',
      defi: '/api/defi'
    },
    documentation: {
      frontend: 'http://localhost:4000',
      health_check: '/api/health',
      api_base: '/api'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      type: 'MongoDB',
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port,
      readyState: mongoose.connection.readyState,
      collections: Object.keys(mongoose.connection.collections).length
    },
    storage: 'MongoDB Only',
    features: [
      'User Management',
      'Post Creation',
      'Comment System',
      'Real-time Updates',
      'Media Upload',
      'Search & Discovery'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      '/api/health',
      '/api/auth',
      '/api/users',
      '/api/posts',
      '/api/comments',
      '/api/marketplace',
      '/api/messages',
      '/api/dao',
      '/api/analytics',
      '/api/media',
      '/api/admin',
      '/api/payments',
      '/api/webhooks',
      '/api/search',
      '/api/notifications',
      '/api/chatbot'
    ]
  });
});

// General 404 handler
app.use('*', (req, res) => {
  // If it's not an API request, redirect to API documentation
  if (!req.originalUrl.startsWith('/api')) {
    return res.redirect('/');
  }

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    suggestion: 'Visit / for API documentation'
  });
});

// Error tracking and handling middleware
const { errorTrackingMiddleware } = require('./middleware/errorTracking');
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorTrackingMiddleware);
app.use(errorHandler);

// Initialize MongoDB and start server
const initializeApp = async () => {
  try {
    // Log environment summary
    const envSummary = config.getSummary();
    console.log('🔧 Environment Configuration:', JSON.stringify(envSummary, null, 2));

    // Connect to MongoDB (required)
    await connectDB();

    // Initialize cache service
    const cacheService = require('./services/cacheService');
    await cacheService.initialize();

    // Start vendor payout job
    const vendorPayoutJob = require('./jobs/vendorPayoutJob');
    vendorPayoutJob.start();

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 TalkCart Backend Started on port ${PORT}`);
      console.log(`📊 Environment: ${config.server.env}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    console.error('💡 Please ensure MongoDB is running and accessible');
    process.exit(1);
  }
};

// Initialize the application
initializeApp();

module.exports = app;
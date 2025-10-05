const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
require('dotenv').config();
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://talkcart.app', 'https://www.talkcart.app']
      : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4100', 'http://localhost:8000'],
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

    console.log('🔍 Socket connection attempt:', {
      socketId: socket.id,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    });

    if (!token) {
      console.log('🔓 Anonymous socket connection allowed');
      // Allow anonymous connections for public features like comment updates
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }

    // Verify JWT token using the same fallback secret as auth routes
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    console.log('🔐 Verifying JWT token...');
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    console.log('✅ JWT token decoded:', { userId: decoded.userId, exp: decoded.exp });

    // Check if user exists and is active
    const user = await User.findById(decoded.userId).select('_id username email isActive');

    if (!user) {
      console.log('❌ Socket connection rejected: User not found');
      return next(new Error('Authentication failed: User not found'));
    }

    if (!user.isActive) {
      console.log('❌ Socket connection rejected: User account inactive');
      return next(new Error('Authentication failed: Account inactive'));
    }

    // Attach user info to socket
    socket.userId = user._id.toString();
    socket.user = user;

    console.log(`✅ Socket authenticated for user: ${user.username} (${user._id})`);
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', {
      message: error.message,
      name: error.name,
      stack: (error.stack || '').split('\n')[0]
    });
    // Fall back to anonymous connection instead of hard failing in dev
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔓 Falling back to anonymous socket in development');
      socket.userId = 'anonymous-user';
      socket.user = { username: 'anonymous', isAnonymous: true };
      return next();
    }
    next(new Error('Authentication failed'));
  }
});
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for development environment
    return process.env.NODE_ENV !== 'production';
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://talkcart.app', 'https://www.talkcart.app']
    : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4100', 'http://localhost:8000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-ID'],
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware (increase limits for large metadata forms)
const BODY_LIMIT = process.env.BODY_MAX_SIZE || '50mb';

// Use body-parser directly for better control
const bodyParser = require('body-parser');

// Skip body parsing for media upload endpoints to avoid corrupting multipart data
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Skip all body parsing for media upload endpoints
  if (url.startsWith('/api/media/upload') || contentType.startsWith('multipart/form-data')) {
    console.log('Skipping body parsing for media upload:', url);
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
  const shouldBlockExtensionPattern = process.env.BLOCK_EXTENSION_INTERFERENCE === 'true';
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (shouldBlockExtensionPattern && rawBody.includes('iammirror')) {
    console.log('Detected "iammirror" in request body - this appears to be from a browser extension');

    // In development, try to clean the request instead of blocking it
    if (isDevelopment) {
      console.log('Development mode: Attempting to clean browser extension interference...');

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

        console.log('Cleaned body:', cleanedBody);

        // Try to parse the cleaned body
        const parsedBody = JSON.parse(cleanedBody);
        req.body = parsedBody;
        console.log('Successfully cleaned and parsed request body:', parsedBody);
        return next();
      } catch (cleanError) {
        console.error('Failed to clean browser extension interference:', cleanError.message);
        // Fall through to the original error handling
      }
    }

    const email = rawBody.replace(/"/g, '').trim();
    console.log('Extracted email from raw body:', email);

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
if (process.env.NODE_ENV !== 'production') {
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

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Make Socket.IO instance available to routes
app.set('io', io);

// Set up global broadcast function for routes
global.broadcastToAll = (event, data) => {
  io.emit(event, data);
  console.log(`📡 Broadcasting ${event}:`, data);
};

// Set up targeted broadcast function for post-specific events
// NOTE: Use the same room naming as join-post (post:${postId})
global.broadcastToPost = (postId, event, data) => {
  io.to(`post:${postId}`).emit(event, data);
  console.log(`📡 Broadcasting ${event} to post ${postId}:`, data);
};

// API Routes
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/marketplace', require('./routes/marketplace'));
// Cart routes removed as part of cart functionality removal
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
// Streams feature completely removed
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
// Admin routes
const adminRouter = require('./routes/admin');
const adminSignupRouter = require('./routes/adminSignup');
app.use('/api/admin/signup', adminSignupRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', require('./routes/webhooks'));

// Periodic cleanup: run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    // Streams feature removed: moderation cleanup disabled
  } catch (err) {
    console.error('[Cron] Moderation cleanup failed:', err);
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
          decayWeight: { $divide: [ 1, { $add: [ 1, { $divide: [ { $divide: [ { $subtract: [ new Date(), '$createdAt' ] }, 3600000 ] }, 24 ] } ] } ] } // 1 / (1 + ageHours/24)
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
    console.log(`📊 Emitted trending hashtags update with ${trendingHashtags.length} hashtags`);
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
      '/api/notifications'
    ]
  });
});

// ============================================================================
// WEBSOCKET HANDLERS - CONSOLIDATED
// ============================================================================

// Store connected clients and user presence
const connectedClients = new Map();
const connectedUsers = new Map();
const userPresence = new Map();

// SINGLE Socket connection handler - consolidated all functionality
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  console.log(`🔌 Connection details:`, {
    id: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.conn.remoteAddress
  });
  
  connectedClients.set(socket.id, socket);

  // User is already authenticated via JWT middleware
  if (socket.userId) {
    connectedUsers.set(socket.id, socket.userId);
    socket.join(`user_${socket.userId}`);
    console.log(`🔐 Socket auto-authenticated for user: ${socket.user?.username} (${socket.userId})`);

    // Register socket with SocketService for messaging functionality
    if (global.socketServiceInstance) {
      global.socketServiceInstance.registerAuthenticatedSocket(socket);
    }

    // Emit authentication success
    socket.emit('authenticated', { userId: socket.userId });
  }

  // Handle authentication (unified)
  socket.on('authenticate', (data) => {
    try {
      const { token, userId } = data;
      if (userId && socket.userId === userId) {
        // Already authenticated via JWT, just confirm
        socket.emit('authenticated', { userId: socket.userId, success: true });
        console.log(`🔐 Legacy authenticate event confirmed for user: ${userId}`);
      } else if (userId && socket.userId !== userId) {
        // Mismatch between JWT user and requested user
        socket.emit('error', { message: 'Authentication failed: User ID mismatch' });
      } else {
        socket.emit('error', { message: 'Authentication failed: No user ID provided' });
      }
    } catch (error) {
      console.error('🔐 Authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });

  // User joins their personal room
  socket.on('join-user', (userId) => {
    if (userId) {
      socket.userId = userId;
      connectedUsers.set(socket.id, userId);
      socket.join(`user_${userId}`);
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    }
  });

  // Join feed room for real-time updates
  socket.on('join-feed', (feedType) => {
    socket.join(`feed_${feedType}`);
    socket.join(`feed-${feedType}`);
    console.log(`📡 Socket joined feed: ${feedType}`);
  });

  // Leave feed room
  socket.on('leave-feed', (feedType) => {
    socket.leave(`feed_${feedType}`);
    socket.leave(`feed-${feedType}`);
    console.log(`📡 Socket left feed: ${feedType}`);
  });

  // Join/leave post rooms
  socket.on('join-post', (data) => {
    const postId = typeof data === 'string' ? data : data?.postId;
    if (postId) {
      socket.join(`post:${postId}`);
      console.log(`📝 Socket joined post room: ${postId}`);
    }
  });

  socket.on('leave-post', (data) => {
    const postId = typeof data === 'string' ? data : data?.postId;
    if (postId) {
      socket.leave(`post:${postId}`);
      console.log(`📝 Socket left post room: ${postId}`);
    }
  });

  // Handle new post creation broadcast
  socket.on('new-post', (postData) => {
    socket.broadcast.to('feed_for-you').emit('post-created', postData);
    socket.broadcast.to('feed_recent').emit('post-created', postData);
    socket.broadcast.to('feed_trending').emit('post-created', postData);
    updateAndEmitTrendingHashtags();
  });

  // Handle post interaction updates
  socket.on('post-interaction', (data) => {
    const { postId, type, count, userId, feedType } = data;
    console.log(`📡 Post interaction received:`, data);
    
    // Broadcast to all users
    io.emit('post-updated', {
      postId,
      type,
      count,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast to specific feed
    socket.to(`feed-${feedType || 'for-you'}`).emit('post-updated', data);
  });

  // Handle presence updates
  socket.on('presence-update', async (data) => {
    const { userId, isOnline, showOnlineStatus, showLastSeen } = data;

    try {
      if (userId) {
        const User = require('./models/User');
        const updateData = { lastSeenAt: new Date() };
        if (isOnline) updateData.lastLoginAt = new Date();
        await User.findByIdAndUpdate(userId, updateData);
      }

      const presenceData = {
        userId, isOnline,
        lastSeen: new Date(),
        showOnlineStatus, showLastSeen,
        socketId: socket.id
      };

      userPresence.set(userId, presenceData);

      if (showOnlineStatus) {
        socket.broadcast.emit('presence-update', {
          userId, isOnline,
          lastSeen: showLastSeen ? presenceData.lastSeen : undefined,
          showOnlineStatus, showLastSeen
        });
      }

      console.log(`👤 Presence updated for user ${userId}: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  });

  // Handle follow updates
  socket.on('follow_update', async (data) => {
    const { userId, targetUserId, action, followerCount } = data;
    try {
      console.log(`👥 Follow update: ${userId} ${action}ed ${targetUserId}`);
      
      io.emit('follow_update', {
        userId, targetUserId, action, followerCount,
        timestamp: new Date().toISOString()
      });
      
      io.to(`user-${targetUserId}`).emit('follower_change', {
        followerId: userId, action, followerCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling follow update:', error);
    }
  });

  // Join trending topics room
  socket.on('join-trending', () => {
    socket.join('trending-topics');
    console.log(`📊 Socket ${socket.id} joined trending-topics room`);
  });

  // Test message handler
  socket.on('test-message', (data) => {
    console.log(`🧪 Test message received:`, data);
    socket.emit('test-response', {
      ...data,
      echo: true,
      serverTime: new Date().toISOString()
    });
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      console.log(`👤 User ${userId} disconnected`);
    }

    connectedClients.delete(socket.id);

    // Clean up SocketService data
    if (global.socketServiceInstance) {
      await global.socketServiceInstance.handleSocketDisconnect(socket.id);
    }

    console.log('❌ User disconnected:', socket.id);
  });
});

// Helper functions for broadcasting
const broadcastToAll = (event, data) => {
  io.emit(event, data);
};

const broadcastToFeed = (feedType, event, data) => {
  io.to(`feed_${feedType}`).emit(event, data);
  io.to(`feed-${feedType}`).emit(event, data);
};

const broadcastToUser = (userId, event, data) => {
  io.to(`user-${userId}`).emit(event, data);
  io.to(`user_${userId}`).emit(event, data);
};

// Make broadcast functions available globally
global.broadcastToAll = broadcastToAll;
global.broadcastToFeed = broadcastToFeed;
global.broadcastToUser = broadcastToUser;

// Initialize socket service
const SocketService = require('./services/socketService');
const socketService = new SocketService(io);
app.set('socketService', socketService);

// Make socketService available globally for socket connection handler
global.socketServiceInstance = socketService;

// Make io and socketService available to routes
app.set('io', io);
app.set('socketService', socketService);

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





// Initialize MongoDB and start server
const initializeApp = async () => {
  try {
    console.log('🔧 Initializing TalkCart Backend...');
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');

    // Connect to MongoDB (required)
    console.log('🔧 Connecting to MongoDB...');
    await connectDB();

    console.log('✅ MongoDB connection established');
    console.log('💾 Using MongoDB for all data storage');

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 TalkCart Backend Started Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`💾 Database: MongoDB (Required)`);
      console.log(`📡 Real-time: Socket.IO Ready`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
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
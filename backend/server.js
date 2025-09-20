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
      : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4100'],
    credentials: true,
  }
});

// Socket.IO JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

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

    // Verify JWT token
    console.log('🔐 Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
      stack: error.stack.split('\n')[0]
    });
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
    : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:4100'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

    // Skip JSON parsing for upload endpoints
    if (url.startsWith('/api/media/upload') || ct.startsWith('multipart/form-data')) {
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
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls', require('./routes/calls'));
// Streams feature removed
// app.use('/api/streams', require('./routes/streams'));
app.use('/api/dao', require('./routes/dao'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/media', require('./routes/media'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/defi', require('./routes/defi'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/adminSignup'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Periodic cleanup: run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    // Streams feature removed: moderation cleanup disabled
  } catch (err) {
    console.error('[Cron] Moderation cleanup failed:', err);
  }
});

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
      '/api/webhooks'
    ]
  });
});

// ============================================================================
// SOCKET.IO REAL-TIME FUNCTIONALITY
// ============================================================================

// In-memory stores for live goals and polls (reset on server restart)
const streamGoals = new Map(); // streamId -> { type: 'likes'|'donations', target: number, title?: string, progress: number }
const streamPolls = new Map(); // streamId -> { question: string, options: string[], counts: number[], voters: Set<string>, active: boolean }

function getGoal(streamId) {
  return streamGoals.get(String(streamId)) || null;
}
function setGoal(streamId, goal) {
  streamGoals.set(String(streamId), goal);
}
function clearGoal(streamId) {
  streamGoals.delete(String(streamId));
}

function getPoll(streamId) {
  return streamPolls.get(String(streamId)) || null;
}
function setPoll(streamId, poll) {
  streamPolls.set(String(streamId), poll);
}
function clearPoll(streamId) {
  streamPolls.delete(String(streamId));
}

// Store connected users
const connectedUsers = new Map();

// Socket connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // User is already authenticated via JWT middleware
  if (socket.userId) {
    connectedUsers.set(socket.id, socket.userId);
    socket.join(`user_${socket.userId}`);
    console.log(`🔐 Socket auto-authenticated for user: ${socket.user.username} (${socket.userId})`);

    // Register socket with SocketService for messaging functionality
    if (global.socketServiceInstance) {
      global.socketServiceInstance.registerAuthenticatedSocket(socket);
    }

    // Emit authentication success
    socket.emit('authenticated', { userId: socket.userId });
  }

  // Handle legacy socket authentication (for backward compatibility)
  socket.on('authenticate', (data) => {
    const { userId } = data;
    if (userId && socket.userId === userId) {
      // Already authenticated via JWT, just confirm
      socket.emit('authenticated', { userId: socket.userId });
      console.log(`🔐 Legacy authenticate event confirmed for user: ${userId}`);
    } else if (userId && socket.userId !== userId) {
      // Mismatch between JWT user and requested user
      socket.emit('error', { message: 'Authentication failed: User ID mismatch' });
    } else {
      socket.emit('error', { message: 'Authentication failed: No user ID provided' });
    }
  });

  // User joins their personal room (legacy support)
  socket.on('join-user', (userId) => {
    if (userId) {
      socket.userId = userId;
      connectedUsers.set(socket.id, userId);
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    }
  });

  // Join feed room for real-time updates
  socket.on('join-feed', (feedType) => {
    socket.join(`feed_${feedType}`);
    console.log(`📡 Socket joined feed: ${feedType}`);
  });

  // Leave feed room (added for cleanup)
  socket.on('leave-feed', (feedType) => {
    socket.leave(`feed_${feedType}`);
    console.log(`📡 Socket left feed: ${feedType}`);
  });

  // Join specific post room for real-time updates (use post:${postId})
  socket.on('join-post', (data) => {
    const { postId } = data;
    if (postId) {
      socket.join(`post:${postId}`);
      console.log(`📝 Socket joined post room: ${postId}`);
    }
  });

  // Leave specific post room
  socket.on('leave-post', (data) => {
    const { postId } = data;
    if (postId) {
      socket.leave(`post:${postId}`);
      console.log(`📝 Socket left post room: ${postId}`);
    }
  });

  // Handle new post creation broadcast
  socket.on('new-post', (postData) => {
    // Broadcast to all users in relevant feeds
    socket.broadcast.to('feed_for-you').emit('post-created', postData);
    socket.broadcast.to('feed_recent').emit('post-created', postData);
    socket.broadcast.to('feed_trending').emit('post-created', postData);
  });

  // Handle post interaction updates
  socket.on('post-interaction', (data) => {
    const { postId, type, count, userId } = data;

    // Broadcast interaction to all users
    io.emit('post-updated', {
      postId,
      type,
      count,
      userId,
      timestamp: new Date().toISOString()
    });
  });

  // Streaming rooms and WebRTC signaling
  const streamRooms = new Map(); // streamId -> { viewers:Set<string>, hosts:Set<string>, publishers:Set<string>, peak:number, pendingRequests: Map<socketId, { socketId,userId,displayName,requestedAt,expiresAt }>, requestTimers: Map<socketId, NodeJS.Timeout> }

  const getRoom = (streamId) => {
    if (!streamRooms.has(streamId)) {
      streamRooms.set(streamId, { viewers: new Set(), hosts: new Set(), publishers: new Set(), peak: 0, pendingRequests: new Map(), requestTimers: new Map() });
    }
    return streamRooms.get(streamId);
  };

  const getIdentityBySocket = (sid) => {
    const sock = io.sockets.sockets.get(sid);
    if (!sock) return { socketId: sid };
    return {
      socketId: sid,
      userId: sock.userId || null,
      displayName: sock.displayName || (sock.userId ? `user-${String(sock.userId).slice(-4)}` : `viewer-${sid.slice(-4)}`),
    };
  };

  const emitPublishers = (streamId) => {
    const room = getRoom(streamId);
    const publishers = Array.from(room.publishers).map(getIdentityBySocket);
    io.to(`stream_${streamId}`).emit('webrtc:publishers', { streamId, publishers });
  };

  const emitHosts = (streamId) => {
    const room = getRoom(streamId);
    const hosts = Array.from(room.hosts).map(getIdentityBySocket);
    io.to(`stream_${streamId}`).emit('webrtc:hosts', { streamId, hosts });
  };

  const broadcastViewerUpdate = (streamId) => {
    const room = getRoom(streamId);
    const viewerCount = room.viewers.size + room.hosts.size; // publishers are a subset of viewers/hosts
    room.peak = Math.max(room.peak, viewerCount);
    io.to(`stream_${streamId}`).emit('viewer_update', {
      streamId,
      viewerCount,
      peakViewerCount: room.peak,
      viewers: Array.from(room.viewers).map((sid) => ({ id: sid, username: `viewer-${sid.slice(-4)}`, displayName: `Viewer ${sid.slice(-4)}` })),
    });
  };

  socket.on('join-stream', async (streamId) => {
    if (!streamId) return;

    try {
      // Join both WebRTC room and general stream room
      socket.join(`stream_${streamId}`);
      socket.join(`stream-${streamId}`);
      socket.currentStream = streamId;

      const room = getRoom(streamId);
      // If socket was host for this stream, keep host role; else add as viewer
      if (!room.hosts.has(socket.id)) room.viewers.add(socket.id);
      broadcastViewerUpdate(streamId);

      // Increment viewer count in database
      const Stream = require('./models/Stream');
      const stream = await Stream.findByIdAndUpdate(
        streamId,
        {
          $inc: { viewerCount: 1 }
        },
        { new: true }
      );

      // Update peak viewer count separately if needed
      if (stream && stream.viewerCount > (stream.peakViewerCount || 0)) {
        await Stream.findByIdAndUpdate(streamId, {
          peakViewerCount: stream.viewerCount
        });
      }

      if (stream) {
        // Broadcast updated viewer count to all viewers
        io.to(`stream-${streamId}`).emit('stream-viewers-update', {
          streamId,
          viewerCount: stream.viewerCount,
          peakViewerCount: Math.max(stream.peakViewerCount || 0, stream.viewerCount)
        });

        // Send current stream data to new viewer
        socket.emit('stream-data', {
          streamId,
          isLive: stream.isLive,
          viewerCount: stream.viewerCount,
          peakViewerCount: Math.max(stream.peakViewerCount || 0, stream.viewerCount),
          health: stream.health,
          settings: stream.settings,
          monetization: stream.monetization
        });
      }
      // Toast: viewer joined
      io.to(`stream-${streamId}`).emit('live:viewer:joined', {
        streamId,
        userId: socket.userId || socket.id,
        username: socket.displayName || socket.username || `viewer-${socket.id.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      console.log(`🎥 Socket ${socket.id} joined stream ${streamId}`);
    } catch (error) {
      console.error('Error joining stream:', error);
      socket.emit('stream-error', { message: 'Failed to join stream' });
    }
  });

  socket.on('leave-stream', async (streamId) => {
    if (!streamId) return;

    try {
      // Leave both WebRTC room and general stream room
      socket.leave(`stream_${streamId}`);
      socket.leave(`stream-${streamId}`);

      const room = getRoom(streamId);
      room.viewers.delete(socket.id);
      room.hosts.delete(socket.id);
      broadcastViewerUpdate(streamId);

      // Decrement viewer count in database
      const Stream = require('./models/Stream');
      await Stream.findByIdAndUpdate(streamId, {
        $inc: { viewerCount: -1 }
      });

      const stream = await Stream.findById(streamId);
      if (stream) {
        // Broadcast updated viewer count
        io.to(`stream-${streamId}`).emit('stream-viewers-update', {
          streamId,
          viewerCount: Math.max(0, stream.viewerCount)
        });
      }
      // Toast: viewer left
      io.to(`stream-${streamId}`).emit('live:viewer:left', {
        streamId,
        userId: socket.userId || socket.id,
        username: socket.displayName || socket.username || `viewer-${socket.id.slice(-4)}`,
        timestamp: new Date().toISOString()
      });

      console.log(`🎥 Socket ${socket.id} left stream ${streamId}`);
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  });

  // Helper: validate JWT from client and attach socket.userId
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  function authenticateSocket(auth) {
    try {
      const token = auth?.token;
      if (!token || token === 'anonymous-access-token') return { userId: null };
      const payload = jwt.verify(token, JWT_SECRET);
      return { userId: payload.userId };
    } catch {
      return { userId: null };
    }
  }

  // WebRTC: join as host/viewer and exchange signaling
  socket.on('webrtc:join', async ({ streamId, role, token }) => {
    if (!streamId) return;

    // Attach identity if provided
    const identity = authenticateSocket({ token });
    if (identity.userId) socket.userId = identity.userId;

    const room = getRoom(streamId);
    socket.join(`stream_${streamId}`);

    // Role validation for 'host': only the stream owner or moderators can be host
    if (role === 'host') {
      try {
        const stream = await Stream.findById(streamId).lean();
        const uid = socket.userId || null;
        const isOwner = uid && String(stream?.streamerId) === String(uid);
        const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
        if (isOwner || isModerator) {
          room.hosts.add(socket.id);
          room.viewers.delete(socket.id);
          room.publishers.add(socket.id); // host publishes by default
        } else {
          // Fallback to viewer if spoofed
          room.viewers.add(socket.id);
          room.hosts.delete(socket.id);
        }
      } catch {
        room.viewers.add(socket.id);
      }
    } else {
      room.viewers.add(socket.id);
      room.hosts.delete(socket.id);
    }

    // Attach lightweight identity for display (always set a displayName)
    if (socket.userId) {
      try {
        const user = await User.findById(socket.userId).select('username displayName').lean();
        socket.displayName = user?.displayName || user?.username || `user-${String(socket.userId).slice(-4)}`;
      } catch {
        socket.displayName = `user-${(socket.userId || 'anon').toString().slice(-4)}`;
      }
    }
    if (!socket.displayName) {
      socket.displayName = `viewer-${socket.id.slice(-4)}`;
    }

    // Notify room of current hosts (with identities) and current publishers
    emitHosts(streamId);
    emitPublishers(streamId);
    broadcastViewerUpdate(streamId);
    console.log(`📡 WebRTC join: ${socket.id} as ${role} in stream ${streamId}`);
  });

  socket.on('webrtc:signal', ({ to, data }) => {
    if (!to || !data) return;
    io.to(to).emit('webrtc:signal', { from: socket.id, data });
  });

  // Guest publishing: request/approve/deny and toggle publish state
  socket.on('webrtc:request-publish', ({ streamId }) => {
    if (!streamId) return;
    const room = getRoom(streamId);

    // Track pending request with TTL
    const now = Date.now();
    const ttlMs = Number(process.env.STREAM_REQUEST_TTL_MS || 30000);
    const requester = { socketId: socket.id, userId: socket.userId || null, displayName: socket.displayName || `viewer-${socket.id.slice(-4)}`, requestedAt: now, expiresAt: now + ttlMs };
    room.pendingRequests.set(socket.id, requester);

    // Auto-expire request
    if (room.requestTimers.has(socket.id)) clearTimeout(room.requestTimers.get(socket.id));
    const timer = setTimeout(() => {
      const r = getRoom(streamId);
      if (!r) return;
      r.pendingRequests.delete(socket.id);
      r.requestTimers.delete(socket.id);
      Array.from(r.hosts).forEach((hostId) => {
        io.to(hostId).emit('webrtc:publish-request-expired', { streamId, requesterId: socket.id });
      });
    }, ttlMs);
    room.requestTimers.set(socket.id, timer);

    // Notify hosts for approval request (include requester identity)
    Array.from(room.hosts).forEach((hostId) => {
      io.to(hostId).emit('webrtc:publish-request', { streamId, requester });
    });
  });

  socket.on('webrtc:approve-publish', async ({ streamId, requester, token }) => {
    if (!streamId || !requester) return;
    const room = getRoom(streamId);

    // Strict permission: only streamer or moderators can approve
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;

    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch {
      return;
    }

    room.publishers.add(requester);
    // Clear pending request and timer
    room.pendingRequests.delete(requester);
    const t = room.requestTimers.get(requester);
    if (t) { clearTimeout(t); room.requestTimers.delete(requester); }

    emitPublishers(streamId);
    // Notify requester they may start publishing
    io.to(requester).emit('webrtc:publish-approved', { streamId, by: socket.id });
  });

  socket.on('webrtc:deny-publish', async ({ streamId, requester, token }) => {
    if (!streamId || !requester) return;
    const room = getRoom(streamId);

    // Strict permission: only streamer or moderators can deny
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;

    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch {
      return;
    }

    // Clear pending request and timer
    room.pendingRequests.delete(requester);
    const t = room.requestTimers.get(requester);
    if (t) { clearTimeout(t); room.requestTimers.delete(requester); }

    io.to(requester).emit('webrtc:publish-denied', { streamId, by: socket.id });
  });

  socket.on('webrtc:stop-publish', ({ streamId, token }) => {
    if (!streamId) return;
    const room = getRoom(streamId);
    room.publishers.delete(socket.id);
    emitPublishers(streamId);
  });

  // Optional: Mute/unmute per-track via signaling
  socket.on('webrtc:moderate-track', async ({ streamId, targetSocketId, kind, action, token }) => {
    if (!streamId || !targetSocketId || !kind || !action) return;
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;
    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch { return; }

    // Forward moderation command to the target client
    io.to(targetSocketId).emit('webrtc:moderate-track', { streamId, kind, action, by: socket.id });
  });

  // Host moderation: revoke a publisher, mute/kick, clear requests
  socket.on('webrtc:revoke-publish', async ({ streamId, targetSocketId, token }) => {
    if (!streamId || !targetSocketId) return;
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;
    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch { return; }

    const room = getRoom(streamId);
    room.publishers.delete(targetSocketId);
    io.to(targetSocketId).emit('webrtc:publish-revoked', { streamId, by: socket.id });
    emitPublishers(streamId);
  });

  socket.on('webrtc:kick', async ({ streamId, targetSocketId, token }) => {
    if (!streamId || !targetSocketId) return;
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;
    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch { return; }

    const room = getRoom(streamId);
    room.viewers.delete(targetSocketId);
    room.hosts.delete(targetSocketId);
    room.publishers.delete(targetSocketId);
    io.to(`stream_${streamId}`).emit('webrtc:participant-leave', { peerId: targetSocketId });
    emitHosts(streamId);
    emitPublishers(streamId);
    broadcastViewerUpdate(streamId);
  });

  socket.on('webrtc:clear-requests', async ({ streamId, token }) => {
    // This is a no-op server-side since requests are transient; included for API completeness
    // Could be extended to track pending requests server-side if desired.
    // Permission check anyway:
    const identity = authenticateSocket({ token });
    const uid = identity.userId || socket.userId || null;
    if (!uid) return;
    try {
      const stream = await Stream.findById(streamId).lean();
      const isOwner = uid && String(stream?.streamerId) === String(uid);
      const isModerator = uid && Array.isArray(stream?.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
      if (!isOwner && !isModerator) return;
    } catch { return; }
    // Clear all pending requests and timers
    const room = getRoom(streamId);
    if (room) {
      room.pendingRequests.forEach((_v, sid) => {
        const tt = room.requestTimers.get(sid);
        if (tt) clearTimeout(tt);
      });
      room.pendingRequests.clear();
      room.requestTimers.clear();
    }

    // Ack back
    io.to(socket.id).emit('webrtc:requests-cleared', { streamId });
  });

  socket.on('webrtc:leave', ({ streamId }) => {
    if (!streamId) return;
    const room = getRoom(streamId);
    room.viewers.delete(socket.id);
    room.hosts.delete(socket.id);
    room.publishers.delete(socket.id);
    io.to(`stream_${streamId}`).emit('webrtc:participant-leave', { peerId: socket.id });
    emitHosts(streamId);
    emitPublishers(streamId);
    broadcastViewerUpdate(streamId);
  });

  // Handle user disconnect
  socket.on('disconnect', async () => {
    // Cleanup from all stream rooms
    for (const [streamId, room] of streamRooms.entries()) {
      let changed = false;
      if (room.viewers.delete(socket.id)) changed = true;
      if (room.hosts.delete(socket.id)) changed = true;
      if (room.publishers.delete(socket.id)) changed = true;
      if (changed) {
        io.to(`stream_${streamId}`).emit('webrtc:participant-leave', { peerId: socket.id });
        emitHosts(streamId);
        emitPublishers(streamId);
        broadcastViewerUpdate(streamId);
      }
    }

    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      console.log(`👤 User ${userId} disconnected`);
    }

    // Clean up SocketService data
    if (global.socketServiceInstance) {
      await global.socketServiceInstance.handleSocketDisconnect(socket.id);
    }

    console.log('❌ User disconnected:', socket.id);
  });
});

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

// ============================================================================
// WEBSOCKET HANDLERS
// ============================================================================

// Store connected clients and user presence
const connectedClients = new Map();
const userPresence = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  console.log(`🔌 Connection details:`, {
    id: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.conn.remoteAddress,
    userAgent: socket.handshake.headers['user-agent']
  });
  connectedClients.set(socket.id, socket);

  // Handle authentication
  socket.on('authenticate', (data) => {
    try {
      const { token, userId } = data;
      if (token && userId) {
        socket.userId = userId;
        socket.authenticated = true;
        console.log('🔐 User authenticated:', userId, 'on socket:', socket.id);
        socket.emit('authenticated', { success: true });
      }
    } catch (error) {
      console.error('🔐 Authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Authentication failed' });
    }
  });

  // Join post-specific rooms for targeted updates
  socket.on('join-post', (postId) => {
    if (postId && typeof postId === 'string') {
      socket.join(`post:${postId}`);
      console.log(`📡 Socket ${socket.id} joined post room: ${postId}`);
    }
  });

  socket.on('leave-post', (postId) => {
    if (postId && typeof postId === 'string') {
      socket.leave(`post:${postId}`);
      console.log(`📡 Socket ${socket.id} left post room: ${postId}`);
    }
  });

  // Join user to their personal room for targeted updates
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    socket.userId = userId; // Store userId on socket for presence tracking
    console.log(`👤 User ${userId} joined personal room`);
  });

  // Join feed rooms for real-time updates
  socket.on('join-feed', (feedType) => {
    socket.join(`feed-${feedType}`);
    console.log(`📡 Client joined feed: ${feedType}`);
  });

  // Handle presence updates
  socket.on('presence-update', async (data) => {
    const { userId, isOnline, showOnlineStatus, showLastSeen } = data;

    try {
      // Update user's activity timestamps in database
      if (userId) {
        const User = require('./models/User');
        const updateData = {
          lastSeenAt: new Date()
        };

        // Also update lastLoginAt if they're coming online
        if (isOnline) {
          updateData.lastLoginAt = new Date();
        }

        await User.findByIdAndUpdate(userId, updateData);
      }

      // Store presence data
      const presenceData = {
        userId,
        isOnline,
        lastSeen: isOnline ? new Date() : new Date(),
        showOnlineStatus,
        showLastSeen,
        socketId: socket.id,
      };

      userPresence.set(userId, presenceData);

      // Only broadcast presence if user allows it
      if (showOnlineStatus) {
        socket.broadcast.emit('presence-update', {
          userId,
          isOnline,
          lastSeen: showLastSeen ? presenceData.lastSeen : undefined,
          showOnlineStatus,
          showLastSeen,
        });
      }

      console.log(`👤 Presence updated for user ${userId}: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  });

  // Handle post interactions
  socket.on('post-interaction', (data) => {
    console.log(`📡 Post interaction received:`, data);
    // Broadcast interaction to all clients in the same feed
    socket.to(`feed-${data.feedType || 'for-you'}`).emit('post-updated', data);
  });

  // Handle test messages
  socket.on('test-message', (data) => {
    console.log(`🧪 Test message received:`, data);
    // Echo back to sender
    socket.emit('test-response', {
      ...data,
      echo: true,
      serverTime: new Date().toISOString(),
    });
  });

  // ============================================================================
  // STREAM REAL-TIME HANDLERS (Additional handlers - join/leave consolidated above)
  // ============================================================================

  // Handle stream chat messages
  socket.on('stream-chat', async (data) => {
    const { streamId, message, userId, username, avatar } = data;

    try {
      const Stream = require('./models/Stream');
      const stream = await Stream.findById(streamId);

      if (!stream || !stream.isLive) {
        socket.emit('stream-error', { message: 'Stream is not live' });
        return;
      }

      if (!stream.settings.allowChat) {
        socket.emit('stream-error', { message: 'Chat is disabled for this stream' });
        return;
      }

      // Create chat message object
      const chatMessage = {
        id: Date.now().toString(),
        streamId,
        userId,
        username,
        avatar,
        message: message.substring(0, 300), // Limit message length
        timestamp: new Date().toISOString(),
        type: 'chat'
      };

      // Increment chat message count
      await Stream.findByIdAndUpdate(streamId, {
        $inc: { 'analytics.totalChatMessages': 1 }
      });

      // Broadcast chat message to all stream viewers
      io.to(`stream-${streamId}`).emit('stream-chat', chatMessage);

      console.log(`💬 Chat message in stream ${streamId} from ${username}: ${message}`);
    } catch (error) {
      console.error('Error handling stream chat:', error);
      socket.emit('stream-error', { message: 'Failed to send chat message' });
    }
  });

  // Handle stream donations
  socket.on('stream-donation', async (data) => {
    const { streamId, donorId, streamerId, amount, currency, message, isAnonymous, paymentMethod } = data;

    try {
      const StreamDonation = require('./models/StreamDonation');
      const Stream = require('./models/Stream');

      // Create donation record
      const donation = new StreamDonation({
        streamId,
        donorId,
        streamerId,
        amount,
        currency,
        message,
        isAnonymous,
        paymentMethod,
        status: 'completed', // In real app, this would be 'pending' until payment confirms
        processingFee: amount * 0.029 + 0.30, // Example: Stripe fees
        isHighlighted: amount >= 50, // Highlight donations >= $50
        highlightColor: amount >= 100 ? '#FFD700' : amount >= 50 ? '#FF6B6B' : null,
        displayDuration: Math.min(Math.max(amount / 10, 5), 30) // 5-30 seconds based on amount
      });

      await donation.save();

      // Update stream's total donations
      const stream = await Stream.findByIdAndUpdate(streamId, {
        $inc: { 'monetization.totalDonations': amount }
      }, { new: true });

      // Prepare donation notification
      const donationNotification = {
        id: donation._id,
        streamId,
        donorUsername: isAnonymous ? 'Anonymous' : data.donorUsername,
        amount,
        currency,
        message,
        isAnonymous,
        isHighlighted: donation.isHighlighted,
        highlightColor: donation.highlightColor,
        displayDuration: donation.displayDuration,
        timestamp: new Date().toISOString(),
        type: 'donation',
        totalDonations: stream.monetization.totalDonations
      };

      // Broadcast donation to all stream viewers
      io.to(`stream-${streamId}`).emit('stream-donation', donationNotification);

      // Send personal notification to streamer
      io.to(`user-${streamerId}`).emit('donation-received', donationNotification);

      console.log(`💰 Donation in stream ${streamId}: $${amount} from ${donationNotification.donorUsername}`);
    } catch (error) {
      console.error('Error handling stream donation:', error);
      socket.emit('stream-error', { message: 'Failed to process donation' });
    }
  });

  // Handle stream health updates (from streaming software/server)
  socket.on('stream-health-update', async (data) => {
    const { streamId, bitrate, fps, quality, latency, droppedFrames } = data;

    try {
      const Stream = require('./models/Stream');
      const stream = await Stream.findByIdAndUpdate(
        streamId,
        {
          'health.bitrate': bitrate,
          'health.fps': fps,
          'health.quality': quality,
          'health.latency': latency,
          'health.droppedFrames': droppedFrames,
          'health.status': 'live'
        },
        { new: true }
      );

      if (stream) {
        // Broadcast health update to stream viewers (optional, for debugging)
        if (stream.settings.showHealthMetrics) {
          io.to(`stream-${streamId}`).emit('stream-health', {
            streamId,
            health: stream.health
          });
        }

        // Alert if quality is poor
        if (quality === 'poor' || droppedFrames > 100) {
          io.to(`user-${stream.streamerId}`).emit('stream-quality-alert', {
            streamId,
            issue: quality === 'poor' ? 'Poor quality detected' : 'High dropped frames',
            health: stream.health
          });
        }
      }
    } catch (error) {
      console.error('Error updating stream health:', error);
    }
  });

  // Handle general follow/unfollow updates
  socket.on('follow_update', async (data) => {
    const { userId, targetUserId, action, followerCount } = data;

    try {
      console.log(`👥 Follow update: ${userId} ${action}ed ${targetUserId}`);

      // Broadcast to all connected clients
      io.emit('follow_update', {
        userId,
        targetUserId,
        action,
        followerCount,
        timestamp: new Date().toISOString()
      });

      // Send personal notification to the target user
      io.to(`user-${targetUserId}`).emit('follower_change', {
        followerId: userId,
        action,
        followerCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling follow update:', error);
    }
  });

  // Handle stream follow notifications
  socket.on('stream-follow', async (data) => {
    const { streamId, followerId, followerUsername, streamerId } = data;

    try {
      const Stream = require('./models/Stream');
      // ===================== TikTok-style Live Feature Events =====================
      // Hearts on tap
      let lastLikeAt = 0;
      socket.on('live:like', async ({ streamId, count }) => {
        const now = Date.now();
        if (!streamId || now - lastLikeAt < 200) return;
        lastLikeAt = now;
        const incBy = Math.max(1, Math.min(Number(count) || 1, 10));
        try {
          const Stream = require('./models/Stream');
          const stream = await Stream.findByIdAndUpdate(
            streamId,
            { $inc: { 'analytics.totalLikes': incBy } },
            { new: true }
          ).lean();
          if (!stream) return;
          io.to(`stream-${streamId}`).emit('live:like:count', {
            streamId,
            totalLikes: stream.analytics?.totalLikes || 0
          });
          io.to(`stream-${streamId}`).emit('live:like:burst', {
            streamId,
            count: incBy,
            userId: socket.userId || socket.id,
            timestamp: new Date().toISOString()
          });
          const goal = getGoal(streamId);
          if (goal && goal.type === 'likes') {
            goal.progress = (goal.progress || 0) + incBy;
            setGoal(streamId, goal);
            io.to(`stream-${streamId}`).emit('live:goal:update', { streamId, goal });
            if (goal.target && goal.progress >= goal.target) {
              io.to(`stream-${streamId}`).emit('live:goal:achieved', { streamId, goal });
            }
          }
        } catch (e) {
          console.warn('live:like error:', e?.message);
        }
      });

      // Gifts overlay (lightweight gifts separate from donations)
      socket.on('live:gift', async ({ streamId, giftType, targetUserId }) => {
        if (!streamId || !giftType) return;
        try {
          const Stream = require('./models/Stream');
          const stream = await Stream.findById(streamId);
          if (!stream?.isLive || !stream.settings?.allowDonations) return;
          const giftValues = { heart: 1, star: 5, diamond: 10, crown: 25, rocket: 50 };
          const giftValue = giftValues[giftType] || 1;
          await Stream.findByIdAndUpdate(streamId, { $inc: { 'monetization.totalDonations': giftValue } });
          io.to(`stream-${streamId}`).emit('live:gift:received', {
            streamId,
            giftType,
            giftValue,
            fromUserId: socket.userId || socket.id,
            fromUsername: socket.displayName || socket.username || 'Anonymous',
            targetUserId,
            timestamp: new Date().toISOString()
          });
          const goal = getGoal(streamId);
          if (goal && goal.type === 'donations') {
            goal.progress = (goal.progress || 0) + giftValue;
            setGoal(streamId, goal);
            io.to(`stream-${streamId}`).emit('live:goal:update', { streamId, goal });
            if (goal.target && goal.progress >= goal.target) {
              io.to(`stream-${streamId}`).emit('live:goal:achieved', { streamId, goal });
            }
          }
        } catch (e) {
          console.warn('live:gift error:', e?.message);
        }
      });

      // Pinned messages (owner/moderator only)
      socket.on('live:pin-message', async ({ streamId, messageId, messageText }) => {
        if (!streamId || !messageId) return;
        try {
          const Stream = require('./models/Stream');
          const stream = await Stream.findById(streamId).lean();
          if (!stream) return;
          const uid = socket.userId || null;
          const isOwner = uid && String(stream.streamerId) === String(uid);
          const isModerator = uid && Array.isArray(stream.moderators) && stream.moderators.some(m => String(m.userId) === String(uid));
          if (!isOwner && !isModerator) return;
          io.to(`stream-${streamId}`).emit('live:message:pinned', {
            streamId,
            messageId,
            messageText,
            pinnedBy: socket.displayName || socket.username || 'Moderator',
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.warn('live:pin-message error:', e?.message);
        }
      });
      socket.on('live:unpin-message', ({ streamId }) => {
        if (!streamId) return;
        io.to(`stream-${streamId}`).emit('live:message:unpinned', { streamId });
      });

      // Goals: set/get/clear (in-memory)
      socket.on('live:goal:set', ({ streamId, type, target, title }) => {
        if (!streamId || !type) return;
        const goal = { type, target: Number(target) || 0, title: title || '', progress: 0 };
        setGoal(streamId, goal);
        io.to(`stream-${streamId}`).emit('live:goal:update', { streamId, goal });
      });
      socket.on('live:goal:get', ({ streamId }) => {
        const goal = getGoal(streamId);
        io.to(socket.id).emit('live:goal:current', { streamId, goal });
      });
      socket.on('live:goal:clear', ({ streamId }) => {
        clearGoal(streamId);
        io.to(`stream-${streamId}`).emit('live:goal:clear', { streamId });
      });

      // Live polls: start/vote/stop (in-memory)
      socket.on('live:poll:start', ({ streamId, question, options }) => {
        if (!streamId || !question || !Array.isArray(options) || options.length < 2) return;
        const poll = { question, options, counts: options.map(() => 0), voters: new Set(), active: true };
        setPoll(streamId, poll);
        io.to(`stream-${streamId}`).emit('live:poll:update', {
          streamId,
          poll: { question: poll.question, options: poll.options, counts: poll.counts, active: poll.active }
        });
      });
      socket.on('live:poll:vote', ({ streamId, optionIndex }) => {
        const poll = getPoll(streamId);
        if (!poll || !poll.active) return;
        const voter = String(socket.userId || socket.id);
        if (poll.voters.has(voter)) return;
        const idx = Number(optionIndex);
        if (Number.isNaN(idx) || idx < 0 || idx >= poll.counts.length) return;
        poll.counts[idx] += 1;
        poll.voters.add(voter);
        setPoll(streamId, poll);
        io.to(`stream-${streamId}`).emit('live:poll:update', {
          streamId,
          poll: { question: poll.question, options: poll.options, counts: poll.counts, active: poll.active }
        });
      });
      socket.on('live:poll:stop', ({ streamId }) => {
        const poll = getPoll(streamId);
        if (!poll) return;
        poll.active = false;
        setPoll(streamId, poll);
        io.to(`stream-${streamId}`).emit('live:poll:ended', {
          streamId,
          poll: { question: poll.question, options: poll.options, counts: poll.counts, active: poll.active }
        });
      });
      // ===========================================================================

      await Stream.findByIdAndUpdate(streamId, {
        $inc: { 'analytics.newFollowers': 1 }
      });

      const followNotification = {
        streamId,
        followerId,
        followerUsername,
        timestamp: new Date().toISOString(),
        type: 'follow'
      };

      // Broadcast follow notification to stream
      io.to(`stream-${streamId}`).emit('stream-follow', followNotification);

      // Send personal notification to streamer
      io.to(`user-${streamerId}`).emit('new-follower', followNotification);

      console.log(`👥 New follower in stream ${streamId}: ${followerUsername}`);
    } catch (error) {
      console.error('Error handling stream follow:', error);
    }
  });

  // ============================================================================
  // WEBRTC SIGNALING HANDLERS
  // ============================================================================

  // Handle stream started (WebRTC)
  socket.on('stream-started', async (data) => {
    const { streamId, streamerId, title, hasVideo, hasAudio } = data;

    try {
      console.log(`🎥 WebRTC stream started: ${streamId} by ${streamerId}`);

      // Update stream status in database
      const Stream = require('./models/Stream');
      await Stream.findOneAndUpdate(
        { _id: streamId },
        {
          isLive: true,
          startedAt: new Date(),
          'health.status': 'live',
          title: title || 'Live WebRTC Stream'
        },
        { upsert: true, new: true }
      );

      // Notify all viewers in the stream room
      socket.to(`stream-${streamId}`).emit('stream-started', {
        streamId,
        streamerId,
        title,
        hasVideo,
        hasAudio,
        timestamp: new Date().toISOString()
      });

      // Store streamer info
      socket.streamerId = streamerId;
      socket.streamId = streamId;

      console.log(`📡 Stream ${streamId} is now live`);
    } catch (error) {
      console.error('Error handling stream started:', error);
    }
  });

  // Handle stream stopped (WebRTC)
  socket.on('stream-stopped', async (data) => {
    const { streamId, streamerId } = data;

    try {
      console.log(`⏹️ WebRTC stream stopped: ${streamId} by ${streamerId}`);

      // Update stream status in database
      const Stream = require('./models/Stream');
      await Stream.findByIdAndUpdate(streamId, {
        isLive: false,
        endedAt: new Date(),
        'health.status': 'offline',
        viewerCount: 0
      });

      // Notify all viewers
      socket.to(`stream-${streamId}`).emit('stream-stopped', {
        streamId,
        streamerId,
        timestamp: new Date().toISOString()
      });

      console.log(`📡 Stream ${streamId} has ended`);
    } catch (error) {
      console.error('Error handling stream stopped:', error);
    }
  });

  // Handle WebRTC offer
  socket.on('webrtc-offer', (data) => {
    const { offer, streamId, viewerId, streamerId } = data;

    console.log(`📨 WebRTC offer from ${data.viewerId || 'viewer'} to ${data.streamerId || 'streamer'}`);

    if (streamerId) {
      // Forward offer to specific streamer
      socket.to(`user-${streamerId}`).emit('webrtc-offer', {
        offer,
        streamId,
        viewerId: viewerId || socket.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Forward to stream room (for peer-to-peer scenarios)
      socket.to(`stream-${streamId}`).emit('webrtc-offer', {
        offer,
        streamId,
        viewerId: viewerId || socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle WebRTC answer
  socket.on('webrtc-answer', (data) => {
    const { answer, streamId, viewerId, streamerId } = data;

    console.log(`📨 WebRTC answer from ${streamerId || 'streamer'} to ${viewerId || 'viewer'}`);

    if (viewerId) {
      // Forward answer to specific viewer
      socket.to(`user-${viewerId}`).emit('webrtc-answer', {
        answer,
        streamId,
        streamerId: streamerId || socket.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Forward to stream room
      socket.to(`stream-${streamId}`).emit('webrtc-answer', {
        answer,
        streamId,
        streamerId: streamerId || socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle ICE candidates
  socket.on('webrtc-ice-candidate', (data) => {
    const { candidate, streamId, viewerId, senderId } = data;

    console.log(`🧊 ICE candidate from ${senderId}`);

    // Forward ICE candidate to the appropriate peer
    if (viewerId && viewerId !== senderId) {
      socket.to(`user-${viewerId}`).emit('webrtc-ice-candidate', {
        candidate,
        streamId,
        senderId,
        timestamp: new Date().toISOString()
      });
    } else {
      // Broadcast to stream room (excluding sender)
      socket.to(`stream-${streamId}`).emit('webrtc-ice-candidate', {
        candidate,
        streamId,
        senderId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle viewer joining stream for WebRTC
  socket.on('viewer-join-webrtc', (data) => {
    const { streamId, viewerId } = data;

    console.log(`👀 Viewer joining WebRTC stream: ${viewerId} -> ${streamId}`);

    // Notify the streamer about new viewer
    socket.to(`stream-${streamId}`).emit('viewer-joined', {
      streamId,
      viewerId: viewerId || socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Handle viewer leaving stream for WebRTC
  socket.on('viewer-leave-webrtc', (data) => {
    const { streamId, viewerId } = data;

    console.log(`👋 Viewer leaving WebRTC stream: ${viewerId} -> ${streamId}`);

    // Notify the streamer about viewer leaving
    socket.to(`stream-${streamId}`).emit('viewer-left', {
      streamId,
      viewerId: viewerId || socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Handle WebRTC connection quality reports
  socket.on('webrtc-stats', async (data) => {
    const { streamId, stats, peerId } = data;

    try {
      // Update stream health with WebRTC stats
      const Stream = require('./models/Stream');

      if (stats.bitrate || stats.fps || stats.quality) {
        await Stream.findByIdAndUpdate(streamId, {
          'health.bitrate': stats.bitrate || 0,
          'health.fps': stats.fps || 0,
          'health.quality': stats.quality || 'unknown',
          'health.latency': stats.latency || 0,
          'health.droppedFrames': stats.droppedFrames || 0
        });

        // Broadcast health update if quality is poor
        if (stats.quality === 'poor' || stats.droppedFrames > 100) {
          socket.to(`stream-${streamId}`).emit('stream-health', {
            streamId,
            health: {
              bitrate: stats.bitrate,
              fps: stats.fps,
              quality: stats.quality,
              latency: stats.latency,
              droppedFrames: stats.droppedFrames
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error handling WebRTC stats:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);

    // Handle stream viewer leaving on disconnect
    if (socket.currentStream) {
      try {
        const Stream = require('./models/Stream');
        const stream = await Stream.findByIdAndUpdate(
          socket.currentStream,
          {
            $inc: { viewerCount: -1 }
          },
          { new: true }
        );

        if (stream) {
          // Broadcast updated viewer count
          io.to(`stream-${socket.currentStream}`).emit('stream-viewers-update', {
            streamId: socket.currentStream,
            viewerCount: Math.max(0, stream.viewerCount - 1)
          });
        }
      } catch (error) {
        console.error('Error cleaning up stream viewer on disconnect:', error);
      }
    }

    // Handle WebRTC streamer disconnect
    if (socket.streamerId && socket.streamId) {
      try {
        console.log(`🎥 WebRTC streamer disconnected: ${socket.streamerId}`);

        // Update stream status
        const Stream = require('./models/Stream');
        await Stream.findByIdAndUpdate(socket.streamId, {
          isLive: false,
          endedAt: new Date(),
          'health.status': 'offline',
          viewerCount: 0
        });

        // Notify all viewers that stream ended
        socket.to(`stream-${socket.streamId}`).emit('stream-stopped', {
          streamId: socket.streamId,
          streamerId: socket.streamerId,
          reason: 'streamer_disconnected',
          timestamp: new Date().toISOString()
        });

        console.log(`📡 Stream ${socket.streamId} ended due to streamer disconnect`);
      } catch (error) {
        console.error('Error cleaning up WebRTC stream on disconnect:', error);
      }
    }

    // Notify WebRTC peers about disconnection
    if (socket.currentStream) {
      socket.to(`stream-${socket.currentStream}`).emit('viewer-left', {
        streamId: socket.currentStream,
        viewerId: socket.id,
        timestamp: new Date().toISOString()
      });
    }

    // Handle user going offline
    if (socket.userId) {
      const presence = userPresence.get(socket.userId);
      if (presence) {
        const offlinePresence = {
          ...presence,
          isOnline: false,
          lastSeen: new Date(),
        };

        userPresence.set(socket.userId, offlinePresence);

        // Only broadcast offline status if user allows it
        if (presence.showOnlineStatus) {
          socket.broadcast.emit('user-disconnected', {
            userId: socket.userId,
          });
        }
      }
    }

    connectedClients.delete(socket.id);
  });
});

// Helper function to broadcast to all clients
const broadcastToAll = (event, data) => {
  io.emit(event, data);
};

// Helper function to broadcast to specific feed
// NOTE: Room naming uses underscore to match 'join-feed' handler (feed_${feedType})
const broadcastToFeed = (feedType, event, data) => {
  // Emit to feed room
  io.to(`feed_${feedType}`).emit(event, data);

  // Bridge: when feedType is stream-<id>, also emit to the stream_<id> room used by join-stream
  const m = /^stream-(.+)$/.exec(feedType);
  if (m) {
    const streamId = m[1];
    io.to(`stream_${streamId}`).emit(event, data);
  }
};

// Helper function to broadcast to specific user
const broadcastToUser = (userId, event, data) => {
  io.to(`user-${userId}`).emit(event, data);
};

// Make broadcast functions available globally
global.broadcastToAll = broadcastToAll;
global.broadcastToFeed = broadcastToFeed;
global.broadcastToUser = broadcastToUser;

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

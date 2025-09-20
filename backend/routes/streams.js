const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Stream, User } = require('../models');
const {
  loadStream,
  requireChatAllowed,
  enforceNotBannedOrTimedOut,
  requireStreamerOrModerator,
} = require('../middleware/streamModeration');

// Stream model is imported from ../models

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Streams service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/streams
// @desc    Get all streams
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1, category, search, isLive, streamerId } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (streamerId) {
      query.streamerId = streamerId;
    }
    
    if (isLive !== undefined) {
      query.isLive = isLive === 'true';
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get streams from database
    const streams = await Stream.find(query)
      .populate('streamerId', 'username displayName avatar isVerified followerCount')
      .sort(search ? { score: { $meta: 'textScore' } } : { isLive: -1, viewerCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count
    const total = await Stream.countDocuments(query);
    
    // Transform data for compatibility
    const transformedStreams = streams.map(stream => ({
      ...stream,
      id: stream._id,
      streamer: {
        id: stream.streamerId._id,
        username: stream.streamerId.username,
        displayName: stream.streamerId.displayName,
        avatar: stream.streamerId.avatar,
        isVerified: stream.streamerId.isVerified,
        followerCount: stream.streamerId.followerCount || 0
      }
    }));

    res.json({
      success: true,
      data: { 
        streams: transformedStreams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streams',
      message: error.message,
    });
  }
});

// @route   POST /api/streams
// @desc    Create new stream
// @access  Private (strict)
router.post('/', authenticateTokenStrict, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      tags = [],
      thumbnail,
      settings = {},
      monetization = {}
    } = req.body;

    // Validation
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        error: 'Title and category are required',
      });
    }

    // Create new stream
    const newStream = new Stream({
      streamerId: req.user.userId,
      title: title.trim(),
      description: description?.trim(),
      category,
      tags: tags.map(tag => tag.trim()),
      thumbnail,
      isLive: false,
      settings: {
        allowChat: settings.allowChat !== false,
        allowDonations: settings.allowDonations !== false,
        isSubscriberOnly: settings.isSubscriberOnly || false,
        maxViewers: settings.maxViewers || 10000
      },
      monetization: {
        subscriptionPrice: monetization.subscriptionPrice || 0,
        donationGoal: monetization.donationGoal || 0,
        totalDonations: 0
      }
    });

    await newStream.save();

    // Populate streamer data
    await newStream.populate('streamerId', 'username displayName avatar isVerified followerCount');

    const responseData = {
      ...newStream.toObject(),
      id: newStream._id,
      streamer: {
        id: newStream.streamerId._id,
        username: newStream.streamerId.username,
        displayName: newStream.streamerId.displayName,
        avatar: newStream.streamerId.avatar,
        isVerified: newStream.streamerId.isVerified,
        followerCount: newStream.streamerId.followerCount || 0
      }
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Stream created successfully'
    });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stream',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/live
// @desc    Get live streams
// @access  Public
router.get('/live', async (req, res) => {
  try {
    const { limit = 20, page = 1, category } = req.query;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query for live streams
    let query = { isLive: true, isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Get live streams
    const streams = await Stream.find(query)
      .populate('streamerId', 'username displayName avatar isVerified')
      .sort({ viewerCount: -1, startedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count
    const total = await Stream.countDocuments(query);
    
    // Transform data
    const transformedStreams = streams.map(stream => ({
      ...stream,
      id: stream._id,
      streamer: {
        id: stream.streamerId._id,
        username: stream.streamerId.username,
        displayName: stream.streamerId.displayName,
        avatar: stream.streamerId.avatar,
        isVerified: stream.streamerId.isVerified
      }
    }));

    res.json({
      success: true,
      data: {
        streams: transformedStreams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get live streams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live streams',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/categories
// @desc    Get stream categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = ['Technology', 'Art', 'Gaming', 'Music', 'Education', 'Entertainment', 'Finance', 'Other'];

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
    });
  }
});

// @route   GET /api/streams/gift-types
// @desc    Get available gift types
// @access  Public
router.get('/gift-types', async (req, res) => {
  try {
    const giftTypes = [
      { id: 'heart', name: 'Heart', price: 1, emoji: '❤️', color: '#e91e63' },
      { id: 'star', name: 'Star', price: 5, emoji: '⭐', color: '#ffc107' },
      { id: 'diamond', name: 'Diamond', price: 10, emoji: '💎', color: '#00bcd4' },
      { id: 'crown', name: 'Crown', price: 25, emoji: '👑', color: '#ff9800' },
      { id: 'rocket', name: 'Rocket', price: 50, emoji: '🚀', color: '#9c27b0' },
      { id: 'unicorn', name: 'Unicorn', price: 100, emoji: '🦄', color: '#e91e63' },
      { id: 'rainbow', name: 'Rainbow', price: 200, emoji: '🌈', color: '#4caf50' },
      { id: 'fireworks', name: 'Fireworks', price: 500, emoji: '🎆', color: '#f44336' }
    ];

    res.json({
      success: true,
      data: { giftTypes }
    });
  } catch (error) {
    console.error('Get gift types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gift types',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/scheduled
// @desc    Get scheduled streams
// @access  Public
router.get('/scheduled', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const scheduledStreams = await Stream.find({
      isScheduled: true,
      scheduledAt: { $gte: new Date() },
      isActive: true
    })
      .populate('streamerId', 'username displayName avatar isVerified')
      .sort({ scheduledAt: 1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Stream.countDocuments({
      isScheduled: true,
      scheduledAt: { $gte: new Date() },
      isActive: true
    });

    const transformedStreams = scheduledStreams.map(stream => ({
      ...stream,
      id: stream._id,
      streamer: {
        id: stream.streamerId._id,
        username: stream.streamerId.username,
        displayName: stream.streamerId.displayName,
        avatar: stream.streamerId.avatar,
        isVerified: stream.streamerId.isVerified
      }
    }));

    res.json({
      success: true,
      data: {
        streams: transformedStreams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get scheduled streams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduled streams',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id
// @desc    Get single stream
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id)
      .populate('streamerId', 'username displayName avatar isVerified followerCount')
      .lean();
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Increment total views
    await Stream.findByIdAndUpdate(id, { $inc: { totalViews: 1 } });
    
    const responseData = {
      ...stream,
      id: stream._id,
      streamer: {
        id: stream.streamerId._id,
        username: stream.streamerId.username,
        displayName: stream.streamerId.displayName,
        avatar: stream.streamerId.avatar,
        isVerified: stream.streamerId.isVerified,
        followerCount: stream.streamerId.followerCount || 0
      }
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream',
      message: error.message,
    });
  }
});

// @route   PUT /api/streams/:id
// @desc    Update stream
// @access  Private (strict)
router.put('/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this stream',
      });
    }
    
    // Update stream
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('streamerId', 'username displayName avatar isVerified followerCount');
    
    const responseData = {
      ...updatedStream.toObject(),
      id: updatedStream._id,
      streamer: {
        id: updatedStream.streamerId._id,
        username: updatedStream.streamerId.username,
        displayName: updatedStream.streamerId.displayName,
        avatar: updatedStream.streamerId.avatar,
        isVerified: updatedStream.streamerId.isVerified,
        followerCount: updatedStream.streamerId.followerCount || 0
      }
    };

    res.json({
      success: true,
      data: responseData,
      message: 'Stream updated successfully'
    });
  } catch (error) {
    console.error('Update stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stream',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/start
// @desc    Start stream
// @access  Private (strict)
router.post('/:id/start', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { streamUrl, playbackUrl } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to start this stream',
      });
    }
    
    // Update stream to live
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      { 
        isLive: true,
        startedAt: new Date(),
        streamUrl,
        playbackUrl,
        endedAt: null
      },
      { new: true }
    ).populate('streamerId', 'username displayName avatar isVerified followerCount');

    res.json({
      success: true,
      data: {
        ...updatedStream.toObject(),
        id: updatedStream._id
      },
      message: 'Stream started successfully'
    });
  } catch (error) {
    console.error('Start stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start stream',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/stop
// @desc    Stop stream
// @access  Private (strict)
router.post('/:id/stop', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to stop this stream',
      });
    }
    
    // Calculate duration
    const duration = stream.startedAt ? 
      Math.floor((new Date().getTime() - stream.startedAt.getTime()) / 1000) : 0;
    
    // Update stream to offline
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      { 
        isLive: false,
        endedAt: new Date(),
        duration,
        viewerCount: 0
      },
      { new: true }
    ).populate('streamerId', 'username displayName avatar isVerified followerCount');

    res.json({
      success: true,
      data: {
        ...updatedStream.toObject(),
        id: updatedStream._id
      },
      message: 'Stream stopped successfully'
    });
  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop stream',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/end
// @desc    End stream (alias for stop)
// @access  Private
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to end this stream',
      });
    }
    
    // Calculate duration
    const duration = stream.startedAt ? 
      Math.floor((new Date().getTime() - stream.startedAt.getTime()) / 1000) : 0;
    
    // Update stream to offline
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      { 
        isLive: false,
        endedAt: new Date(),
        duration,
        viewerCount: 0
      },
      { new: true }
    ).populate('streamerId', 'username displayName avatar isVerified followerCount');

    res.json({
      success: true,
      data: {
        ...updatedStream.toObject(),
        id: updatedStream._id
      },
      message: 'Stream ended successfully'
    });
  } catch (error) {
    console.error('End stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end stream',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/settings
// @desc    Get stream settings
// @access  Private
router.get('/:id/settings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this stream settings',
      });
    }

    res.json({
      success: true,
      data: {
        id: stream._id,
        title: stream.title,
        description: stream.description,
        category: stream.category,
        tags: stream.tags,
        settings: stream.settings,
        monetization: stream.monetization
      },
    });
  } catch (error) {
    console.error('Get stream settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream settings',
      message: error.message,
    });
  }
});

// @route   PUT /api/streams/:id/settings
// @desc    Update stream settings
// @access  Private
router.put('/:id/settings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this stream settings',
      });
    }
    
    // Update stream settings
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      { settings: { ...stream.settings, ...settings } },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedStream.settings,
      message: 'Stream settings updated successfully'
    });
  } catch (error) {
    console.error('Update stream settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stream settings',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/metrics
// @desc    Get stream analytics/metrics
// @access  Private
router.get('/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this stream metrics',
      });
    }

    // Mock analytics data - in real app this would come from analytics service
    const mockMetrics = {
      viewerStats: {
        current: stream.viewerCount,
        peak: Math.max(stream.viewerCount + Math.floor(Math.random() * 500), stream.viewerCount),
        total: stream.totalViews,
        average: Math.floor(stream.totalViews / Math.max(stream.duration / 3600, 1))
      },
      engagement: {
        chatMessages: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 200),
        shares: Math.floor(Math.random() * 50),
        newFollowers: Math.floor(Math.random() * 30)
      },
      revenue: {
        donations: stream.monetization?.totalDonations || 0,
        subscriptions: Math.floor(Math.random() * 100),
        totalEarnings: (stream.monetization?.totalDonations || 0) + Math.floor(Math.random() * 200)
      },
      topChatters: [
        { username: 'viewer1', messages: 45 },
        { username: 'viewer2', messages: 32 },
        { username: 'viewer3', messages: 28 }
      ],
      demographics: {
        countries: [
          { name: 'US', viewers: 45, percentage: 45 },
          { name: 'UK', viewers: 25, percentage: 25 },
          { name: 'CA', viewers: 20, percentage: 20 },
          { name: 'Other', viewers: 10, percentage: 10 }
        ],
        devices: [
          { type: 'Desktop', count: 60 },
          { type: 'Mobile', count: 35 },
          { type: 'Tablet', count: 5 }
        ]
      }
    };

    res.json({
      success: true,
      data: mockMetrics,
    });
  } catch (error) {
    console.error('Get stream metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream metrics',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/health
// @desc    Get stream health status
// @access  Private
router.get('/:id/health', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this stream health',
      });
    }

    // Mock health data
    const healthData = {
      status: stream.isLive ? 'live' : 'offline',
      bitrate: Math.floor(Math.random() * 3000) + 1000,
      fps: 30,
      resolution: '1080p',
      latency: Math.floor(Math.random() * 5) + 1,
      quality: 'good',
      uptime: stream.startedAt ? Math.floor((new Date().getTime() - stream.startedAt.getTime()) / 1000) : 0
    };

    res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    console.error('Get stream health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream health',
      message: error.message,
    });
  }
});

// CHAT ENDPOINTS

// @route   GET /api/streams/:id/chat/messages
// @desc    Get chat messages for stream
// @access  Public
router.get('/:id/chat/messages', loadStream, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch non-deleted messages from DB
    const [messages, total] = await Promise.all([
      ChatMessage.find({ streamId: id, isDeleted: false })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ChatMessage.countDocuments({ streamId: id, isDeleted: false })
    ]);

    res.json({
      success: true,
      data: {
        messages: messages.map(m => ({
          id: m._id,
          userId: m.userId,
          message: m.message,
          timestamp: m.createdAt,
          type: m.type,
          reactions: {
            likes: m.reactions?.likes || 0,
            hearts: m.reactions?.hearts || 0,
          },
          isPinned: !!m.isPinned,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to get chat messages', message: error.message });
  }
});

// @route   POST /api/streams/:id/chat/messages
// @desc    Send chat message
// @access  Private
router.post('/:id/chat/messages', authenticateToken, loadStream, requireChatAllowed, enforceNotBannedOrTimedOut, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }

    // Check if chat is enabled
    if (!stream.settings.allowChat) {
      return res.status(403).json({ success: false, error: 'Chat is disabled for this stream' });
    }

    // Enforce bans: permanent or not-yet-expired temporary
    const now = new Date();
    const isBanned = (stream.moderation?.bannedUsers || []).some(b => String(b.userId) === String(req.user.userId) && (!b.until || b.until > now));
    if (isBanned) {
      return res.status(403).json({ success: false, error: 'You are banned from this chat' });
    }

    // Enforce timeouts: if an active timeout exists
    const isTimedOut = (stream.moderation?.timeouts || []).some(t => String(t.userId) === String(req.user.userId) && t.until > now);
    if (isTimedOut) {
      return res.status(429).json({ success: false, error: 'You are currently timed out from chatting' });
    }

    // Create and save message
    const chatMessage = await ChatMessage.create({
      streamId: id,
      userId: req.user.userId,
      message: message.trim(),
      type: 'message',
    });

    // Optionally increment analytics counter
    await Stream.findByIdAndUpdate(id, { $inc: { 'analytics.totalChatMessages': 1 } });

    // Broadcast via WebSocket if available
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'chat:new-message', {
        id: chatMessage._id,
        userId: chatMessage.userId,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt,
        type: chatMessage.type,
      });
    }

    res.json({
      success: true,
      data: {
        id: chatMessage._id,
        userId: chatMessage.userId,
        message: chatMessage.message,
        timestamp: chatMessage.createdAt,
        type: chatMessage.type,
      },
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', message: error.message });
  }
});

// @route   DELETE /api/streams/:id/chat/messages/:messageId
// @desc    Delete a chat message (streamer or moderator)
// @access  Private
router.delete('/:id/chat/messages/:messageId', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const stream = req.stream;

    const msg = await ChatMessage.findOne({ _id: messageId, streamId: id });
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Soft delete
    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.deletedBy = req.user.userId;
    await msg.save();

    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'chat:message-deleted', { id: msg._id });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete chat message error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message', message: error.message });
  }
});

// @route   POST /api/streams/:id/chat/messages/:messageId/pin
// @desc    Toggle pin on a chat message (streamer or moderator)
// @access  Private
router.post('/:id/chat/messages/:messageId/pin', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const stream = req.stream;

    const msg = await ChatMessage.findOne({ _id: messageId, streamId: id, isDeleted: false });
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    msg.isPinned = !msg.isPinned;
    await msg.save();

    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'chat:message-pin', { id: msg._id, isPinned: msg.isPinned });
    }

    res.json({ success: true, data: { id: msg._id, isPinned: msg.isPinned }, message: msg.isPinned ? 'Message pinned' : 'Message unpinned' });
  } catch (error) {
    console.error('Pin chat message error:', error);
    res.status(500).json({ success: false, error: 'Failed to pin message', message: error.message });
  }
});

// CHAT SETTINGS ENDPOINTS

// @route   GET /api/streams/:id/chat/settings
// @desc    Get chat settings for a stream (owner or moderator)
// @access  Private
router.get('/:id/chat/settings', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const stream = req.stream;

    const chatSettings = {
      slowMode: (stream.settings?.chatSlowMode || 0) > 0,
      slowModeDelay: stream.settings?.chatSlowMode || 0,
      subscribersOnly: !!stream.settings?.isSubscriberOnly,
      followersOnly: !!stream.settings?.requireFollowToChat,
      emoteOnly: false, // not persisted in schema
      autoModeration: !!stream.settings?.autoModeration,
      bannedWords: [], // not persisted in schema
      maxMessageLength: 500, // static cap
      allowLinks: true, // not persisted in schema
      allowChat: stream.settings?.allowChat !== false,
    };

    res.json({ success: true, data: chatSettings });
  } catch (error) {
    console.error('Get chat settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get chat settings', message: error.message });
  }
});

// @route   PUT /api/streams/:id/chat/settings
// @desc    Update chat settings (owner or moderator)
// @access  Private
router.put('/:id/chat/settings', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { slowMode, slowModeDelay, subscribersOnly, followersOnly, autoModeration, allowChat } = req.body || {};

    const update = {};
    if (typeof allowChat === 'boolean') update['settings.allowChat'] = allowChat;
    if (typeof slowModeDelay === 'number') {
      update['settings.chatSlowMode'] = Math.max(0, Math.floor(slowModeDelay));
    } else if (typeof slowMode === 'boolean') {
      // toggle slowMode with default 5s if enabling and no explicit delay
      update['settings.chatSlowMode'] = slowMode ? 5 : 0;
    }
    if (typeof subscribersOnly === 'boolean') update['settings.isSubscriberOnly'] = subscribersOnly;
    if (typeof followersOnly === 'boolean') update['settings.requireFollowToChat'] = followersOnly;
    if (typeof autoModeration === 'boolean') update['settings.autoModeration'] = autoModeration;

    const updated = await Stream.findByIdAndUpdate(id, { $set: update }, { new: true }).select('_id settings');

    const response = {
      slowMode: (updated.settings?.chatSlowMode || 0) > 0,
      slowModeDelay: updated.settings?.chatSlowMode || 0,
      subscribersOnly: !!updated.settings?.isSubscriberOnly,
      followersOnly: !!updated.settings?.requireFollowToChat,
      emoteOnly: false,
      autoModeration: !!updated.settings?.autoModeration,
      bannedWords: [],
      maxMessageLength: 500,
      allowLinks: true,
      allowChat: updated.settings?.allowChat !== false,
    };

    // Broadcast chat settings change to viewers in this stream room
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'chat:settings', { streamId: id, settings: response });
    }

    res.json({ success: true, data: response, message: 'Chat settings updated' });
  } catch (error) {
    console.error('Update chat settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update chat settings', message: error.message });
  }
});

// MODERATION ENDPOINTS

// @route   GET /api/streams/:id/moderation/banned
// @desc    List banned users for this stream
// @access  Private (owner/moderator)
router.get('/:id/moderation/banned', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const stream = req.stream;
    const now = new Date();
    const banned = (stream.moderation?.bannedUsers || []).map(b => ({
      userId: b.userId,
      reason: b.reason || '',
      until: b.until || null,
      isActive: !b.until || b.until > now,
      createdAt: b.createdAt
    }));
    res.json({ success: true, data: { banned } });
  } catch (error) {
    console.error('List banned users error:', error);
    res.status(500).json({ success: false, error: 'Failed to list banned users', message: error.message });
  }
});

// @route   GET /api/streams/:id/moderation/timeouts
// @desc    List active and past timeouts for this stream
// @access  Private (owner/moderator)
router.get('/:id/moderation/timeouts', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const stream = req.stream;
    const now = new Date();
    const timeouts = (stream.moderation?.timeouts || []).map(t => ({
      userId: t.userId,
      reason: t.reason || '',
      until: t.until,
      isActive: t.until > now,
      createdAt: t.createdAt
    }));
    res.json({ success: true, data: { timeouts } });
  } catch (error) {
    console.error('List timeouts error:', error);
    res.status(500).json({ success: false, error: 'Failed to list timeouts', message: error.message });
  }
});

// @route   GET /api/streams/:id/moderators
// @desc    Get stream moderators
// @access  Private
router.get('/:id/moderators', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view stream moderators',
      });
    }

    // Mock moderators data
    const mockModerators = [
      {
        id: 'mod1',
        username: 'mod_user1',
        displayName: 'Moderator 1',
        avatar: '/api/placeholder/32/32',
        permissions: ['moderate_chat', 'timeout_users', 'ban_users'],
        addedAt: new Date()
      }
    ];

    res.json({
      success: true,
      data: { moderators: mockModerators },
    });
  } catch (error) {
    console.error('Get moderators error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get moderators',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/moderators
// @desc    Add stream moderator
// @access  Private
router.post('/:id/moderators', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, permissions = ['moderate_chat'] } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add moderators',
      });
    }

    // Find user to add as moderator
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const newModerator = {
      id: userId,
      username: userToAdd.username,
      displayName: userToAdd.displayName,
      avatar: userToAdd.avatar,
      permissions,
      addedAt: new Date()
    };

    // In real app, this would be saved to database
    res.json({
      success: true,
      data: newModerator,
      message: 'Moderator added successfully'
    });
  } catch (error) {
    console.error('Add moderator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add moderator',
      message: error.message,
    });
  }
});

// @route   DELETE /api/streams/:id/moderators/:userId
// @desc    Remove stream moderator
// @access  Private
router.delete('/:id/moderators/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to remove moderators',
      });
    }

    // In real app, this would remove from database
    res.json({
      success: true,
      message: 'Moderator removed successfully'
    });
  } catch (error) {
    console.error('Remove moderator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove moderator',
      message: error.message,
    });
  }
});

// Moderation actions

// @route   POST /api/streams/:id/moderation/ban
// @desc    Ban a user from chat (streamer or moderator)
// @access  Private
router.post('/:id/moderation/ban', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason = '', duration } = req.body; // duration in seconds; omit for permanent

    const stream = req.stream;

    const until = duration ? new Date(Date.now() + duration * 1000) : null;

    await Stream.updateOne(
      { _id: id },
      { $pull: { 'moderation.timeouts': { userId } } } // remove any existing timeouts
    );

    // Upsert banned user record
    await Stream.updateOne(
      { _id: id, 'moderation.bannedUsers.userId': { $ne: userId } },
      { $push: { 'moderation.bannedUsers': { userId, reason, until } } }
    );

    // Broadcast moderation event
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'moderation:ban', { streamId: id, userId, until, reason });
    }

    res.json({ success: true, message: 'User banned' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ success: false, error: 'Failed to ban user', message: error.message });
  }
});

// @route   POST /api/streams/:id/moderation/unban
// @desc    Unban a user
// @access  Private
router.post('/:id/moderation/unban', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const stream = req.stream;

    await Stream.updateOne({ _id: id }, { $pull: { 'moderation.bannedUsers': { userId } } });

    // Broadcast moderation event
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'moderation:unban', { streamId: id, userId });
    }

    res.json({ success: true, message: 'User unbanned' });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ success: false, error: 'Failed to unban user', message: error.message });
  }
});

// @route   POST /api/streams/:id/moderation/timeout
// @desc    Timeout a user for a period of time
// @access  Private
router.post('/:id/moderation/timeout', authenticateToken, loadStream, requireStreamerOrModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, duration, reason = '' } = req.body; // duration in seconds

    if (!duration || duration <= 0) return res.status(400).json({ success: false, error: 'Valid duration is required' });

    const stream = req.stream;

    const until = new Date(Date.now() + duration * 1000);

    // Remove existing timeout for the user, then add new
    await Stream.updateOne(
      { _id: id },
      { 
        $pull: { 
          'moderation.timeouts': { userId },
          'moderation.bannedUsers': { userId }, // ensure not banned
        }
      }
    );

    await Stream.updateOne(
      { _id: id },
      { $push: { 'moderation.timeouts': { userId, reason, until } } }
    );

    // Broadcast moderation event
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'moderation:timeout', { streamId: id, userId, until, reason });
    }

    res.json({ success: true, message: 'User timed out', data: { userId, until } });
  } catch (error) {
    console.error('Timeout user error:', error);
    res.status(500).json({ success: false, error: 'Failed to timeout user', message: error.message });
  }
});

// DONATIONS ENDPOINTS

// @route   POST /api/streams/:id/donations
// @desc    Send donation to stream
// @access  Private
router.post('/:id/donations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, message = '', currency = 'USD' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid donation amount is required',
      });
    }

    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Check if donations are enabled
    if (!stream.settings.allowDonations) {
      return res.status(403).json({
        success: false,
        error: 'Donations are disabled for this stream',
      });
    }

    // Get donor info
    const donor = await User.findById(req.user.userId).select('username displayName avatar');

    // Create donation record
    const donation = {
      id: new Date().getTime().toString(),
      donorId: req.user.userId,
      donorUsername: donor.username,
      donorDisplayName: donor.displayName,
      amount,
      currency,
      message: message.trim(),
      timestamp: new Date()
    };

    // Update stream total donations
    await Stream.findByIdAndUpdate(id, {
      $inc: { 'monetization.totalDonations': amount }
    });

    // In real app, this would process payment and save to database
    res.json({
      success: true,
      data: donation,
      message: 'Donation sent successfully'
    });
  } catch (error) {
    console.error('Send donation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process donation',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/donations
// @desc    Get stream donations
// @access  Private (stream owner only)
router.get('/:id/donations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view donations',
      });
    }

    // Mock donations data
    const mockDonations = [
      {
        id: '1',
        donorUsername: 'generous_viewer',
        donorDisplayName: 'Generous Viewer',
        amount: 25,
        currency: 'USD',
        message: 'Great content! Keep it up!',
        timestamp: new Date()
      },
      {
        id: '2',
        donorUsername: 'crypto_fan',
        donorDisplayName: 'Crypto Fan',
        amount: 50,
        currency: 'USD',
        message: 'Thanks for explaining DeFi so clearly!',
        timestamp: new Date(Date.now() - 300000)
      }
    ];

    res.json({
      success: true,
      data: {
        donations: mockDonations,
        total: stream.monetization?.totalDonations || 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: mockDonations.length,
          pages: 1
        }
      },
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get donations',
      message: error.message,
    });
  }
});

// RECORDING ENDPOINTS

// @route   POST /api/streams/:id/recordings/start
// @desc    Start recording stream
// @access  Private
router.post('/:id/recordings/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to record this stream',
      });
    }

    if (!stream.isLive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start recording - stream is not live',
      });
    }

    // In real app, this would start recording service
    const recording = {
      id: new Date().getTime().toString(),
      streamId: id,
      startedAt: new Date(),
      status: 'recording',
      duration: 0
    };

    res.json({
      success: true,
      data: recording,
      message: 'Recording started successfully'
    });
  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start recording',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/recordings/stop
// @desc    Stop recording stream
// @access  Private
router.post('/:id/recordings/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to stop recording this stream',
      });
    }

    // In real app, this would stop recording service and save file
    const recording = {
      id: new Date().getTime().toString(),
      streamId: id,
      startedAt: new Date(Date.now() - 3600000), // Mock 1 hour ago
      endedAt: new Date(),
      status: 'completed',
      duration: 3600, // 1 hour in seconds
      url: `/recordings/${id}_${Date.now()}.mp4`
    };

    res.json({
      success: true,
      data: recording,
      message: 'Recording stopped successfully'
    });
  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop recording',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/recordings
// @desc    Get stream recordings
// @access  Private
router.get('/:id/recordings', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view recordings',
      });
    }

    // Mock recordings data
    const mockRecordings = [
      {
        id: '1',
        streamId: id,
        title: 'Stream Recording - ' + stream.title,
        startedAt: new Date(Date.now() - 86400000),
        endedAt: new Date(Date.now() - 82800000),
        duration: 3600,
        status: 'completed',
        url: `/recordings/${id}_recording1.mp4`,
        size: 1024 * 1024 * 500 // 500MB
      }
    ];

    res.json({
      success: true,
      data: { recordings: mockRecordings },
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recordings',
      message: error.message,
    });
  }
});

// ANALYTICS EXPORT ENDPOINT

// @route   GET /api/streams/:id/analytics/export
// @desc    Export stream analytics
// @access  Private
router.get('/:id/analytics/export', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json', timeRange = 'all' } = req.query;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to export analytics',
      });
    }

    // Mock analytics export data
    const exportData = {
      streamId: id,
      streamTitle: stream.title,
      exportedAt: new Date(),
      timeRange,
      metrics: {
        totalViews: stream.totalViews,
        peakViewers: Math.max(stream.viewerCount + 100, stream.viewerCount),
        duration: stream.duration,
        totalDonations: stream.monetization?.totalDonations || 0
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvContent = 'Stream ID,Title,Total Views,Peak Viewers,Duration,Total Donations\n' +
        `${id},"${stream.title}",${stream.totalViews},${exportData.metrics.peakViewers},${stream.duration},${exportData.metrics.totalDonations}`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="stream_analytics_${id}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: exportData,
      });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
      message: error.message,
    });
  }
});

// ============================================================================
// REAL-TIME STREAM ENDPOINTS
// ============================================================================

// @route   POST /api/streams/:id/update-health
// @desc    Update stream health metrics (for streaming software integration)
// @access  Private
router.post('/:id/update-health', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bitrate, fps, quality, latency, droppedFrames } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this stream',
      });
    }
    
    // Update health metrics
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      {
        'health.bitrate': bitrate,
        'health.fps': fps,
        'health.quality': quality,
        'health.latency': latency,
        'health.droppedFrames': droppedFrames,
        'health.status': stream.isLive ? 'live' : 'offline'
      },
      { new: true }
    );

    // Broadcast health update via WebSocket if available
    if (global.broadcastToUser) {
      global.broadcastToUser(req.user.userId, 'stream-health-updated', {
        streamId: id,
        health: updatedStream.health
      });
    }

    res.json({
      success: true,
      data: {
        streamId: id,
        health: updatedStream.health
      },
      message: 'Stream health updated successfully'
    });
  } catch (error) {
    console.error('Update stream health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stream health',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/update-viewers
// @desc    Update viewer count manually (backup for WebSocket)
// @access  Private
router.post('/:id/update-viewers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { viewerCount } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this stream',
      });
    }
    
    // Update viewer count
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      {
        viewerCount: Math.max(0, viewerCount),
        peakViewerCount: Math.max(stream.peakViewerCount || 0, viewerCount)
      },
      { new: true }
    );

    // Broadcast viewer update via WebSocket if available
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'stream-viewers-update', {
        streamId: id,
        viewerCount: updatedStream.viewerCount,
        peakViewerCount: updatedStream.peakViewerCount
      });
    }

    res.json({
      success: true,
      data: {
        streamId: id,
        viewerCount: updatedStream.viewerCount,
        peakViewerCount: updatedStream.peakViewerCount
      },
      message: 'Viewer count updated successfully'
    });
  } catch (error) {
    console.error('Update viewer count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update viewer count',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:id/realtime-data
// @desc    Get real-time stream data (for dashboard updates)
// @access  Private
router.get('/:id/realtime-data', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stream = await Stream.findById(id)
      .populate('streamerId', 'username displayName avatar isVerified')
      .lean();
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream or has permission to view
    if (stream.streamerId._id.toString() !== req.user.userId && !stream.isLive) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this stream data',
      });
    }
    
    // Get recent donations
    const StreamDonation = require('../models/StreamDonation');
    const recentDonations = await StreamDonation.find({ streamId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('donorId', 'username displayName avatar')
      .lean();

    // Prepare real-time data
    const realtimeData = {
      streamId: id,
      isLive: stream.isLive,
      viewerCount: stream.viewerCount,
      peakViewerCount: stream.peakViewerCount,
      totalViews: stream.totalViews,
      startedAt: stream.startedAt,
      duration: stream.duration,
      health: stream.health,
      analytics: stream.analytics,
      monetization: {
        ...stream.monetization,
        recentDonations: recentDonations.map(donation => ({
          id: donation._id,
          amount: donation.amount,
          currency: donation.currency,
          message: donation.message,
          isAnonymous: donation.isAnonymous,
          donorUsername: donation.isAnonymous ? 'Anonymous' : donation.donorId?.username,
          donorAvatar: donation.isAnonymous ? null : donation.donorId?.avatar,
          createdAt: donation.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: realtimeData,
    });
  } catch (error) {
    console.error('Get realtime data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime data',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/broadcast-message
// @desc    Broadcast message to all stream viewers
// @access  Private
router.post('/:id/broadcast-message', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, type = 'announcement' } = req.body;
    
    const stream = await Stream.findById(id);
    
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }
    
    // Check if user owns the stream
    if (stream.streamerId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to broadcast to this stream',
      });
    }

    const broadcastData = {
      streamId: id,
      message: message.substring(0, 500), // Limit message length
      type,
      timestamp: new Date().toISOString(),
      fromStreamer: true
    };

    // Broadcast message via WebSocket if available
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'stream-broadcast', broadcastData);
    }

    res.json({
      success: true,
      data: broadcastData,
      message: 'Message broadcast successfully'
    });
  } catch (error) {
    console.error('Broadcast message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message',
      message: error.message,
    });
  }
});

// ENHANCED GIFTS ENDPOINTS

// @route   POST /api/streams/:id/send-gift
// @desc    Send a gift to a streamer
// @access  Private
router.post('/:id/send-gift', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { giftType, message = '', isAnonymous = false } = req.body;
    const userId = req.user.userId;

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Get gift details
    const giftTypes = {
      heart: { name: 'Heart', price: 1, emoji: '❤️' },
      star: { name: 'Star', price: 5, emoji: '⭐' },
      diamond: { name: 'Diamond', price: 10, emoji: '💎' },
      crown: { name: 'Crown', price: 25, emoji: '👑' },
      rocket: { name: 'Rocket', price: 50, emoji: '🚀' },
      unicorn: { name: 'Unicorn', price: 100, emoji: '🦄' },
      rainbow: { name: 'Rainbow', price: 200, emoji: '🌈' },
      fireworks: { name: 'Fireworks', price: 500, emoji: '🎆' }
    };

    const gift = giftTypes[giftType];
    if (!gift) {
      return res.status(400).json({
        success: false,
        error: 'Invalid gift type',
      });
    }

    // Create gift record
    const { StreamGift } = require('../models');
    const streamGift = new StreamGift({
      streamId: id,
      senderId: userId,
      receiverId: stream.streamerId,
      giftType,
      giftName: gift.name,
      giftEmoji: gift.emoji,
      amount: gift.price,
      message,
      isAnonymous
    });

    await streamGift.save();

    // Update stream monetization
    await Stream.findByIdAndUpdate(id, {
      $inc: { 'monetization.totalDonations': gift.price }
    });

    // Broadcast gift event
    if (global.broadcastToFeed) {
      global.broadcastToFeed(`stream-${id}`, 'gift:new', {
        streamId: id,
        senderId: isAnonymous ? null : userId,
        giftType,
        giftName: gift.name,
        giftEmoji: gift.emoji,
        amount: gift.price,
        message,
        isAnonymous,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Gift sent successfully',
      data: { gift: streamGift }
    });
  } catch (error) {
    console.error('Send gift error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send gift',
      message: error.message,
    });
  }
});

// DONATIONS / GIFTS ENDPOINTS
// Note: Donations endpoint already implemented above in DONATIONS ENDPOINTS section

// SUBSCRIPTION ENDPOINTS

// @route   POST /api/streams/:streamerId/subscribe
// @desc    Subscribe to a streamer
// @access  Private
router.post('/:streamerId/subscribe', authenticateToken, async (req, res) => {
  try {
    const { streamerId } = req.params;
    const { tier = 'basic', paymentMethod } = req.body;
    const userId = req.user.userId;

    // Check if streamer exists
    const { User } = require('../models');
    const streamer = await User.findById(streamerId);
    if (!streamer) {
      return res.status(404).json({
        success: false,
        error: 'Streamer not found',
      });
    }

    // Check if already subscribed
    const { Subscription } = require('../models');
    const existingSubscription = await Subscription.findOne({
      subscriberId: userId,
      streamerId,
      isActive: true
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this streamer',
      });
    }

    // Create subscription
    const subscription = new Subscription({
      subscriberId: userId,
      streamerId,
      tier,
      paymentMethod,
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true
    });

    await subscription.save();

    // Update streamer's subscriber count
    await User.findByIdAndUpdate(streamerId, {
      $inc: { subscriberCount: 1 }
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to streamer',
      data: subscription
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
      message: error.message,
    });
  }
});

// @route   DELETE /api/streams/:streamerId/subscribe
// @desc    Unsubscribe from a streamer
// @access  Private
router.delete('/:streamerId/subscribe', authenticateToken, async (req, res) => {
  try {
    const { streamerId } = req.params;
    const userId = req.user.userId;

    const { Subscription } = require('../models');
    const subscription = await Subscription.findOne({
      subscriberId: userId,
      streamerId,
      isActive: true
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
      });
    }

    // Deactivate subscription
    subscription.isActive = false;
    subscription.endDate = new Date();
    await subscription.save();

    // Update streamer's subscriber count
    const { User } = require('../models');
    await User.findByIdAndUpdate(streamerId, {
      $inc: { subscriberCount: -1 }
    });

    res.json({
      success: true,
      message: 'Successfully unsubscribed from streamer',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe',
      message: error.message,
    });
  }
});

// @route   GET /api/streams/:streamerId/subscription-status
// @desc    Check subscription status
// @access  Private
router.get('/:streamerId/subscription-status', authenticateToken, async (req, res) => {
  try {
    const { streamerId } = req.params;
    const userId = req.user.userId;

    const { Subscription } = require('../models');
    const subscription = await Subscription.findOne({
      subscriberId: userId,
      streamerId,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        isSubscribed: !!subscription,
        subscription: subscription || null
      }
    });
  } catch (error) {
    console.error('Check subscription status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check subscription status',
      message: error.message,
    });
  }
});

// STREAM INTERACTIONS ENDPOINTS

// @route   POST /api/streams/:id/like
// @desc    Like a stream
// @access  Private
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Check if user already liked this stream
    const existingLike = stream.likes?.includes(userId);

    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: 'Stream already liked',
      });
    }

    // Add like
    await Stream.findByIdAndUpdate(id, {
      $addToSet: { likes: userId },
      $inc: { 'analytics.totalLikes': 1 }
    });

    res.json({
      success: true,
      message: 'Stream liked successfully',
    });
  } catch (error) {
    console.error('Like stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like stream',
      message: error.message,
    });
  }
});

// @route   DELETE /api/streams/:id/like
// @desc    Unlike a stream
// @access  Private
router.delete('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Remove like
    await Stream.findByIdAndUpdate(id, {
      $pull: { likes: userId },
      $inc: { 'analytics.totalLikes': -1 }
    });

    res.json({
      success: true,
      message: 'Stream unliked successfully',
    });
  } catch (error) {
    console.error('Unlike stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike stream',
      message: error.message,
    });
  }
});

// @route   POST /api/streams/:id/report
// @desc    Report a stream
// @access  Private
router.post('/:id/report', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.userId;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Report reason is required',
      });
    }

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Check if user already reported this stream
    const existingReport = stream.reports?.some(report =>
      report.reporterId?.toString() === userId
    );

    if (existingReport) {
      return res.status(400).json({
        success: false,
        error: 'Stream already reported by this user',
      });
    }

    // Add report
    const report = {
      reporterId: userId,
      reason,
      description: description || '',
      reportedAt: new Date(),
      status: 'pending'
    };

    await Stream.findByIdAndUpdate(id, {
      $push: { reports: report }
    });

    res.json({
      success: true,
      message: 'Stream reported successfully',
    });
  } catch (error) {
    console.error('Report stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report stream',
      message: error.message,
    });
  }
});

// STREAM SCHEDULING ENDPOINTS

// @route   POST /api/streams/:id/schedule
// @desc    Schedule a stream
// @access  Private
router.post('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, title, description, category, tags } = req.body;
    const userId = req.user.userId;

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Check if user owns the stream
    if (stream.streamerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to schedule this stream',
      });
    }

    // Update stream with schedule
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      {
        isScheduled: true,
        scheduledAt: new Date(scheduledAt),
        title: title || stream.title,
        description: description || stream.description,
        category: category || stream.category,
        tags: tags || stream.tags
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Stream scheduled successfully',
      data: updatedStream
    });
  } catch (error) {
    console.error('Schedule stream error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule stream',
      message: error.message,
    });
  }
});

// @route   DELETE /api/streams/:id/schedule
// @desc    Cancel scheduled stream
// @access  Private
router.delete('/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found',
      });
    }

    // Check if user owns the stream
    if (stream.streamerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this stream schedule',
      });
    }

    // Remove schedule
    const updatedStream = await Stream.findByIdAndUpdate(
      id,
      {
        isScheduled: false,
        scheduledAt: null
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Stream schedule cancelled successfully',
      data: updatedStream
    });
  } catch (error) {
    console.error('Cancel schedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel schedule',
      message: error.message,
    });
  }
});

module.exports = router;

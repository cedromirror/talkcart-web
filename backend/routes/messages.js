const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Conversation, Message, User } = require('../models');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Messages service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Legacy endpoint for backward compatibility
// @route   GET /api/messages?conversation=:conversationId
// @desc    Get messages for a conversation (legacy format)
// @access  Private
router.get('/', authenticateTokenStrict, async (req, res) => {
  try {
    const { conversation: conversationId, limit = 50, page = 1, before } = req.query;
    const userId = req.user.userId;

    // If no conversation parameter, return conversations list
    if (!conversationId) {
      return res.redirect('/api/messages/conversations');
    }

    console.log(`Legacy endpoint: Fetching messages for conversation: ${conversationId}, user: ${userId}`);

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Redirect to the proper endpoint
    const redirectUrl = `/api/messages/conversations/${conversationId}/messages`;
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    if (page) queryParams.append('page', page.toString());
    if (before) queryParams.append('before', before.toString());

    const queryString = queryParams.toString();
    const finalUrl = queryString ? `${redirectUrl}?${queryString}` : redirectUrl;

    console.log(`Redirecting legacy request to: ${finalUrl}`);
    return res.redirect(307, finalUrl); // 307 preserves the HTTP method
  } catch (error) {
    console.error('Legacy messages endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
});

// Conversation and Message models are imported from ../models

// @route   GET /api/messages/conversations
// @desc    Get user conversations
// @access  Private
router.get('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const userId = req.user.userId;

    console.log(`Fetching conversations for user: ${userId}`);

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get conversations where user is a participant (simplified for debugging)
    const conversations = await Conversation.find({
      participants: { $in: [userId] },
      isActive: true
    })
      .populate({
        path: 'participants',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'lastMessage',
        select: 'content type senderId createdAt'
      })
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    console.log(`Found ${conversations.length} conversations for user ${userId}`);

    // Get total count
    const total = await Conversation.countDocuments({
      participants: { $in: [userId] },
      isActive: true
    });

    // Transform data and calculate unread counts
    const transformedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        try {
          // Get unread message count for this user
          const unreadCount = await Message.countDocuments({
            conversationId: conversation._id,
            senderId: { $ne: userId },
            'readBy.userId': { $ne: userId },
            isDeleted: false
          });

          // Filter out current user from participants for display
          const otherParticipants = (conversation.participants || []).filter(
            p => p && p._id && p._id.toString() !== userId
          );

          // Ensure we have valid participants
          const validParticipants = otherParticipants.map(p => ({
            id: p._id,
            username: p.username || 'Unknown User',
            displayName: p.displayName || p.username || 'Unknown User',
            avatar: p.avatar || null,
            isVerified: p.isVerified || false
          }));

          return {
            id: conversation._id.toString(),
            participants: validParticipants,
            lastMessage: conversation.lastMessage ? {
              id: conversation.lastMessage._id.toString(),
              content: conversation.lastMessage.content,
              type: conversation.lastMessage.type,
              senderId: conversation.lastMessage.senderId.toString(),
              createdAt: conversation.lastMessage.createdAt
            } : null,
            unreadCount,
            isGroup: conversation.isGroup || false,
            groupName: conversation.groupName || null,
            groupDescription: conversation.groupDescription || null,
            isEncrypted: true, // Default to encrypted for security
            lastActivity: conversation.lastActivity
          };
        } catch (convError) {
          console.error('Error processing conversation:', convError);
          return null;
        }
      })
    );

    // Filter out any null conversations from errors
    const validConversations = transformedConversations.filter(conv => conv !== null);

    res.json({
      success: true,
      data: {
        conversations: validConversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/conversations
// @desc    Create new conversation
// @access  Private
router.post('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    const { participantIds, isGroup = false, groupName, groupDescription } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Participant IDs are required',
      });
    }

    if (isGroup && !groupName) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required for group conversations',
      });
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([userId, ...participantIds])];

    // For group conversations, simplified privacy check
    if (isGroup) {
      // Get all participants to verify they exist
      const participants = await User.find({
        _id: { $in: participantIds }
      }).select('username displayName');

      if (participants.length !== participantIds.length) {
        return res.status(404).json({
          success: false,
          error: 'One or more users not found',
        });
      }
    }

    // For direct messages, check privacy settings
    if (!isGroup && allParticipants.length === 2) {
      // Get the other participant's privacy settings
      const otherParticipantId = participantIds[0];
      const otherParticipant = await User.findById(otherParticipantId);

      if (!otherParticipant) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check if the other user allows direct messages (simplified for debugging)
      const allowDirectMessages = otherParticipant.settings?.privacy?.allowDirectMessages;
      if (allowDirectMessages === false) {
        return res.status(403).json({
          success: false,
          error: 'This user has disabled direct messages',
        });
      }
    }

    // For direct messages, check if conversation already exists
    if (!isGroup && allParticipants.length === 2) {
      const existingConversation = await Conversation.findOne({
        participants: { $all: allParticipants, $size: 2 },
        isGroup: false,
        isActive: true
      }).populate('participants', 'username displayName avatar isVerified');

      if (existingConversation) {
        const otherParticipants = existingConversation.participants.filter(
          p => p._id.toString() !== userId
        );

        return res.json({
          success: true,
          data: {
            ...existingConversation.toObject(),
            id: existingConversation._id,
            participants: otherParticipants.map(p => ({
              id: p._id,
              username: p.username,
              displayName: p.displayName,
              avatar: p.avatar,
              isVerified: p.isVerified
            })),
            unreadCount: 0
          },
          message: 'Conversation already exists'
        });
      }
    }

    // Create new conversation
    const newConversation = new Conversation({
      participants: allParticipants,
      isGroup,
      groupName: isGroup ? groupName.trim() : undefined,
      groupDescription: isGroup ? groupDescription?.trim() : undefined,
      adminId: isGroup ? userId : undefined,
      lastActivity: new Date()
    });

    await newConversation.save();

    // Populate participant data
    await newConversation.populate('participants', 'username displayName avatar isVerified');

    const otherParticipants = newConversation.participants.filter(
      p => p._id.toString() !== userId
    );

    const responseData = {
      ...newConversation.toObject(),
      id: newConversation._id,
      participants: otherParticipants.map(p => ({
        id: p._id,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar,
        isVerified: p.isVerified
      })),
      lastMessage: null,
      unreadCount: 0
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      message: error.message,
    });
  }
});

// @route   GET /api/messages/conversations/:id
// @desc    Get a specific conversation
// @access  Private
router.get('/conversations/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Find the conversation and ensure the requesting user is a participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [userId] },
      isActive: true
    })
      .populate({
        path: 'participants',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'lastMessage',
        select: 'content type senderId createdAt'
      })
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // Compute unread count for this user
    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId },
      isDeleted: false
    });

    // Exclude current user from participants for display (consistent with list API)
    const otherParticipants = (conversation.participants || []).filter(
      p => p && p._id && p._id.toString() !== userId
    );

    const responseData = {
      id: conversation._id.toString(),
      participants: otherParticipants.map(p => ({
        id: p._id,
        username: p.username || 'Unknown User',
        displayName: p.displayName || p.username || 'Unknown User',
        avatar: p.avatar || null,
        isVerified: p.isVerified || false
      })),
      lastMessage: conversation.lastMessage ? {
        id: conversation.lastMessage._id.toString(),
        content: conversation.lastMessage.content,
        type: conversation.lastMessage.type,
        senderId: conversation.lastMessage.senderId.toString(),
        createdAt: conversation.lastMessage.createdAt
      } : null,
      unreadCount,
      isGroup: conversation.isGroup || false,
      groupName: conversation.groupName || null,
      groupDescription: conversation.groupDescription || null,
      groupAvatar: conversation.groupAvatar || null,
      isEncrypted: conversation.isEncrypted === true,
      lastActivity: conversation.lastActivity,
      settings: {
        allowInvites: conversation.settings?.allowInvites ?? true,
        muteNotifications: conversation.settings?.muteNotifications ?? false
      }
    };

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      message: error.message,
    });
  }
});

// @route   GET /api/messages/conversations/:id/messages
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, before } = req.query;
    const userId = req.user.userId;

    console.log(`Fetching messages for conversation: ${id}, user: ${userId}`);

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [userId] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // Build query
    let query = {
      conversationId: id,
      isDeleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await Message.find(query)
      .populate({
        path: 'senderId',
        select: 'username displayName avatar isVerified',
        match: { isActive: true }
      })
      .populate({
        path: 'replyTo',
        select: 'content senderId type createdAt',
        populate: {
          path: 'senderId',
          select: 'username displayName'
        }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    console.log(`Found ${messages.length} messages for conversation ${id}`);

    // Get total count
    const total = await Message.countDocuments(query);

    // Transform data with better error handling
    const transformedMessages = messages.map(message => {
      try {
        // Handle case where sender might be null (deleted user)
        const sender = message.senderId || {};

        return {
          id: message._id.toString(),
          senderId: sender._id ? sender._id.toString() : 'unknown',
          content: message.content,
          type: message.type || 'text',
          createdAt: message.createdAt,
          readBy: (message.readBy || []).map(read => ({
            userId: read.userId.toString(),
            readAt: read.readAt
          })),
          replyTo: message.replyTo ? {
            id: message.replyTo._id.toString(),
            content: message.replyTo.content,
            senderId: message.replyTo.senderId ? message.replyTo.senderId.toString() : 'unknown',
            type: message.replyTo.type || 'text'
          } : null,
          media: message.media ? [{
            type: message.media.resource_type || 'file',
            url: message.media.secure_url || message.media.url,
            filename: message.media.public_id
          }] : [],
          sender: {
            id: sender._id ? sender._id.toString() : 'unknown',
            username: sender.username || 'Unknown User',
            displayName: sender.displayName || sender.username || 'Unknown User',
            avatar: sender.avatar || null,
            isVerified: sender.isVerified || false
          },
          isOwn: sender._id ? sender._id.toString() === userId : false,
          isRead: (message.readBy || []).some(read => read.userId.toString() === userId)
        };
      } catch (msgError) {
        console.error('Error processing message:', msgError);
        return null;
      }
    }).filter(msg => msg !== null); // Filter out any null messages from errors

    res.json({
      success: true,
      data: {
        messages: transformedMessages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/conversations/:id/messages
// @desc    Send message in conversation
// @access  Private
router.post('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'text', media, replyTo } = req.body;
    const userId = req.user.userId;

    // Validation: allow media-only messages
    const hasContent = !!content && content.trim().length > 0;
    const hasMedia = !!media;
    if (!hasContent && !hasMedia) {
      return res.status(400).json({
        success: false,
        error: 'Message content or media is required',
      });
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Check if user is participant in conversation (simplified)
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [userId] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // Create new message
    const newMessage = new Message({
      conversationId: id,
      senderId: userId,
      content: hasContent ? content.trim() : '',
      type,
      media,
      replyTo,
      readBy: [{ userId, readAt: new Date() }] // Mark as read by sender
    });

    await newMessage.save();

    // Update conversation's last message and activity
    await Conversation.findByIdAndUpdate(id, {
      lastMessage: newMessage._id,
      lastActivity: new Date()
    });

    // Populate sender data
    await newMessage.populate('senderId', 'username displayName avatar isVerified');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${id}`).emit('message:new', {
        conversationId: id,
        message: {
          id: newMessage._id.toString(),
          content: newMessage.content,
          type: newMessage.type,
          senderId: userId,
          conversationId: id,
          createdAt: newMessage.createdAt,
          isEdited: false,
          isDeleted: false,
          isForwarded: newMessage.isForwarded || false,
          media: newMessage.media ? [{
            type: newMessage.media.resource_type || 'file',
            url: newMessage.media.secure_url || newMessage.media.url,
            filename: newMessage.media.public_id
          }] : [],
          reactions: [],
          readBy: newMessage.readBy.map(read => ({
            userId: read.userId.toString(),
            readAt: read.readAt
          })),
          replyTo: newMessage.replyTo || null,
          sender: {
            id: newMessage.senderId._id.toString(),
            username: newMessage.senderId.username,
            displayName: newMessage.senderId.displayName,
            avatar: newMessage.senderId.avatar,
            isVerified: newMessage.senderId.isVerified
          },
          isOwn: false, // Will be determined on the client side
          isRead: false // Will be determined on the client side
        }
      });
    }

    const responseData = {
      ...newMessage.toObject(),
      id: newMessage._id,
      sender: {
        id: newMessage.senderId._id,
        username: newMessage.senderId.username,
        displayName: newMessage.senderId.displayName,
        avatar: newMessage.senderId.avatar,
        isVerified: newMessage.senderId.isVerified
      },
      isOwn: true,
      isRead: true
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message,
    });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is participant in the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Add read receipt if not already read
    const alreadyRead = message.readBy.some(read => read.userId.toString() === userId);

    if (!alreadyRead) {
      message.readBy.push({ userId, readAt: new Date() });
      await message.save();

      // Emit socket event for real-time read receipt updates
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${message.conversationId}`).emit('message:read', {
          messageId: id,
          userId,
          readAt: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/conversations/:id/members
// @desc    Add members to group conversation
// @access  Private
router.post('/conversations/:id/members', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Member IDs are required',
      });
    }

    // Check if conversation exists and user is admin or participant
    const conversation = await Conversation.findOne({
      _id: id,
      isGroup: true,
      isActive: true
    }).populate('participants', 'username displayName avatar isVerified');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Group conversation not found',
      });
    }

    // Check if user is admin or participant
    const isAdmin = conversation.adminId?.toString() === userId;
    const isParticipant = conversation.participants.some(p => p._id.toString() === userId);

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You must be a group member to add others.',
      });
    }

    // Check if new members allow group invites
    const newMembers = await User.find({
      _id: { $in: memberIds }
    }).select('settings.privacy.allowGroupInvites username displayName');

    const membersWhoDisallowGroups = newMembers.filter(
      m => !m.settings?.privacy?.allowGroupInvites
    );

    if (membersWhoDisallowGroups.length > 0) {
      const disallowedNames = membersWhoDisallowGroups
        .map(m => m.displayName || m.username)
        .join(', ');

      return res.status(403).json({
        success: false,
        error: `The following users have disabled group invites: ${disallowedNames}`,
      });
    }

    // Filter out members who are already in the group
    const existingParticipantIds = conversation.participants.map(p => p._id.toString());
    const newMemberIds = memberIds.filter(id => !existingParticipantIds.includes(id));

    if (newMemberIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'All specified users are already group members',
      });
    }

    // Add new members to the group
    conversation.participants.push(...newMemberIds);
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate the updated conversation
    await conversation.populate('participants', 'username displayName avatar isVerified');

    const responseData = {
      ...conversation.toObject(),
      id: conversation._id,
      participants: conversation.participants.map(p => ({
        id: p._id,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar,
        isVerified: p.isVerified
      }))
    };

    res.json({
      success: true,
      data: responseData,
      message: `${newMemberIds.length} member(s) added to group successfully`
    });

  } catch (error) {
    console.error('Add group members error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add group members',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/:id/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/:id/reactions', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    if (!emoji || emoji.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Emoji is required',
      });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is participant in the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove existing reaction
      message.reactions = message.reactions.filter(
        r => !(r.userId.toString() === userId && r.emoji === emoji)
      );
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    res.json({
      success: true,
      data: {
        messageId: id,
        reactions: message.reactions
      },
      message: existingReaction ? 'Reaction removed' : 'Reaction added'
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add reaction',
      message: error.message,
    });
  }
});

// @route   PUT /api/messages/:id/edit
// @desc    Edit message
// @access  Private
router.put('/:id/edit', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own messages',
      });
    }

    // Check if message is not too old (24 hours limit)
    const messageAge = Date.now() - message.createdAt.getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours

    if (messageAge > maxEditAge) {
      return res.status(403).json({
        success: false,
        error: 'Message is too old to edit',
      });
    }

    // Save original content to edit history
    if (!message.editHistory) {
      message.editHistory = [];
    }
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });

    // Update message
    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    await message.populate('senderId', 'username displayName avatar isVerified');

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit('message:edited', {
        messageId: message._id.toString(),
        content: message.content,
        isEdited: true,
        editedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        ...message.toObject(),
        id: message._id
      },
      message: 'Message edited successfully'
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit message',
      message: error.message,
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete message
// @access  Private
router.delete('/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user is the sender or admin of group conversation
    const conversation = await Conversation.findById(message.conversationId);
    const isOwner = message.senderId.toString() === userId;
    const isGroupAdmin = conversation.isGroup && conversation.adminId && conversation.adminId.toString() === userId;

    if (!isOwner && !isGroupAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages',
      });
    }

    // Soft delete - mark as deleted instead of removing
    message.isDeleted = true;
    message.content = 'This message was deleted';
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/:id/forward
// @desc    Forward message to other conversations
// @access  Private
router.post('/:id/forward', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { conversationIds, message: forwardMessage } = req.body;
    const userId = req.user.userId;

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one conversation ID is required',
      });
    }

    // Find the original message
    const originalMessage = await Message.findById(id);
    if (!originalMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
      });
    }

    // Check if user has access to the original message
    const originalConversation = await Conversation.findOne({
      _id: originalMessage.conversationId,
      participants: userId,
      isActive: true
    });

    if (!originalConversation) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to original message',
      });
    }

    // Validate access to all target conversations
    const targetConversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: userId,
      isActive: true
    });

    if (targetConversations.length !== conversationIds.length) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to one or more target conversations',
      });
    }

    // Create forwarded messages
    const forwardedMessages = [];

    for (const conversation of targetConversations) {
      const forwardedMessage = new Message({
        conversationId: conversation._id,
        senderId: userId,
        content: originalMessage.content,
        type: originalMessage.type,
        media: originalMessage.media,
        isForwarded: true,
        forwardedFrom: {
          messageId: originalMessage._id,
          conversationId: originalMessage.conversationId,
          originalSenderId: originalMessage.senderId
        },
        readBy: [{ userId, readAt: new Date() }]
      });

      await forwardedMessage.save();

      // Update conversation's last message
      conversation.lastMessage = forwardedMessage._id;
      conversation.lastActivity = new Date();
      await conversation.save();

      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${conversation._id}`).emit('message:new', {
          conversationId: conversation._id.toString(),
          message: {
            id: forwardedMessage._id.toString(),
            content: forwardedMessage.content,
            type: forwardedMessage.type,
            senderId: userId,
            createdAt: forwardedMessage.createdAt,
            media: forwardedMessage.media || [],
            isForwarded: true,
            forwardedFrom: forwardedMessage.forwardedFrom
          }
        });
      }

      forwardedMessages.push(forwardedMessage);
    }

    // If user included a message with the forward, send that too
    if (forwardMessage && forwardMessage.trim().length > 0) {
      for (const conversation of targetConversations) {
        const additionalMessage = new Message({
          conversationId: conversation._id,
          senderId: userId,
          content: forwardMessage.trim(),
          type: 'text',
          readBy: [{ userId, readAt: new Date() }]
        });

        await additionalMessage.save();

        // Update conversation's last message
        conversation.lastMessage = additionalMessage._id;
        conversation.lastActivity = new Date();
        await conversation.save();
      }
    }

    res.json({
      success: true,
      message: `Message forwarded to ${conversationIds.length} conversation(s)`,
      data: {
        forwardedCount: conversationIds.length,
        messageIds: forwardedMessages.map(m => m._id)
      }
    });

  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to forward message',
      message: error.message,
    });
  }
});

// @route   GET /api/messages/conversations/:id/search
// @desc    Search messages in conversation
// @access  Private
router.get('/conversations/:id/search', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { q, limit = 20, page = 1 } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      conversationId: id,
      content: searchRegex,
      isDeleted: false
    })
      .populate('senderId', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Message.countDocuments({
      conversationId: id,
      content: searchRegex,
      isDeleted: false
    });

    const transformedMessages = messages.map(message => ({
      ...message,
      id: message._id.toString()
    }));

    res.json({
      success: true,
      data: {
        messages: transformedMessages,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        query: q.trim()
      }
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages',
      message: error.message,
    });
  }
});

// @route   DELETE /api/messages/conversations/:id/members/:userId
// @desc    Remove member from group conversation
// @access  Private
router.delete('/conversations/:id/members/:userId', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, userId: memberToRemove } = req.params;
    const userId = req.user.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
      isGroup: true,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Group conversation not found or access denied',
      });
    }

    // Check if user is admin or removing themselves
    const isAdmin = conversation.adminId && conversation.adminId.toString() === userId;
    const isRemovingSelf = memberToRemove === userId;

    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({
        success: false,
        error: 'Only group admins can remove members',
      });
    }

    // Check if member exists in group
    const memberIndex = conversation.participants.findIndex(
      p => p.toString() === memberToRemove
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in group',
      });
    }

    // Remove member
    conversation.participants.splice(memberIndex, 1);
    conversation.lastActivity = new Date();
    await conversation.save();

    // If admin left, assign new admin (first remaining member)
    if (isRemovingSelf && isAdmin && conversation.participants.length > 0) {
      conversation.adminId = conversation.participants[0];
      await conversation.save();
    }

    await conversation.populate('participants', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: {
        ...conversation.toObject(),
        id: conversation._id,
        participants: conversation.participants.map(p => ({
          id: p._id,
          username: p.username,
          displayName: p.displayName,
          avatar: p.avatar,
          isVerified: p.isVerified
        }))
      },
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
      message: error.message,
    });
  }
});

// @route   PUT /api/messages/conversations/:id/settings
// @desc    Update conversation settings
// @access  Private
router.put('/conversations/:id/settings', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { groupName, groupDescription, allowInvites, muteNotifications, isEncrypted } = req.body;
    const userId = req.user.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // For group settings, check if user is admin
    if (conversation.isGroup && (groupName !== undefined || groupDescription !== undefined || allowInvites !== undefined)) {
      if (!conversation.adminId || conversation.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only group admins can modify group settings',
        });
      }
    }

    // Update settings
    if (groupName !== undefined && conversation.isGroup) {
      conversation.groupName = groupName.trim();
    }
    if (groupDescription !== undefined && conversation.isGroup) {
      conversation.groupDescription = groupDescription.trim();
    }
    if (allowInvites !== undefined) {
      conversation.settings.allowInvites = allowInvites;
    }
    if (muteNotifications !== undefined) {
      conversation.settings.muteNotifications = muteNotifications;
    }
    if (isEncrypted !== undefined) {
      conversation.isEncrypted = isEncrypted;
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    await conversation.populate('participants', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: {
        ...conversation.toObject(),
        id: conversation._id,
        participants: conversation.participants.map(p => ({
          id: p._id,
          username: p.username,
          displayName: p.displayName,
          avatar: p.avatar,
          isVerified: p.isVerified
        }))
      },
      message: 'Conversation settings updated successfully'
    });

  } catch (error) {
    console.error('Update conversation settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation settings',
      message: error.message,
    });
  }
});

// @route   POST /api/messages/conversations/:id/typing
// @desc    Send typing indicator
// @access  Private
router.post('/conversations/:id/typing', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { isTyping = true } = req.body;
    const userId = req.user.userId;

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // In a real implementation, this would emit a socket event
    // For now, just return success
    res.json({
      success: true,
      data: {
        conversationId: id,
        userId,
        isTyping
      },
      message: 'Typing indicator sent'
    });

  } catch (error) {
    console.error('Typing indicator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send typing indicator',
      message: error.message,
    });
  }
});

// @route   PUT /api/messages/conversations/:id/read
// @desc    Mark all messages in conversation as read
// @access  Private
router.put('/conversations/:id/read', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied',
      });
    }

    // Find all unread messages in the conversation
    const unreadMessages = await Message.find({
      conversationId: id,
      'readBy.userId': { $ne: userId },
      senderId: { $ne: userId } // Don't mark own messages as read
    });

    // Mark all unread messages as read
    const bulkOps = unreadMessages.map(message => ({
      updateOne: {
        filter: { _id: message._id },
        update: {
          $push: {
            readBy: {
              userId,
              readAt: new Date()
            }
          }
        }
      }
    }));

    if (bulkOps.length > 0) {
      await Message.bulkWrite(bulkOps);

      // Emit socket events for each message marked as read
      const io = req.app.get('io');
      if (io) {
        unreadMessages.forEach(message => {
          io.to(`conversation_${id}`).emit('message:read', {
            messageId: message._id.toString(),
            userId,
            readAt: new Date().toISOString()
          });
        });
      }
    }

    // Update conversation unread count
    await Conversation.updateOne(
      { _id: id },
      { $set: { [`unreadCounts.${userId}`]: 0 } }
    );

    res.json({
      success: true,
      data: {
        markedCount: bulkOps.length
      },
      message: 'All messages marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all messages as read',
      message: error.message,
    });
  }
});

module.exports = router;
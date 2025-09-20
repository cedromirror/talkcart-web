const { Stream } = require('../models');

// Loads stream by :id and attaches to req.stream
async function loadStream(req, res, next) {
  try {
    const { id } = req.params;
    const stream = await Stream.findById(id);
    if (!stream) {
      return res.status(404).json({ success: false, error: 'Stream not found' });
    }
    req.stream = stream;
    next();
  } catch (err) {
    console.error('loadStream error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load stream', message: err.message });
  }
}

// Requires that chat is enabled for the current stream
function requireChatAllowed(req, res, next) {
  const stream = req.stream;
  if (!stream?.settings?.allowChat) {
    return res.status(403).json({ success: false, error: 'Chat is disabled for this stream' });
  }
  next();
}

// Blocks users who are banned or timed out; returns retryAfterSeconds for timeouts
function enforceNotBannedOrTimedOut(req, res, next) {
  try {
    const stream = req.stream;
    const userId = String(req.user?.userId || '');
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const now = new Date();
    const moderation = stream.moderation || {};

    const activeBan = (moderation.bannedUsers || []).find(b => String(b.userId) === userId && (!b.until || b.until > now));
    if (activeBan) {
      return res.status(403).json({
        success: false,
        error: 'You are banned from this chat',
        bannedUntil: activeBan.until || null,
      });
    }

    const activeTimeout = (moderation.timeouts || []).find(t => String(t.userId) === userId && t.until > now);
    if (activeTimeout) {
      const retryAfterSeconds = Math.max(1, Math.ceil((activeTimeout.until.getTime() - now.getTime()) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: 'You are currently timed out from chatting',
        retryAfterSeconds,
        timeoutUntil: activeTimeout.until,
      });
    }

    return next();
  } catch (err) {
    console.error('enforceNotBannedOrTimedOut error:', err);
    return res.status(500).json({ success: false, error: 'Moderation check failed', message: err.message });
  }
}

// Requires requester to be the streamer (owner) or a moderator
function requireStreamerOrModerator(req, res, next) {
  const stream = req.stream;
  const userId = String(req.user?.userId || '');
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const isOwner = String(stream.streamerId) === userId;
  const isModerator = (stream.moderators || []).some(m => String(m.userId) === userId);
  if (!isOwner && !isModerator) {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }
  return next();
}

module.exports = {
  loadStream,
  requireChatAllowed,
  enforceNotBannedOrTimedOut,
  requireStreamerOrModerator,
};
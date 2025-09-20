// Periodic cleanup for expired timeouts and temporary bans
// Run via: node backend/scripts/cleanupExpiredModeration.js

const mongoose = require('mongoose');
const { Stream } = require('../models');
const { MONGODB_URI } = require('../config/database');

async function run() {
  try {
    // Use same connection URI as the app
    const uri = process.env.MONGODB_URI || MONGODB_URI;
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });

    const now = new Date();

    // Remove expired timeouts
    const timeoutResult = await Stream.updateMany(
      { 'moderation.timeouts.until': { $lte: now } },
      { $pull: { 'moderation.timeouts': { until: { $lte: now } } } }
    );

    // Remove expired temporary bans (keep permanent bans where until == null)
    const bansResult = await Stream.updateMany(
      { 'moderation.bannedUsers.until': { $ne: null, $lte: now } },
      { $pull: { 'moderation.bannedUsers': { until: { $ne: null, $lte: now } } } }
    );

    console.log('Cleanup complete:', {
      timeoutsMatched: timeoutResult.matchedCount || timeoutResult.n,
      timeoutsModified: timeoutResult.modifiedCount || timeoutResult.nModified,
      bansMatched: bansResult.matchedCount || bansResult.n,
      bansModified: bansResult.modifiedCount || bansResult.nModified,
    });
  } catch (err) {
    console.error('Cleanup script failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
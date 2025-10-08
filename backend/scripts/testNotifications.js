/**
 * Test script for notification system
 * This script tests the notification service functionality
 */

const mongoose = require('mongoose');
const NotificationService = require('../services/notificationService');
const { User, Post, Follow, Comment } = require('../models');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test users
const testUsers = [
  {
    username: 'testuser1',
    email: 'testuser1@example.com',
    displayName: 'Test User 1'
  },
  {
    username: 'testuser2',
    email: 'testuser2@example.com',
    displayName: 'Test User 2'
  }
];

// Test post
const testPost = {
  content: 'This is a test post for notification testing',
  type: 'text'
};

async function runTests() {
  try {
    // Connect to database
    await connectDB();

    // Create test users
    console.log('Creating test users...');
    const users = [];
    for (const userData of testUsers) {
      let user = await User.findOne({ username: userData.username });
      if (!user) {
        user = new User({
          ...userData,
          password: 'testpassword123'
        });
        await user.save();
        console.log(`Created user: ${user.username}`);
      } else {
        console.log(`User already exists: ${user.username}`);
      }
      users.push(user);
    }

    // Create test post
    console.log('Creating test post...');
    let post = await Post.findOne({ content: testPost.content });
    if (!post) {
      post = new Post({
        ...testPost,
        author: users[0]._id
      });
      await post.save();
      console.log(`Created post with ID: ${post._id}`);
    } else {
      console.log(`Post already exists with ID: ${post._id}`);
    }

    // Test follow notification
    console.log('Testing follow notification...');
    const followNotification = await NotificationService.createFollowNotification(
      users[1]._id.toString(),
      users[0]._id.toString()
    );
    console.log('Follow notification created:', followNotification ? 'Success' : 'Skipped (self-notification)');

    // Test like notification
    console.log('Testing like notification...');
    const likeNotification = await NotificationService.createLikeNotification(
      users[1]._id.toString(),
      users[0]._id.toString(),
      post._id.toString(),
      post.content
    );
    console.log('Like notification created:', likeNotification ? 'Success' : 'Skipped (self-notification)');

    // Test comment notification
    console.log('Testing comment notification...');
    const commentNotification = await NotificationService.createCommentNotification(
      users[1]._id.toString(),
      users[0]._id.toString(),
      post._id.toString(),
      'This is a test comment'
    );
    console.log('Comment notification created:', commentNotification ? 'Success' : 'Skipped (self-notification)');

    // Test message notification with a valid ObjectId
    console.log('Testing message notification...');
    const messageNotification = await NotificationService.createMessageNotification(
      users[1]._id.toString(),
      users[0]._id.toString(),
      post._id.toString(), // Using post ID as conversation ID for testing
      'Hello, this is a test message'
    );
    console.log('Message notification created:', messageNotification ? 'Success' : 'Skipped (self-notification)');

    // Test getting user notifications
    console.log('Testing get user notifications...');
    const userNotifications = await NotificationService.getUserNotifications(users[0]._id.toString());
    console.log(`Retrieved ${userNotifications.notifications.length} notifications for user ${users[0].username}`);

    // Test getting unread count
    console.log('Testing get unread count...');
    const unreadCount = await NotificationService.getUnreadCount(users[0]._id.toString());
    console.log(`User ${users[0].username} has ${unreadCount} unread notifications`);

    // Test marking notifications as read
    console.log('Testing mark notifications as read...');
    if (userNotifications.notifications.length > 0) {
      const notificationIds = userNotifications.notifications.slice(0, 2).map(n => n._id.toString());
      const markResult = await NotificationService.markAsRead(notificationIds, users[0]._id.toString());
      console.log(`Marked ${markResult.modifiedCount} notifications as read`);
    }

    // Test marking all notifications as read
    console.log('Testing mark all notifications as read...');
    const markAllResult = await NotificationService.markAllAsRead(users[0]._id.toString());
    console.log(`Marked all notifications as read for user ${users[0].username}`);

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
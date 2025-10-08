/**
 * Test script for notification data mapping
 * This script tests that the notification data is correctly mapped between backend and frontend
 */

const mongoose = require('mongoose');
const { User, Notification } = require('../models');

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

async function testNotificationMapping() {
  try {
    // Connect to database
    await connectDB();

    // Create test users
    console.log('Creating test users...');
    const user1 = await User.findOne({ username: 'testuser1' });
    const user2 = await User.findOne({ username: 'testuser2' });
    
    if (!user1 || !user2) {
      console.log('Test users not found. Please run the main test script first.');
      return;
    }

    // Create a test notification
    console.log('Creating test notification...');
    const notificationData = {
      recipient: user1._id,
      sender: user2._id,
      type: 'like',
      title: 'New Like',
      message: 'User2 liked your post',
      data: {
        postId: 'test-post-id'
      },
      priority: 'normal'
    };

    const notification = await Notification.createNotification(notificationData);
    console.log('Created notification:', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt
    });

    // Test fetching notifications
    console.log('Fetching notifications...');
    const userNotifications = await Notification.getUserNotifications(user1._id.toString());
    console.log('Fetched notifications:', userNotifications.notifications.map(n => ({
      id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt
    })));

    console.log('Test completed successfully!');
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
  testNotificationMapping();
}

module.exports = { testNotificationMapping };
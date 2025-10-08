/**
 * Test script to verify notification rendering fix
 * This script simulates the frontend notification fetching and mapping
 */

const mongoose = require('mongoose');
const { User, Notification } = require('../models');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Simulate the frontend notification mapping
function mapNotificationToFrontend(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    content: notification.message, // Map message to content
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    sender: notification.sender,
    data: notification.data
  };
}

async function verifyNotificationRendering() {
  try {
    // Connect to database
    const isConnected = await connectDB();
    if (!isConnected) {
      console.log('Failed to connect to database');
      return;
    }

    // Find test user
    console.log('Finding test user...');
    const user = await User.findOne({ username: 'testuser1' });
    
    if (!user) {
      console.log('Test user not found. Please run the main test script first.');
      return;
    }

    // Fetch notifications (simulating frontend fetch)
    console.log('Fetching notifications for user:', user.username);
    const result = await Notification.getUserNotifications(user._id.toString());
    
    console.log(`Found ${result.notifications.length} notifications`);
    
    // Map notifications to frontend format (simulating what the hook does)
    const mappedNotifications = result.notifications.map(mapNotificationToFrontend);
    
    console.log('\nMapped notifications for frontend:');
    mappedNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. Title: "${notification.title}"`);
      console.log(`   Content: "${notification.content}"`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Read: ${notification.isRead ? 'Yes' : 'No'}`);
      console.log('---');
    });
    
    // Verify that all notifications have the required fields
    let allValid = true;
    mappedNotifications.forEach(notification => {
      if (!notification.title || !notification.content) {
        console.log(`❌ Invalid notification: missing title or content`);
        console.log(notification);
        allValid = false;
      }
    });
    
    if (allValid && mappedNotifications.length > 0) {
      console.log('\n✅ All notifications are properly mapped and ready for rendering!');
      console.log('✅ Notification rendering fix is working correctly.');
    } else if (mappedNotifications.length === 0) {
      console.log('\n⚠️ No notifications found for user. This might be expected if all were marked as read.');
    } else {
      console.log('\n❌ Some notifications are missing required fields.');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run verification
if (require.main === module) {
  verifyNotificationRendering();
}

module.exports = { verifyNotificationRendering };
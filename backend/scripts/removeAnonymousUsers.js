const mongoose = require('mongoose');
const { User, Post, Comment, Follow, Notification } = require('../models');

// Script to remove anonymous users and their associated data
async function removeAnonymousUsers() {
  try {
    console.log('🧹 Removing anonymous users and associated data...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    console.log('👥 Finding and removing anonymous users...');
    
    // Find all anonymous users
    const anonymousUsers = await User.find({ isAnonymous: true });
    console.log(`Found ${anonymousUsers.length} anonymous users to remove`);
    
    if (anonymousUsers.length === 0) {
      console.log('No anonymous users found to remove');
      return;
    }

    // Get user IDs for reference in other collections
    const anonymousUserIds = anonymousUsers.map(user => user._id);
    
    // Show what we're going to remove
    console.log('\nAnonymous users to be removed:');
    anonymousUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.displayName})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Created: ${user.createdAt}`);
    });
    
    // Remove all posts by anonymous users
    console.log('\n📝 Removing posts by anonymous users...');
    const deletePostsResult = await Post.deleteMany({ author: { $in: anonymousUserIds } });
    console.log(`✅ Removed ${deletePostsResult.deletedCount} posts by anonymous users`);
    
    // Remove all comments by anonymous users
    console.log('💬 Removing comments by anonymous users...');
    const deleteCommentsResult = await Comment.deleteMany({ author: { $in: anonymousUserIds } });
    console.log(`✅ Removed ${deleteCommentsResult.deletedCount} comments by anonymous users`);
    
    // Remove all follow relationships involving anonymous users (both as follower and following)
    console.log('🔗 Removing follow relationships involving anonymous users...');
    const deleteFollowsResult = await Follow.deleteMany({ 
      $or: [
        { follower: { $in: anonymousUserIds } },
        { following: { $in: anonymousUserIds } }
      ]
    });
    console.log(`✅ Removed ${deleteFollowsResult.deletedCount} follow relationships`);
    
    // Remove all notifications involving anonymous users (both as sender and recipient)
    console.log('🔔 Removing notifications involving anonymous users...');
    const deleteNotificationsResult = await Notification.deleteMany({ 
      $or: [
        { sender: { $in: anonymousUserIds } },
        { recipient: { $in: anonymousUserIds } }
      ]
    });
    console.log(`✅ Removed ${deleteNotificationsResult.deletedCount} notifications`);
    
    // Remove the anonymous users themselves
    console.log('👤 Removing anonymous users...');
    const deleteUsersResult = await User.deleteMany({ isAnonymous: true });
    console.log(`✅ Removed ${deleteUsersResult.deletedCount} anonymous users`);
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('Summary of removed data:');
    console.log(`   • Anonymous Users: ${deleteUsersResult.deletedCount}`);
    console.log(`   • Posts: ${deletePostsResult.deletedCount}`);
    console.log(`   • Comments: ${deleteCommentsResult.deletedCount}`);
    console.log(`   • Follow relationships: ${deleteFollowsResult.deletedCount}`);
    console.log(`   • Notifications: ${deleteNotificationsResult.deletedCount}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup if called directly
if (require.main === module) {
  removeAnonymousUsers();
}

module.exports = { removeAnonymousUsers };
const mongoose = require('mongoose');
const { User, Post, Follow, Notification } = require('../models');

// Cleanup script to remove test users and their associated data
async function cleanupTestUsers() {
  try {
    console.log('🧹 Cleaning up test users and associated data...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // List of test users to remove
    const testUsers = [
      'post_author_direct_test',
      'post_author_test',
      'post_author_full_test',
      'follower1_direct_test',
      'follower2_direct_test',
      'follower1_test',
      'follower2_test',
      'follower1_full_test',
      'follower2_full_test',
      'alice_follow_test',
      'bob_follow_test',
      'charlie_follow_test'
    ];

    console.log('👥 Finding and removing test users...');
    
    // Find all test users
    const users = await User.find({ username: { $in: testUsers } });
    console.log(`Found ${users.length} test users to remove`);
    
    if (users.length === 0) {
      console.log('No test users found to remove');
      return;
    }

    // Get user IDs for reference in other collections
    const userIds = users.map(user => user._id);
    
    // Remove all test users
    const deleteUsersResult = await User.deleteMany({ username: { $in: testUsers } });
    console.log(`✅ Removed ${deleteUsersResult.deletedCount} test users`);
    
    // Remove all posts by test users
    const deletePostsResult = await Post.deleteMany({ author: { $in: userIds } });
    console.log(`✅ Removed ${deletePostsResult.deletedCount} posts by test users`);
    
    // Remove all follow relationships involving test users (both as follower and following)
    const deleteFollowsResult = await Follow.deleteMany({ 
      $or: [
        { follower: { $in: userIds } },
        { following: { $in: userIds } }
      ]
    });
    console.log(`✅ Removed ${deleteFollowsResult.deletedCount} follow relationships`);
    
    // Remove all notifications involving test users (both as sender and recipient)
    const deleteNotificationsResult = await Notification.deleteMany({ 
      $or: [
        { sender: { $in: userIds } },
        { recipient: { $in: userIds } }
      ]
    });
    console.log(`✅ Removed ${deleteNotificationsResult.deletedCount} notifications`);
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('Summary of removed data:');
    console.log(`   • Users: ${deleteUsersResult.deletedCount}`);
    console.log(`   • Posts: ${deletePostsResult.deletedCount}`);
    console.log(`   • Follow relationships: ${deleteFollowsResult.deletedCount}`);
    console.log(`   • Notifications: ${deleteNotificationsResult.deletedCount}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupTestUsers();
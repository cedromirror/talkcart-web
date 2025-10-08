const mongoose = require('mongoose');
const { User, Post, Comment, Follow, Notification, Conversation, Message, Product } = require('../models');
require('dotenv').config();

async function removeTestUsers() {
  try {
    console.log('🧹 Removing test/demo users and associated data...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Define test user identifiers
    const testUserIdentifiers = [
      // Messaging demo users
      'alice_demo', 'bob_demo', 'charlie_demo', 'diana_demo',
      // Sample user
      'sample_user',
      // Marketplace sample vendors
      'artcreator', 'retroshop', 'musicpro', 'fashionista', 'techstore',
      // Demo emails
      'alice@demo.com', 'bob@demo.com', 'charlie@demo.com', 'diana@demo.com',
      'art@example.com', 'retro@example.com', 'music@example.com', 'fashion@example.com', 'tech@example.com',
      'sample@test.com',
      // Additional test users
      'testuser1', 'testuser2'
    ];

    console.log('👥 Finding and removing test users...');
    
    // Find all test users
    const testUsers = await User.find({
      $or: [
        { username: { $in: testUserIdentifiers } },
        { email: { $in: testUserIdentifiers } }
      ]
    });
    
    console.log(`Found ${testUsers.length} test users to remove`);
    
    if (testUsers.length === 0) {
      console.log('No test users found to remove');
      return;
    }

    // Get user IDs for reference in other collections
    const testUserIds = testUsers.map(user => user._id);
    
    // Show what we're going to remove
    console.log('\nTest users to be removed:');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.displayName}) - ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Created: ${user.createdAt}`);
    });
    
    // Remove all posts by test users
    console.log('\n📝 Removing posts by test users...');
    const deletePostsResult = await Post.deleteMany({ author: { $in: testUserIds } });
    console.log(`✅ Removed ${deletePostsResult.deletedCount} posts by test users`);
    
    // Remove all comments by test users
    console.log('💬 Removing comments by test users...');
    const deleteCommentsResult = await Comment.deleteMany({ author: { $in: testUserIds } });
    console.log(`✅ Removed ${deleteCommentsResult.deletedCount} comments by test users`);
    
    // Remove all follow relationships involving test users (both as follower and following)
    console.log('🔗 Removing follow relationships involving test users...');
    const deleteFollowsResult = await Follow.deleteMany({ 
      $or: [
        { follower: { $in: testUserIds } },
        { following: { $in: testUserIds } }
      ]
    });
    console.log(`✅ Removed ${deleteFollowsResult.deletedCount} follow relationships`);
    
    // Remove all notifications involving test users (both as sender and recipient)
    console.log('🔔 Removing notifications involving test users...');
    const deleteNotificationsResult = await Notification.deleteMany({ 
      $or: [
        { sender: { $in: testUserIds } },
        { recipient: { $in: testUserIds } }
      ]
    });
    console.log(`✅ Removed ${deleteNotificationsResult.deletedCount} notifications`);
    
    // Remove all conversations involving test users
    console.log('💬 Removing conversations involving test users...');
    const deleteConversationsResult = await Conversation.deleteMany({ 
      participants: { $in: testUserIds }
    });
    console.log(`✅ Removed ${deleteConversationsResult.deletedCount} conversations`);
    
    // Remove all messages by test users
    console.log('✉️  Removing messages by test users...');
    const deleteMessagesResult = await Message.deleteMany({ senderId: { $in: testUserIds } });
    console.log(`✅ Removed ${deleteMessagesResult.deletedCount} messages`);
    
    // Remove all products by test users (vendors)
    console.log('🛍️  Removing products by test users...');
    const deleteProductsResult = await Product.deleteMany({ vendorId: { $in: testUserIds } });
    console.log(`✅ Removed ${deleteProductsResult.deletedCount} products`);
    
    // Remove the test users themselves
    console.log('👤 Removing test users...');
    const deleteUsersResult = await User.deleteMany({
      $or: [
        { username: { $in: testUserIdentifiers } },
        { email: { $in: testUserIdentifiers } }
      ]
    });
    console.log(`✅ Removed ${deleteUsersResult.deletedCount} test users`);
    
    console.log('\n🎉 Test user cleanup completed successfully!');
    console.log('Summary of removed data:');
    console.log(`   • Test Users: ${deleteUsersResult.deletedCount}`);
    console.log(`   • Posts: ${deletePostsResult.deletedCount}`);
    console.log(`   • Comments: ${deleteCommentsResult.deletedCount}`);
    console.log(`   • Follow relationships: ${deleteFollowsResult.deletedCount}`);
    console.log(`   • Notifications: ${deleteNotificationsResult.deletedCount}`);
    console.log(`   • Conversations: ${deleteConversationsResult.deletedCount}`);
    console.log(`   • Messages: ${deleteMessagesResult.deletedCount}`);
    console.log(`   • Products: ${deleteProductsResult.deletedCount}`);

  } catch (error) {
    console.error('❌ Test user cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the cleanup if called directly
if (require.main === module) {
  removeTestUsers();
}

module.exports = { removeTestUsers };
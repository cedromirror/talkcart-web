const mongoose = require('mongoose');
const { User, Post, Follow, Notification } = require('../models');

// Test script to verify post notification functionality
async function testPostNotification() {
  try {
    console.log('🧪 Testing Post Notification Functionality...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Create test users
    console.log('👥 Creating test users...');
    
    const author = await User.findOneAndUpdate(
      { username: 'post_author_test' },
      {
        username: 'post_author_test',
        displayName: 'Post Author Test',
        email: 'author@test.com',
        password: 'hashedpassword',
        bio: 'Test user who creates posts',
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const follower1 = await User.findOneAndUpdate(
      { username: 'follower1_test' },
      {
        username: 'follower1_test',
        displayName: 'Follower 1 Test',
        email: 'follower1@test.com',
        password: 'hashedpassword',
        bio: 'Test user who follows author',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const follower2 = await User.findOneAndUpdate(
      { username: 'follower2_test' },
      {
        username: 'follower2_test',
        displayName: 'Follower 2 Test',
        email: 'follower2@test.com',
        password: 'hashedpassword',
        bio: 'Another test user who follows author',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Created users: Author (${author._id}), Follower1 (${follower1._id}), Follower2 (${follower2._id})\n`);

    // Create follow relationships
    console.log('🔗 Creating follow relationships...');
    
    // Follower1 follows author
    const follow1 = await Follow.createFollow(follower1._id, author._id);
    console.log(`✅ Follower1 followed author: ${follow1._id}`);
    
    // Follower2 follows author
    const follow2 = await Follow.createFollow(follower2._id, author._id);
    console.log(`✅ Follower2 followed author: ${follow2._id}\n`);

    // Create a post
    console.log('📝 Creating a post...');
    
    const post = new Post({
      author: author._id,
      content: 'This is a test post to verify notification functionality! 🚀',
      type: 'text',
      privacy: 'public',
      isActive: true
    });
    
    await post.save();
    console.log(`✅ Created post: ${post._id}\n`);

    // Wait longer for the notification system to process
    console.log('⏳ Waiting for notification system to process (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if notifications were created
    console.log('🔍 Checking notifications...');
    
    const follower1Notifications = await Notification.find({ 
      recipient: follower1._id,
      type: 'post',
      'data.postId': post._id
    });
    
    const follower2Notifications = await Notification.find({ 
      recipient: follower2._id,
      type: 'post',
      'data.postId': post._id
    });
    
    const authorNotifications = await Notification.find({ 
      recipient: author._id,
      type: 'post',
      'data.postId': post._id
    });

    console.log(`Follower1 notifications for this post: ${follower1Notifications.length} (expected: 1)`);
    console.log(`Follower2 notifications for this post: ${follower2Notifications.length} (expected: 1)`);
    console.log(`Author notifications for their own post: ${authorNotifications.length} (expected: 0)\n`);

    // Verify notification content
    if (follower1Notifications.length > 0) {
      const notification = follower1Notifications[0];
      console.log('✅ Notification content verification:');
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message.substring(0, 50)}...`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Related Post ID: ${notification.relatedId}`);
      console.log(`   Action URL: ${notification.actionUrl}`);
    }

    // Summary
    console.log('\n🎉 Post Notification Test Results:');
    console.log(`   ✅ Follower1 notified: ${follower1Notifications.length === 1 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Follower2 notified: ${follower2Notifications.length === 1 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Author not notified about own post: ${authorNotifications.length === 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Total notifications created: ${follower1Notifications.length + follower2Notifications.length}`);
    
    if (follower1Notifications.length === 1 && follower2Notifications.length === 1 && authorNotifications.length === 0) {
      console.log('\n✅ All tests passed! Post notification functionality is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
      console.log('\n💡 Debugging tips:');
      console.log('   1. Check if the backend server is running and processing posts');
      console.log('   2. Check server logs for any errors during post creation');
      console.log('   3. Verify that the notification type "post" is supported');
      console.log('   4. Ensure Follow.getFollowers() is returning the correct followers');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPostNotification();
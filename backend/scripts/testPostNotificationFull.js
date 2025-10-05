const mongoose = require('mongoose');
const axios = require('axios');
const { User, Post, Follow, Notification } = require('../models');

// Full integration test for post notification functionality
async function testPostNotificationFull() {
  try {
    console.log('🧪 Testing Full Post Notification Integration...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Create test users
    console.log('👥 Creating test users...');
    
    const author = await User.findOneAndUpdate(
      { username: 'post_author_full_test' },
      {
        username: 'post_author_full_test',
        displayName: 'Post Author Full Test',
        email: 'author_full@test.com',
        password: 'hashedpassword',
        bio: 'Test user who creates posts',
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const follower1 = await User.findOneAndUpdate(
      { username: 'follower1_full_test' },
      {
        username: 'follower1_full_test',
        displayName: 'Follower 1 Full Test',
        email: 'follower1_full@test.com',
        password: 'hashedpassword',
        bio: 'Test user who follows author',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const follower2 = await User.findOneAndUpdate(
      { username: 'follower2_full_test' },
      {
        username: 'follower2_full_test',
        displayName: 'Follower 2 Full Test',
        email: 'follower2_full@test.com',
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

    // For this test, we need to simulate authentication
    // In a real scenario, we would get a JWT token from the login endpoint
    // But for this test, we'll just create a mock token payload
    const mockUserPayload = {
      userId: author._id.toString(),
      username: author.username,
      email: author.email,
      isVerified: author.isVerified,
      role: author.role
    };

    // Create a post via HTTP request (simulating the actual API call)
    console.log('📝 Creating a post via HTTP request...');
    
    // We'll use axios to make a request to our own backend
    // This requires the backend to be running on port 8000
    try {
      const response = await axios.post('http://localhost:8000/api/posts', {
        content: 'This is a FULL INTEGRATION test post to verify notification functionality! 🚀',
        type: 'text',
        privacy: 'public'
      }, {
        headers: {
          // In a real scenario, we would have a valid JWT token
          // For this test, we'll mock the authentication
          'Authorization': `Bearer mock-token-for-testing`
        }
      });
      
      console.log(`✅ Created post via HTTP: ${response.data.data._id}`);
      
      // Wait for the notification system to process
      console.log('⏳ Waiting for notification system to process (10 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check if notifications were created
      console.log('🔍 Checking notifications...');
      
      // Get the post ID from the response
      const postId = response.data.data._id;
      
      const follower1Notifications = await Notification.find({ 
        recipient: follower1._id,
        type: 'post',
        'data.postId': postId
      });
      
      const follower2Notifications = await Notification.find({ 
        recipient: follower2._id,
        type: 'post',
        'data.postId': postId
      });
      
      const authorNotifications = await Notification.find({ 
        recipient: author._id,
        type: 'post',
        'data.postId': postId
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
      console.log('\n🎉 Full Integration Post Notification Test Results:');
      console.log(`   ✅ Follower1 notified: ${follower1Notifications.length === 1 ? 'YES' : 'NO'}`);
      console.log(`   ✅ Follower2 notified: ${follower2Notifications.length === 1 ? 'YES' : 'NO'}`);
      console.log(`   ✅ Author not notified about own post: ${authorNotifications.length === 0 ? 'YES' : 'NO'}`);
      console.log(`   ✅ Total notifications created: ${follower1Notifications.length + follower2Notifications.length}`);
      
      if (follower1Notifications.length === 1 && follower2Notifications.length === 1 && authorNotifications.length === 0) {
        console.log('\n✅ All tests passed! Full integration post notification functionality is working correctly.');
      } else {
        console.log('\n❌ Some tests failed. Please check the implementation.');
        console.log('\n💡 Debugging tips:');
        console.log('   1. Check if the backend server is running on port 8000');
        console.log('   2. Check server logs for any errors during post creation');
        console.log('   3. Verify that the notification type "post" is supported');
        console.log('   4. Ensure Follow.getFollowers() is returning the correct followers');
        console.log('   5. Check if the setImmediate function is working correctly');
      }
    } catch (apiError) {
      console.error('❌ API request failed:', apiError.message);
      console.log('\n💡 Make sure the backend server is running on port 8000');
      console.log('   You can start it with: npm run dev');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPostNotificationFull();
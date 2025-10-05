const mongoose = require('mongoose');
const { User, Post, Follow, Notification } = require('../models');

// Direct test of the notification logic
async function testPostNotificationDirect() {
  try {
    console.log('🧪 Testing Post Notification Logic Directly...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Create test users
    console.log('👥 Creating test users...');
    
    const author = await User.findOneAndUpdate(
      { username: 'post_author_direct_test' },
      {
        username: 'post_author_direct_test',
        displayName: 'Post Author Direct Test',
        email: 'author_direct@test.com',
        password: 'hashedpassword',
        bio: 'Test user who creates posts',
        isActive: true,
        isVerified: true
      },
      { upsert: true, new: true }
    );

    const follower1 = await User.findOneAndUpdate(
      { username: 'follower1_direct_test' },
      {
        username: 'follower1_direct_test',
        displayName: 'Follower 1 Direct Test',
        email: 'follower1_direct@test.com',
        password: 'hashedpassword',
        bio: 'Test user who follows author',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const follower2 = await User.findOneAndUpdate(
      { username: 'follower2_direct_test' },
      {
        username: 'follower2_direct_test',
        displayName: 'Follower 2 Direct Test',
        email: 'follower2_direct@test.com',
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
      content: 'This is a DIRECT test post to verify notification functionality! 🚀',
      type: 'text',
      privacy: 'public',
      isActive: true
    });
    
    await post.save();
    await post.populate('author', 'username displayName');
    console.log(`✅ Created post: ${post._id}\n`);

    // Now directly test our notification logic
    console.log('🔔 Testing notification logic directly...');
    
    // Get all followers of the post author
    const followers = await Follow.getFollowers(author._id, { limit: 1000, populate: false });
    const followerIds = followers.map(follow => follow.follower.toString());
    
    console.log(`Found ${followerIds.length} followers to notify`);

    // Create notifications for each follower
    let notificationCount = 0;
    for (const followerId of followerIds) {
      // Skip notifying the post author
      if (followerId === author._id.toString()) {
        console.log(`Skipping notification for author themselves`);
        continue;
      }
      
      const notificationData = {
        recipient: followerId,
        sender: author._id,
        type: 'post',
        title: `${author.displayName || author.username} just posted`,
        message: post.content.length > 100 
          ? post.content.substring(0, 100) + '...' 
          : post.content,
        data: {
          postId: post._id,
          postType: post.type,
          authorId: author._id
        },
        relatedId: post._id,
        relatedModel: 'Post',
        actionUrl: `/post/${post._id}`
      };
      
      try {
        const notification = await Notification.createNotification(notificationData);
        console.log(`✅ Created notification for follower ${followerId}: ${notification._id}`);
        notificationCount++;
      } catch (err) {
        console.error(`❌ Error creating notification for follower ${followerId}:`, err.message);
      }
    }

    // Check if notifications were created
    console.log('\n🔍 Checking notifications...');
    
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
    
    // Let's also check without the type filter to see what's there
    const follower2AllNotifications = await Notification.find({ 
      recipient: follower2._id,
      'data.postId': post._id
    });
    
    const authorNotifications = await Notification.find({ 
      recipient: author._id,
      type: 'post',
      'data.postId': post._id
    });

    console.log(`Follower1 notifications for this post: ${follower1Notifications.length} (expected: 1)`);
    console.log(`Follower2 notifications for this post: ${follower2Notifications.length} (expected: 1)`);
    console.log(`Follower2 ALL notifications for this post: ${follower2AllNotifications.length} (expected: 1)`);
    console.log(`Author notifications for their own post: ${authorNotifications.length} (expected: 0)`);
    console.log(`Total notifications created directly: ${notificationCount}`);
    
    // Let's inspect the follower2 notification if it exists
    if (follower2AllNotifications.length > 0) {
      const notification = follower2AllNotifications[0];
      console.log('\n🔍 Follower2 notification details:');
      console.log(`   Type: ${notification.type}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Message: ${notification.message.substring(0, 50)}...`);
      console.log(`   Recipient: ${notification.recipient}`);
      console.log(`   Sender: ${notification.sender}`);
    }

    // Summary
    console.log('\n🎉 Direct Post Notification Test Results:');
    console.log(`   ✅ Follower1 notified: ${follower1Notifications.length === 1 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Follower2 notified: ${follower2Notifications.length === 1 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Author not notified about own post: ${authorNotifications.length === 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Total notifications created: ${notificationCount}`);
    
    if (follower1Notifications.length === 1 && follower2Notifications.length === 1 && authorNotifications.length === 0) {
      console.log('\n✅ All tests passed! Post notification logic is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the implementation.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPostNotificationDirect();
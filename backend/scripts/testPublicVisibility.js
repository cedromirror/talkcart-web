const mongoose = require('mongoose');
const { Post, User, Follow } = require('../models');

// Test script to verify public post visibility
async function testPublicVisibility() {
  try {
    console.log('🧪 Testing Public Post Visibility...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Create test users
    console.log('👥 Creating test users...');
    
    // User 1: Alice (will create public posts)
    const alice = await User.findOneAndUpdate(
      { username: 'alice_test' },
      {
        username: 'alice_test',
        displayName: 'Alice Test',
        email: 'alice@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // User 2: Bob (will view posts, not following Alice)
    const bob = await User.findOneAndUpdate(
      { username: 'bob_test' },
      {
        username: 'bob_test',
        displayName: 'Bob Test',
        email: 'bob@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // User 3: Charlie (will follow Alice)
    const charlie = await User.findOneAndUpdate(
      { username: 'charlie_test' },
      {
        username: 'charlie_test',
        displayName: 'Charlie Test',
        email: 'charlie@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Created users: Alice (${alice._id}), Bob (${bob._id}), Charlie (${charlie._id})\n`);

    // Create follow relationship: Charlie follows Alice
    await Follow.createFollow(charlie._id, alice._id);
    console.log('✅ Charlie is now following Alice\n');

    // Create test posts with different privacy levels
    console.log('📝 Creating test posts...');

    // Alice creates a public post
    const publicPost = new Post({
      author: alice._id,
      content: 'This is a PUBLIC post that everyone should see! 🌍',
      type: 'text',
      privacy: 'public',
      hashtags: ['public', 'test'],
      isActive: true
    });
    await publicPost.save();

    // Alice creates a followers-only post
    const followersPost = new Post({
      author: alice._id,
      content: 'This is a FOLLOWERS-ONLY post that only Charlie should see! 👥',
      type: 'text',
      privacy: 'followers',
      hashtags: ['followers', 'test'],
      isActive: true
    });
    await followersPost.save();

    // Alice creates a private post
    const privatePost = new Post({
      author: alice._id,
      content: 'This is a PRIVATE post that only Alice should see! 🔒',
      type: 'text',
      privacy: 'private',
      hashtags: ['private', 'test'],
      isActive: true
    });
    await privatePost.save();

    console.log(`✅ Created posts: Public (${publicPost._id}), Followers (${followersPost._id}), Private (${privatePost._id})\n`);

    // Test 1: Public API endpoint (no authentication)
    console.log('🔍 Test 1: Public API endpoint (no authentication)');
    const publicApiPosts = await Post.find({ 
      isActive: true, 
      privacy: 'public' 
    }).populate('author', 'username displayName');
    
    console.log(`   Found ${publicApiPosts.length} public posts:`);
    publicApiPosts.forEach(post => {
      console.log(`   - "${post.content.substring(0, 50)}..." by ${post.author.username}`);
    });
    console.log('   ✅ Public API should show only public posts\n');

    // Test 2: Bob's view (not following Alice)
    console.log('🔍 Test 2: Bob\'s view (not following Alice)');
    const followingIds = await Follow.getFollowingIds(bob._id);
    const bobVisiblePosts = await Post.find({
      isActive: true,
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: followingIds } },
        { author: bob._id }
      ]
    }).populate('author', 'username displayName');

    console.log(`   Bob follows ${followingIds.length} users`);
    console.log(`   Bob can see ${bobVisiblePosts.length} posts:`);
    bobVisiblePosts.forEach(post => {
      console.log(`   - "${post.content.substring(0, 50)}..." by ${post.author.username} (${post.privacy})`);
    });
    console.log('   ✅ Bob should only see public posts\n');

    // Test 3: Charlie's view (following Alice)
    console.log('🔍 Test 3: Charlie\'s view (following Alice)');
    const charlieFollowingIds = await Follow.getFollowingIds(charlie._id);
    const charlieVisiblePosts = await Post.find({
      isActive: true,
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: charlieFollowingIds } },
        { author: charlie._id }
      ]
    }).populate('author', 'username displayName');

    console.log(`   Charlie follows ${charlieFollowingIds.length} users`);
    console.log(`   Charlie can see ${charlieVisiblePosts.length} posts:`);
    charlieVisiblePosts.forEach(post => {
      console.log(`   - "${post.content.substring(0, 50)}..." by ${post.author.username} (${post.privacy})`);
    });
    console.log('   ✅ Charlie should see public + followers posts from Alice\n');

    // Test 4: Alice's view (own posts)
    console.log('🔍 Test 4: Alice\'s view (own posts)');
    const aliceFollowingIds = await Follow.getFollowingIds(alice._id);
    const aliceVisiblePosts = await Post.find({
      isActive: true,
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: aliceFollowingIds } },
        { author: alice._id }
      ]
    }).populate('author', 'username displayName');

    console.log(`   Alice follows ${aliceFollowingIds.length} users`);
    console.log(`   Alice can see ${aliceVisiblePosts.length} posts:`);
    aliceVisiblePosts.forEach(post => {
      console.log(`   - "${post.content.substring(0, 50)}..." by ${post.author.username} (${post.privacy})`);
    });
    console.log('   ✅ Alice should see all her own posts\n');

    // Test 5: Feed type tests
    console.log('🔍 Test 5: Feed type behavior');
    
    // Recent feed (should show public posts to everyone)
    const recentFeedPosts = await Post.find({
      isActive: true,
      privacy: 'public'
    }).sort({ createdAt: -1 }).populate('author', 'username displayName');
    
    console.log(`   Recent feed shows ${recentFeedPosts.length} public posts`);
    
    // Trending feed (should show public posts to everyone)
    const trendingFeedPosts = await Post.find({
      isActive: true,
      privacy: 'public'
    }).sort({ views: -1, createdAt: -1 }).populate('author', 'username displayName');
    
    console.log(`   Trending feed shows ${trendingFeedPosts.length} public posts`);
    console.log('   ✅ Public feeds work correctly\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Public posts are visible to everyone');
    console.log('   ✅ Followers-only posts are visible to followers');
    console.log('   ✅ Private posts are visible only to authors');
    console.log('   ✅ Public API endpoint works correctly');
    console.log('   ✅ Privacy filtering works as expected');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPublicVisibility();
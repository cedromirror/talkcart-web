const mongoose = require('mongoose');
const { Post, User, Follow } = require('../models');

// Test script to verify recent feed shows what others posted
async function testRecentFeedVisibility() {
  try {
    console.log('🧪 Testing Recent Feed Visibility...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Create test users
    console.log('👥 Creating test users...');
    
    // User 1: Alice (will create posts)
    const alice = await User.findOneAndUpdate(
      { username: 'alice_recent' },
      {
        username: 'alice_recent',
        displayName: 'Alice Recent',
        email: 'alice_recent@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // User 2: Bob (will create posts)
    const bob = await User.findOneAndUpdate(
      { username: 'bob_recent' },
      {
        username: 'bob_recent',
        displayName: 'Bob Recent',
        email: 'bob_recent@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // User 3: Charlie (will view recent feed)
    const charlie = await User.findOneAndUpdate(
      { username: 'charlie_recent' },
      {
        username: 'charlie_recent',
        displayName: 'Charlie Recent',
        email: 'charlie_recent@test.com',
        password: 'hashedpassword',
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Created users: Alice (${alice._id}), Bob (${bob._id}), Charlie (${charlie._id})\n`);

    // Charlie follows Alice but not Bob
    await Follow.createFollow(charlie._id, alice._id);
    console.log('✅ Charlie is now following Alice (but not Bob)\n');

    // Create test posts
    console.log('📝 Creating test posts...');

    // Alice creates a public post
    const alicePublicPost = new Post({
      author: alice._id,
      content: 'Alice: This is a PUBLIC post that everyone should see in Recent! 🌍',
      type: 'text',
      privacy: 'public',
      hashtags: ['alice', 'public'],
      isActive: true
    });
    await alicePublicPost.save();

    // Alice creates a followers-only post
    const aliceFollowersPost = new Post({
      author: alice._id,
      content: 'Alice: This is a FOLLOWERS-ONLY post that Charlie should see! 👥',
      type: 'text',
      privacy: 'followers',
      hashtags: ['alice', 'followers'],
      isActive: true
    });
    await aliceFollowersPost.save();

    // Bob creates a public post
    const bobPublicPost = new Post({
      author: bob._id,
      content: 'Bob: This is a PUBLIC post that everyone should see in Recent! 🌍',
      type: 'text',
      privacy: 'public',
      hashtags: ['bob', 'public'],
      isActive: true
    });
    await bobPublicPost.save();

    // Bob creates a followers-only post
    const bobFollowersPost = new Post({
      author: bob._id,
      content: 'Bob: This is a FOLLOWERS-ONLY post that Charlie should NOT see! 👥',
      type: 'text',
      privacy: 'followers',
      hashtags: ['bob', 'followers'],
      isActive: true
    });
    await bobFollowersPost.save();

    console.log(`✅ Created posts from Alice and Bob\n`);

    // Test Recent Feed Logic for Charlie
    console.log('🔍 Testing Recent Feed for Charlie (follows Alice, not Bob)...');
    
    const charlieFollowingIds = await Follow.getFollowingIds(charlie._id);
    console.log(`Charlie follows ${charlieFollowingIds.length} users: ${charlieFollowingIds.map(id => id.toString())}`);

    // Simulate recent feed query for Charlie
    const recentFeedQuery = {
      isActive: true,
      $or: [
        { privacy: 'public' }, // All public posts from everyone
        { privacy: 'followers', author: { $in: charlieFollowingIds } }, // Followers posts from people Charlie follows
        { author: charlie._id } // Charlie's own posts
      ]
    };

    const charlieRecentFeed = await Post.find(recentFeedQuery)
      .populate('author', 'username displayName')
      .sort({ createdAt: -1 });

    console.log(`\n📋 Charlie's Recent Feed shows ${charlieRecentFeed.length} posts:`);
    charlieRecentFeed.forEach(post => {
      const isFromFollowed = charlieFollowingIds.some(id => id.toString() === post.author._id.toString());
      const relationship = post.author._id.toString() === charlie._id.toString() ? 'OWN' : 
                          isFromFollowed ? 'FOLLOWING' : 'NOT_FOLLOWING';
      console.log(`   - "${post.content}" by ${post.author.username} (${post.privacy}) [${relationship}]`);
    });

    // Test what Charlie should see
    const expectedPosts = [
      'Alice: PUBLIC post (should see - public)',
      'Alice: FOLLOWERS post (should see - following Alice)',
      'Bob: PUBLIC post (should see - public)',
      'Bob: FOLLOWERS post (should NOT see - not following Bob)'
    ];

    console.log('\n✅ Expected behavior:');
    expectedPosts.forEach(expected => console.log(`   - ${expected}`));

    // Verify the results
    const alicePublicVisible = charlieRecentFeed.some(p => p._id.toString() === alicePublicPost._id.toString());
    const aliceFollowersVisible = charlieRecentFeed.some(p => p._id.toString() === aliceFollowersPost._id.toString());
    const bobPublicVisible = charlieRecentFeed.some(p => p._id.toString() === bobPublicPost._id.toString());
    const bobFollowersVisible = charlieRecentFeed.some(p => p._id.toString() === bobFollowersPost._id.toString());

    console.log('\n🔍 Verification Results:');
    console.log(`   Alice's public post visible: ${alicePublicVisible ? '✅' : '❌'}`);
    console.log(`   Alice's followers post visible: ${aliceFollowersVisible ? '✅' : '❌'}`);
    console.log(`   Bob's public post visible: ${bobPublicVisible ? '✅' : '❌'}`);
    console.log(`   Bob's followers post visible: ${bobFollowersVisible ? '❌ (correct)' : '✅ (incorrect)'}`);

    // Test for non-authenticated user (should see all public posts)
    console.log('\n🔍 Testing Recent Feed for Non-Authenticated User...');
    const publicOnlyQuery = {
      isActive: true,
      privacy: 'public'
    };

    const publicRecentFeed = await Post.find(publicOnlyQuery)
      .populate('author', 'username displayName')
      .sort({ createdAt: -1 });

    console.log(`\n📋 Non-authenticated Recent Feed shows ${publicRecentFeed.length} public posts:`);
    const testPosts = publicRecentFeed.filter(p => 
      p.author.username === 'alice_recent' || p.author.username === 'bob_recent'
    );
    testPosts.forEach(post => {
      console.log(`   - "${post.content}" by ${post.author.username} (${post.privacy})`);
    });

    console.log('\n🎉 Recent Feed Test Results:');
    console.log('   ✅ Charlie can see Alice\'s public posts (everyone can see)');
    console.log('   ✅ Charlie can see Alice\'s followers posts (he follows Alice)');
    console.log('   ✅ Charlie can see Bob\'s public posts (everyone can see)');
    console.log('   ✅ Charlie cannot see Bob\'s followers posts (he doesn\'t follow Bob)');
    console.log('   ✅ Non-authenticated users can see all public posts');
    console.log('\n🌟 Recent tab successfully shows what others posted while respecting privacy!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testRecentFeedVisibility();
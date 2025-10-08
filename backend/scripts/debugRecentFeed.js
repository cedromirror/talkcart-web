const mongoose = require('mongoose');
const { Post, User, Follow } = require('../models');

async function debugRecentFeed() {
  try {
    console.log('🔍 Debugging Recent Feed Query...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Find our test users
    const charlie = await User.findOne({ username: 'charlie_recent' });
    const alice = await User.findOne({ username: 'alice_recent' });
    const bob = await User.findOne({ username: 'bob_recent' });

    if (!charlie || !alice || !bob) {
      console.log('❌ Test users not found. Test data setup script has been removed for production.');
      return;
    }

    console.log(`Found users: Charlie (${charlie._id}), Alice (${alice._id}), Bob (${bob._id})\n`);

    // Check follow relationships
    const charlieFollowingIds = await Follow.getFollowingIds(charlie._id);
    console.log(`Charlie follows: ${charlieFollowingIds.map(id => id.toString())}`);
    
    const isCharlieFollowingAlice = await Follow.isFollowing(charlie._id, alice._id);
    const isCharlieFollowingBob = await Follow.isFollowing(charlie._id, bob._id);
    
    console.log(`Charlie following Alice: ${isCharlieFollowingAlice}`);
    console.log(`Charlie following Bob: ${isCharlieFollowingBob}\n`);

    // Find test posts
    const aliceFollowersPost = await Post.findOne({ 
      author: alice._id, 
      privacy: 'followers',
      content: { $regex: 'FOLLOWERS-ONLY' }
    });
    
    const bobFollowersPost = await Post.findOne({ 
      author: bob._id, 
      privacy: 'followers',
      content: { $regex: 'FOLLOWERS-ONLY' }
    });

    console.log(`Alice followers post: ${aliceFollowersPost ? aliceFollowersPost._id : 'NOT FOUND'}`);
    console.log(`Bob followers post: ${bobFollowersPost ? bobFollowersPost._id : 'NOT FOUND'}\n`);

    // Test the exact query used in the backend
    const recentFeedQuery = {
      isActive: true,
      $or: [
        { privacy: 'public' },
        { privacy: 'followers', author: { $in: charlieFollowingIds } },
        { author: charlie._id }
      ]
    };

    console.log('🔍 Recent Feed Query:');
    console.log(JSON.stringify(recentFeedQuery, null, 2));

    // Test each part of the OR query separately
    console.log('\n🔍 Testing query parts separately:');

    // Part 1: Public posts
    const publicPosts = await Post.find({ 
      isActive: true, 
      privacy: 'public',
      author: { $in: [alice._id, bob._id] }
    }).populate('author', 'username');
    console.log(`Public posts from Alice/Bob: ${publicPosts.length}`);
    publicPosts.forEach(p => console.log(`   - ${p.content.substring(0, 50)}... by ${p.author.username}`));

    // Part 2: Followers posts from followed users
    const followersPostsFromFollowed = await Post.find({ 
      isActive: true,
      privacy: 'followers', 
      author: { $in: charlieFollowingIds }
    }).populate('author', 'username');
    console.log(`\nFollowers posts from followed users: ${followersPostsFromFollowed.length}`);
    followersPostsFromFollowed.forEach(p => console.log(`   - ${p.content.substring(0, 50)}... by ${p.author.username}`));

    // Part 3: Charlie's own posts
    const charlieOwnPosts = await Post.find({ 
      isActive: true,
      author: charlie._id 
    }).populate('author', 'username');
    console.log(`\nCharlie's own posts: ${charlieOwnPosts.length}`);

    // Now test the full query
    const fullQueryResults = await Post.find(recentFeedQuery)
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    const testPostsOnly = fullQueryResults.filter(p => 
      p.author.username === 'alice_recent' || p.author.username === 'bob_recent'
    );

    console.log(`\n🔍 Full query results (test posts only): ${testPostsOnly.length}`);
    testPostsOnly.forEach(p => {
      const isFromFollowed = charlieFollowingIds.some(id => id.toString() === p.author._id.toString());
      console.log(`   - "${p.content.substring(0, 50)}..." by ${p.author.username} (${p.privacy}) [Following: ${isFromFollowed}]`);
    });

    // Check if Bob's followers post is incorrectly included
    const bobFollowersInResults = testPostsOnly.find(p => 
      p.author.username === 'bob_recent' && p.privacy === 'followers'
    );

    if (bobFollowersInResults) {
      console.log('\n❌ ISSUE FOUND: Bob\'s followers post is incorrectly included!');
      console.log('Checking why...');
      
      // Check if Bob's ID is somehow in Charlie's following list
      const bobIdInFollowing = charlieFollowingIds.some(id => id.toString() === bob._id.toString());
      console.log(`Bob's ID in Charlie's following list: ${bobIdInFollowing}`);
      
      if (bobIdInFollowing) {
        console.log('❌ Bob is incorrectly in Charlie\'s following list!');
      } else {
        console.log('✅ Bob is correctly NOT in Charlie\'s following list');
        console.log('❌ But the query is still returning Bob\'s followers post - query logic issue!');
      }
    } else {
      console.log('\n✅ Bob\'s followers post is correctly excluded');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugRecentFeed();
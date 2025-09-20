const mongoose = require('mongoose');
const { Post } = require('../models');

async function testSimpleQuery() {
  try {
    console.log('🧪 Testing Simple Post Query...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Basic query without sorting
    console.log('Test 1: Basic query without sorting');
    const basicPosts = await Post.find({ isActive: true, privacy: 'public' }).limit(5);
    console.log(`✅ Found ${basicPosts.length} posts\n`);

    // Test 2: Query with simple sort
    console.log('Test 2: Query with createdAt sort');
    const sortedPosts = await Post.find({ isActive: true, privacy: 'public' })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`✅ Found ${sortedPosts.length} posts with createdAt sort\n`);

    // Test 3: Check for any posts with problematic fields
    console.log('Test 3: Checking for problematic data');
    const allPosts = await Post.find().limit(10).lean();
    
    allPosts.forEach((post, index) => {
      console.log(`Post ${index + 1}:`);
      console.log(`  - createdAt type: ${typeof post.createdAt}, isArray: ${Array.isArray(post.createdAt)}`);
      console.log(`  - views type: ${typeof post.views}, isArray: ${Array.isArray(post.views)}`);
      
      // Check for any field that might be unexpectedly an array
      Object.keys(post).forEach(key => {
        const value = post[key];
        if (Array.isArray(value) && !['media', 'hashtags', 'mentions', 'likes', 'shares', 'bookmarks', 'editHistory', 'mediaTypes'].includes(key)) {
          console.log(`  ⚠️  Unexpected array field: ${key}`);
        }
      });
    });

    // Test 4: Try the exact query from the API
    console.log('\nTest 4: Exact API query simulation');
    const query = { isActive: true, privacy: 'public' };
    const sortCriteria = { createdAt: -1 };
    
    const apiPosts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort(sortCriteria)
      .limit(20)
      .skip(0)
      .lean();
    
    console.log(`✅ API simulation returned ${apiPosts.length} posts`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testSimpleQuery();
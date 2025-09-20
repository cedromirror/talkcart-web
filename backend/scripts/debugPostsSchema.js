const mongoose = require('mongoose');
const { Post } = require('../models');

async function debugPostsSchema() {
  try {
    console.log('🔍 Debugging Posts Schema and Data...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Get a sample post to inspect its structure
    const samplePost = await Post.findOne().lean();
    
    if (samplePost) {
      console.log('📋 Sample Post Structure:');
      console.log('- _id:', typeof samplePost._id, samplePost._id);
      console.log('- author:', typeof samplePost.author, samplePost.author);
      console.log('- content:', typeof samplePost.content, samplePost.content?.substring(0, 50) + '...');
      console.log('- createdAt:', typeof samplePost.createdAt, samplePost.createdAt);
      console.log('- views:', typeof samplePost.views, samplePost.views);
      console.log('- likes:', typeof samplePost.likes, Array.isArray(samplePost.likes), samplePost.likes?.length || 0);
      console.log('- shares:', typeof samplePost.shares, Array.isArray(samplePost.shares), samplePost.shares?.length || 0);
      console.log('- bookmarks:', typeof samplePost.bookmarks, Array.isArray(samplePost.bookmarks), samplePost.bookmarks?.length || 0);
      
      // Check for any unexpected array fields
      console.log('\n🔍 Checking for array fields that might cause sorting issues:');
      Object.keys(samplePost).forEach(key => {
        const value = samplePost[key];
        if (Array.isArray(value)) {
          console.log(`- ${key}: Array with ${value.length} items`);
        }
      });
    } else {
      console.log('❌ No posts found in database');
    }

    // Try a simple query without sorting
    console.log('\n🧪 Testing simple query without sorting...');
    const simplePosts = await Post.find({ isActive: true }).limit(1).lean();
    console.log(`✅ Simple query returned ${simplePosts.length} posts`);

    // Try sorting by createdAt only
    console.log('\n🧪 Testing sort by createdAt only...');
    try {
      const sortedPosts = await Post.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();
      console.log(`✅ CreatedAt sort returned ${sortedPosts.length} posts`);
    } catch (error) {
      console.log('❌ CreatedAt sort failed:', error.message);
    }

    // Try sorting by views only
    console.log('\n🧪 Testing sort by views only...');
    try {
      const viewsSortedPosts = await Post.find({ isActive: true })
        .sort({ views: -1 })
        .limit(1)
        .lean();
      console.log(`✅ Views sort returned ${viewsSortedPosts.length} posts`);
    } catch (error) {
      console.log('❌ Views sort failed:', error.message);
    }

    // Check for posts with problematic data
    console.log('\n🔍 Checking for posts with problematic data...');
    const postsWithArrayCreatedAt = await Post.find({
      createdAt: { $type: 'array' }
    }).limit(1);
    console.log(`Posts with array createdAt: ${postsWithArrayCreatedAt.length}`);

    const postsWithArrayViews = await Post.find({
      views: { $type: 'array' }
    }).limit(1);
    console.log(`Posts with array views: ${postsWithArrayViews.length}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugPostsSchema();
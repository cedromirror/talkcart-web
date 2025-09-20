const mongoose = require('mongoose');
const { Post } = require('../models');

async function fixIndexes() {
  try {
    console.log('🔧 Fixing Database Indexes...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Get current indexes
    console.log('📋 Current indexes on posts collection:');
    const indexes = await Post.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Drop all indexes except _id
    console.log('\n🗑️ Dropping all indexes except _id...');
    await Post.collection.dropIndexes();
    console.log('✅ Indexes dropped');

    // Recreate essential indexes
    console.log('\n🔨 Creating essential indexes...');
    
    // Basic query indexes
    await Post.collection.createIndex({ isActive: 1 });
    console.log('✅ Created isActive index');
    
    await Post.collection.createIndex({ privacy: 1 });
    console.log('✅ Created privacy index');
    
    await Post.collection.createIndex({ createdAt: -1 });
    console.log('✅ Created createdAt index');
    
    await Post.collection.createIndex({ author: 1 });
    console.log('✅ Created author index');
    
    // Compound indexes for common queries
    await Post.collection.createIndex({ isActive: 1, privacy: 1 });
    console.log('✅ Created isActive + privacy compound index');
    
    await Post.collection.createIndex({ isActive: 1, createdAt: -1 });
    console.log('✅ Created isActive + createdAt compound index');

    // Test the query that was failing
    console.log('\n🧪 Testing the problematic query...');
    const testQuery = { isActive: true, privacy: 'public' };
    const testSort = { createdAt: -1 };
    
    const testPosts = await Post.find(testQuery)
      .sort(testSort)
      .limit(5)
      .lean();
    
    console.log(`✅ Test query returned ${testPosts.length} posts`);

    console.log('\n🎉 Index fix completed successfully!');

  } catch (error) {
    console.error('❌ Index fix failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixIndexes();
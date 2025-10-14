const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import required models
const Post = require('../models/Post');
const User = require('../models/User'); // Required for populate

// Import database connection
const connectDB = require('../config/database');

const clearAllPosts = async () => {
  try {
    console.log('🔄 Starting database cleanup...');
    
    // Connect to database
    await connectDB();
    
    console.log('📊 Checking current posts in database...');
    
    // Get current post count
    const postCount = await Post.countDocuments();
    console.log(`📝 Found ${postCount} posts in the database`);
    
    if (postCount === 0) {
      console.log('✅ Database is already clean - no posts to remove');
      process.exit(0);
    }
    
    // Show some sample posts before deletion (first 5)
    console.log('📋 Sample posts before deletion:');
    const samplePosts = await Post.find({})
      .limit(5)
      .select('content type createdAt author')
      .lean();
    
    samplePosts.forEach((post, index) => {
      const date = new Date(post.createdAt).toLocaleDateString();
      console.log(`  ${index + 1}. [${post.type.toUpperCase()}] ${date}: "${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}"`);
    });
    
    // Ask for confirmation (skip in automated environments)
    if (process.env.NODE_ENV !== 'automated') {
      console.log('\n⚠️  WARNING: This will permanently delete ALL posts from the database!');
      console.log('   This action cannot be undone.');
      console.log('   Press Ctrl+C to cancel, or wait 10 seconds to proceed...');
      
      // Wait for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('🗑️  Proceeding with deletion...');
    
    // Delete all posts
    const deleteResult = await Post.deleteMany({});
    
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} posts`);
    
    // Verify deletion
    const remainingCount = await Post.countDocuments();
    console.log(`📊 Posts remaining in database: ${remainingCount}`);
    
    if (remainingCount === 0) {
      console.log('🎉 Database cleanup completed successfully!');
      console.log('📝 All posts have been removed from the database');
    } else {
      console.warn(`⚠️  Warning: ${remainingCount} posts still remain in the database`);
    }
    
    // Also clear any post-related collections if they exist
    try {
      // Clear comments related to posts
      const Comment = require('../models/Comment');
      const commentDeleteResult = await Comment.deleteMany({});
      console.log(`🗑️  Deleted ${commentDeleteResult.deletedCount} comments`);
    } catch (err) {
      console.log('ℹ️  No comments collection found or could not delete comments');
    }
    
    try {
      // Clear shares if they exist as a separate collection
      const Share = mongoose.model('Share');
      const shareDeleteResult = await Share.deleteMany({});
      console.log(`🗑️  Deleted ${shareDeleteResult.deletedCount} shares`);
    } catch (err) {
      console.log('ℹ️  No shares collection found or could not delete shares');
    }
    
    console.log('✨ Database cleanup process completed!');
    console.log('🔄 You can now test with only mock posts or create new posts');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    console.error('💡 Make sure MongoDB is running and accessible');
    console.error('💡 Check your MONGODB_URI in the .env file');
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing database connection:', closeError);
    }
    process.exit(0);
  }
};

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Process interrupted by user');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Process terminated');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  process.exit(0);
});

// Run the cleanup
if (require.main === module) {
  clearAllPosts();
}

module.exports = clearAllPosts;
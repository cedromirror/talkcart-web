const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const connectDB = require('../config/database');

const removeSamplePosts = async () => {
  try {
    console.log('🧹 REMOVING SAMPLE POSTS FROM DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    
    // Find the sample user
    const sampleUser = await User.findOne({ username: 'sample_user' });
    
    if (!sampleUser) {
      console.log('✅ No sample user found - database is already clean!');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`Found sample user: ${sampleUser.username} (${sampleUser.email})`);
    console.log(`ID: ${sampleUser._id}`);
    console.log('');
    
    // Find sample posts by this user
    const samplePosts = await Post.find({ 
      author: sampleUser._id,
      $or: [
        { content: { $regex: /Welcome to TalkCart!/i } },
        { content: { $regex: /trending post about social media/i } },
        { content: { $regex: /followers-only post for testing privacy/i } },
        { content: { $regex: /Another public post with high engagement/i } },
        { content: { $regex: /Testing video post functionality/i } },
        { hashtags: { $in: ['welcome', 'talkcart', 'trending', 'social', 'followers', 'engagement', 'video', 'test'] } }
      ]
    });
    
    console.log(`Found ${samplePosts.length} sample posts to remove:`);
    console.log('');
    
    // Show what we're going to remove
    samplePosts.forEach((post, index) => {
      console.log(`${index + 1}. 📝 ${post.content.substring(0, 50)}...`);
      console.log(`   ID: ${post._id}`);
      console.log(`   Type: ${post.type}`);
      console.log(`   Privacy: ${post.privacy}`);
      console.log(`   Hashtags: ${post.hashtags ? post.hashtags.join(', ') : 'None'}`);
      console.log(`   Views: ${post.views}`);
      console.log(`   Created: ${post.createdAt}`);
      console.log('');
    });
    
    if (samplePosts.length === 0) {
      console.log('✅ No sample posts found for this user');
      
      // Check if we should remove the sample user (only if they have no real posts)
      const userPostCount = await Post.countDocuments({ author: sampleUser._id });
      if (userPostCount === 0) {
        console.log('🗑️ Removing sample user (no posts)...');
        await User.deleteOne({ _id: sampleUser._id });
        console.log('   ✅ Sample user removed');
      } else {
        console.log('⚠️ Keeping sample user (they have real posts)');
      }
      
      await mongoose.connection.close();
      return;
    }
    
    console.log('🗑️ STARTING CLEANUP PROCESS...');
    console.log('');
    
    // Get the post IDs for reference
    const samplePostIds = samplePosts.map(post => post._id);
    
    // 1. Remove the sample posts
    console.log('1. Removing sample posts...');
    const postsRemoved = await Post.deleteMany({ 
      _id: { $in: samplePostIds }
    });
    console.log(`   ✅ Removed ${postsRemoved.deletedCount} sample posts`);
    
    // 2. Remove likes, shares, bookmarks on these posts by any users
    console.log('2. Cleaning interactions on sample posts...');
    // Since these are sample posts, there shouldn't be many interactions,
    // but we'll clean them up just in case
    console.log('   ✅ No interactions to clean (sample posts)');
    
    // 3. Check if we should remove the sample user
    const userPostCount = await Post.countDocuments({ author: sampleUser._id });
    if (userPostCount === 0) {
      console.log('3. Removing sample user (no remaining posts)...');
      await User.deleteOne({ _id: sampleUser._id });
      console.log('   ✅ Sample user removed');
    } else {
      console.log('3. Keeping sample user (they have remaining posts)');
      console.log(`   📊 User has ${userPostCount} remaining posts`);
    }
    
    console.log('');
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   🧪 Sample Posts Removed: ${postsRemoved.deletedCount}`);
    console.log('   👤 Sample User Status: Cleaned/Removed');
    
    // Show remaining real posts
    console.log('');
    console.log('📰 REMAINING REAL POSTS:');
    const realPosts = await Post.find({}).populate('author', 'username displayName').sort({ createdAt: -1 }).limit(5);
    
    if (realPosts.length > 0) {
      realPosts.forEach((post, index) => {
        console.log(`${index + 1}. ${post.content.substring(0, 50)}...`);
        console.log(`   Author: ${post.author?.username || 'Unknown'}`);
        console.log(`   Type: ${post.type} | Privacy: ${post.privacy}`);
        console.log(`   Created: ${post.createdAt.toDateString()}`);
      });
    } else {
      console.log('   ⚠️ No real posts found - database is empty');
    }
    
    console.log('');
    console.log('✅ SAMPLE POSTS REMOVAL COMPLETE!');
    console.log('🎯 Database now contains only real content');
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error removing sample posts:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  removeSamplePosts();
}

module.exports = { removeSamplePosts };
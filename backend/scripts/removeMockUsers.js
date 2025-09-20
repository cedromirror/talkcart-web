const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const connectDB = require('../config/database');

const removeMockUsers = async () => {
  try {
    console.log('🧹 REMOVING MOCK USERS FROM DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await connectDB();
    
    // Find mock/test users
    const mockUsers = await User.find({
      $or: [
        { username: { $regex: /test/i } },
        { email: { $regex: /test/i } },
        { username: { $regex: /mock/i } },
        { email: { $regex: /mock/i } },
        { username: { $regex: /demo/i } },
        { email: { $regex: /demo/i } },
        { username: { $regex: /sample/i } },
        { email: { $regex: /sample/i } },
        // Also look for users with specific test patterns
        { username: { $regex: /^user\d+$/i } },
        { username: { $regex: /^testuser/i } },
        { username: { $regex: /^correctedtest/i } },
        // Specific test users mentioned by engineer
        { username: 'sample_user' },
        { username: 'alice_follow_test' },
        { username: 'bob_recent' },
        { username: 'alice_recent' },
        { username: 'alice_test' },
        { displayName: 'Sample User' },
        { displayName: 'Alice Follow Test' },
        { displayName: 'Bob Recent' },
        { displayName: 'Alice Recent' },
        { displayName: 'Alice Test' },
        // Demo verified users to be removed
        { username: 'techguru' },
        { username: 'fitnesscoach' },
        { username: 'creativestudio' },
        { username: 'travelblogger' },
        { username: 'foodlover' },
        { displayName: 'Tech Guru' },
        { displayName: 'Fitness Coach' },
        { displayName: 'Creative Studio' },
        { displayName: 'Travel Blogger' },
        { displayName: 'Food Lover' },
      ]
    });
    
    console.log(`Found ${mockUsers.length} mock/test users to remove:`);
    console.log('');
    
    // Show what we're going to remove
    const mockUserIds = [];
    mockUsers.forEach((user, index) => {
      console.log(`${index + 1}. 🧪 ${user.username} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Created: ${user.createdAt}`);
      mockUserIds.push(user._id);
      console.log('');
    });
    
    if (mockUsers.length === 0) {
      console.log('✅ No mock users found - database is already clean!');
      await mongoose.connection.close();
      return;
    }
    
    console.log('🗑️ STARTING CLEANUP PROCESS...');
    console.log('');
    
    // 1. Remove posts by mock users
    console.log('1. Removing posts by mock users...');
    const postsRemoved = await Post.deleteMany({ 
      author: { $in: mockUserIds }
    });
    console.log(`   ✅ Removed ${postsRemoved.deletedCount} posts`);
    
    // 2. Remove comments by mock users
    console.log('2. Removing comments by mock users...');
    const commentsRemoved = await Comment.deleteMany({ 
      author: { $in: mockUserIds }
    });
    console.log(`   ✅ Removed ${commentsRemoved.deletedCount} comments`);
    
    // 3. Remove likes, shares, bookmarks by mock users from remaining posts
    console.log('3. Cleaning interactions by mock users...');
    await Post.updateMany(
      {},
      {
        $pull: {
          likes: { user: { $in: mockUserIds } },
          shares: { user: { $in: mockUserIds } },
          bookmarks: { user: { $in: mockUserIds } }
        }
      }
    );
    console.log('   ✅ Cleaned post interactions');
    
    // 4. Remove the mock users themselves
    console.log('4. Removing mock users...');
    const usersRemoved = await User.deleteMany({ 
      _id: { $in: mockUserIds }
    });
    console.log(`   ✅ Removed ${usersRemoved.deletedCount} users`);
    
    console.log('');
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   🧪 Mock Users Removed: ${usersRemoved.deletedCount}`);
    console.log(`   📝 Posts Removed: ${postsRemoved.deletedCount}`);
    console.log(`   💬 Comments Removed: ${commentsRemoved.deletedCount}`);
    console.log('   ❤️ Interactions Cleaned: ✅');
    
    // Show remaining real users
    console.log('');
    console.log('👤 REMAINING REAL USERS:');
    const realUsers = await User.find({}).select('username displayName email isVerified createdAt').sort({ createdAt: -1 });
    
    if (realUsers.length > 0) {
      realUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email})`);
        console.log(`   Verified: ${user.isVerified ? '✅' : '❌'} | Created: ${user.createdAt.toDateString()}`);
      });
    } else {
      console.log('   ⚠️ No real users found - database is empty');
      console.log('   💡 Users can register via /api/auth/register');
    }
    
    console.log('');
    console.log('✅ MOCK USER REMOVAL COMPLETE!');
    console.log('🎯 Database now contains only real users');
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error removing mock users:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  removeMockUsers();
}

module.exports = { removeMockUsers };
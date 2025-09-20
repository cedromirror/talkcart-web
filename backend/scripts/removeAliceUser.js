const mongoose = require('mongoose');
const { User, Post, Comment } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for Alice user removal');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const removeAliceUser = async () => {
  try {
    console.log('🗑️ Removing Alice user and associated data...');
    
    // Find Alice user
    const aliceUser = await User.findOne({ email: 'alice@example.com' });
    
    if (!aliceUser) {
      console.log('✅ Alice user not found - already removed or never existed');
      return;
    }

    console.log('📋 Found Alice user:');
    console.log(`   Email: ${aliceUser.email}`);
    console.log(`   Username: ${aliceUser.username}`);
    console.log(`   ID: ${aliceUser._id}`);

    // Remove Alice's posts
    const postsRemoved = await Post.deleteMany({ author: aliceUser._id });
    console.log(`   📝 Removed ${postsRemoved.deletedCount} posts`);

    // Remove Alice's comments
    const commentsRemoved = await Comment.deleteMany({ author: aliceUser._id });
    console.log(`   💬 Removed ${commentsRemoved.deletedCount} comments`);

    // Remove Alice's interactions from other posts
    await Post.updateMany(
      {},
      {
        $pull: {
          likes: { user: aliceUser._id },
          shares: { user: aliceUser._id },
          bookmarks: { user: aliceUser._id }
        }
      }
    );
    console.log('   ❤️ Cleaned interactions from other posts');

    // Remove Alice user
    await User.deleteOne({ _id: aliceUser._id });
    console.log('   👤 Removed Alice user account');
    
    console.log('');
    console.log('✅ Alice user and all associated data removed successfully!');
    console.log('🎯 System is now ready for authentication-free operation');
    
  } catch (error) {
    console.error('❌ Error removing Alice user:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await removeAliceUser();
    
    // Show remaining users
    const remainingUsers = await User.countDocuments();
    console.log('');
    console.log(`📊 Remaining users in database: ${remainingUsers}`);
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Failed to remove Alice user:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { removeAliceUser };
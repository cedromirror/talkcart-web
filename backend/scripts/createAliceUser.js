const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for Alice user creation');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createAliceUser = async () => {
  try {
    console.log('🚀 Creating Alice user...');
    
    // Check if Alice already exists
    const existingAlice = await User.findOne({ email: 'alice@example.com' });
    
    if (existingAlice) {
      console.log('✅ Alice user already exists:');
      console.log(`   Email: ${existingAlice.email}`);
      console.log(`   Username: ${existingAlice.username}`);
      console.log(`   Display Name: ${existingAlice.displayName}`);
      console.log(`   Created: ${existingAlice.createdAt}`);
      return existingAlice;
    }

    // Create Alice user
    const aliceUser = new User({
      username: 'alice',
      displayName: 'Alice Cooper',
      email: 'alice@example.com',
      password: 'password', // Will be hashed by pre-save middleware
      avatar: '',
      bio: 'Main TalkCart user - full platform access',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await aliceUser.save();
    
    console.log('✅ Alice user created successfully:');
    console.log(`   Email: ${aliceUser.email}`);
    console.log(`   Username: ${aliceUser.username}`);
    console.log(`   Display Name: ${aliceUser.displayName}`);
    console.log(`   User ID: ${aliceUser._id}`);
    console.log(`   Verified: ${aliceUser.isVerified}`);
    
    return aliceUser;
    
  } catch (error) {
    console.error('❌ Error creating Alice user:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await createAliceUser();
    
    console.log('');
    console.log('🎯 Alice user is ready!');
    console.log('📧 Login: alice@example.com');
    console.log('🔑 Password: password');
    
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Failed to create Alice user:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createAliceUser };
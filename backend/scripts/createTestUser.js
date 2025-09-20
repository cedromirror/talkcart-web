const mongoose = require('mongoose');
const { User } = require('../models');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createTestUser = async () => {
  try {
    // Check if test user already exists
    let testUser = await User.findOne({ email: 'test@demo.com' });
    
    if (!testUser) {
      testUser = new User({
        username: 'testuser',
        email: 'test@demo.com',
        displayName: 'Test User',
        password: 'test123', // This will be hashed by the model
        avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
        isVerified: true,
      });
      
      await testUser.save();
      console.log('✅ Test user created successfully!');
      console.log('📧 Email: test@demo.com');
      console.log('🔑 Password: test123');
    } else {
      console.log('👤 Test user already exists');
      console.log('📧 Email: test@demo.com');
      console.log('🔑 Password: test123');
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
};

const run = async () => {
  try {
    await connectDB();
    await createTestUser();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

run();
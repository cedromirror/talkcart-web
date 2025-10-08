const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage } = require('./models');

const testChatbotAPI = async () => {
  console.log('Testing Chatbot API...');
  
  try {
    // Connect to database
    await connectDB();
    
    // Test creating a chatbot conversation
    const testConversation = new ChatbotConversation({
      customerId: '64f8a0b1c2d3e4f5a6b7c8d9', // Sample user ID
      vendorId: '64f8a0b1c2d3e4f5a6b7c8e0',   // Sample vendor ID
      productId: '64f8a0b1c2d3e4f5a6b7c8e1',  // Sample product ID
      productName: 'Test Product'
    });
    
    await testConversation.save();
    console.log('✓ ChatbotConversation model working');
    
    // Test creating a chatbot message
    const testMessage = new ChatbotMessage({
      conversationId: testConversation._id,
      senderId: '64f8a0b1c2d3e4f5a6b7c8d9',
      content: 'Hello, I have a question about this product.',
      isBotMessage: false
    });
    
    await testMessage.save();
    console.log('✓ ChatbotMessage model working');
    
    // Test querying conversations
    const conversations = await ChatbotConversation.find({
      customerId: '64f8a0b1c2d3e4f5a6b7c8d9'
    }).populate('lastMessage');
    
    console.log('✓ ChatbotConversation query working');
    console.log(`Found ${conversations.length} conversations`);
    
    // Clean up test data
    await ChatbotMessage.deleteOne({ _id: testMessage._id });
    await ChatbotConversation.deleteOne({ _id: testConversation._id });
    
    console.log('✓ Test data cleaned up');
    console.log('All Chatbot API tests passed!');
    
    // Close database connection
    process.exit(0);
  } catch (error) {
    console.error('Chatbot API test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testChatbotAPI();
}

module.exports = testChatbotAPI;
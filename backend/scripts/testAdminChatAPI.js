/**
 * Test script for Admin Chat API endpoints
 * This script tests the chat functionality added to the admin panel
 */

const mongoose = require('mongoose');
const { ChatbotConversation, ChatbotMessage, User } = require('../models');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart';

async function testAdminChatAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Create a test conversation
    console.log('\n=== Test 1: Creating a test conversation ===');
    
    // Create test users if they don't exist
    let customer = await User.findOne({ username: 'test_customer' });
    if (!customer) {
      customer = new User({
        username: 'test_customer',
        email: 'test_customer@example.com',
        password: 'password123',
        role: 'user'
      });
      await customer.save();
      console.log('Created test customer:', customer.username);
    }

    let vendor = await User.findOne({ username: 'test_vendor' });
    if (!vendor) {
      vendor = new User({
        username: 'test_vendor',
        email: 'test_vendor@example.com',
        password: 'password123',
        role: 'vendor'
      });
      await vendor.save();
      console.log('Created test vendor:', vendor.username);
    }

    // Create a test conversation
    const conversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: vendor._id,
      productId: new mongoose.Types.ObjectId(),
      productName: 'Test Product',
      isActive: true,
      isResolved: false
    });
    await conversation.save();
    console.log('Created test conversation:', conversation._id);

    // Test 2: Add messages to the conversation
    console.log('\n=== Test 2: Adding messages to conversation ===');
    
    const message1 = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'Hello, I have a question about this product.',
      type: 'text',
      isBotMessage: false
    });
    await message1.save();
    console.log('Added customer message:', message1.content);

    const message2 = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Hello! Thanks for your interest. What would you like to know?',
      type: 'text',
      isBotMessage: false
    });
    await message2.save();
    console.log('Added vendor message:', message2.content);

    // Update conversation with last message
    conversation.lastMessage = message2._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('Updated conversation last message');

    // Test 3: Retrieve conversations
    console.log('\n=== Test 3: Retrieving conversations ===');
    
    const conversations = await ChatbotConversation.find({
      $or: [
        { customerId: customer._id },
        { vendorId: vendor._id }
      ]
    })
    .populate('customerId', 'username')
    .populate('vendorId', 'username')
    .populate('lastMessage')
    .sort({ lastActivity: -1 })
    .limit(10);
    
    console.log(`Found ${conversations.length} conversations:`);
    conversations.forEach(conv => {
      console.log(`- ${conv.customerId.username} ↔ ${conv.vendorId.username}: ${conv.productName}`);
      if (conv.lastMessage) {
        console.log(`  Last message: "${conv.lastMessage.content}"`);
      }
    });

    // Test 4: Retrieve messages for a conversation
    console.log('\n=== Test 4: Retrieving messages ===');
    
    const messages = await ChatbotMessage.find({
      conversationId: conversation._id
    })
    .populate('senderId', 'username')
    .sort({ createdAt: 1 });
    
    console.log(`Found ${messages.length} messages in conversation:`);
    messages.forEach(msg => {
      console.log(`- ${msg.senderId.username}: "${msg.content}"`);
    });

    // Test 5: Simulate admin sending a message
    console.log('\n=== Test 5: Admin sending a message ===');
    
    // In a real scenario, this would be sent by an admin user
    const adminMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id, // For testing, we'll use vendor as "admin"
      content: 'This is a message from the admin to help resolve this conversation.',
      type: 'text',
      isBotMessage: false
    });
    await adminMessage.save();
    console.log('Added admin message:', adminMessage.content);

    // Update conversation
    conversation.lastMessage = adminMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Test 6: Resolve conversation
    console.log('\n=== Test 6: Resolving conversation ===');
    
    conversation.isResolved = true;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('Conversation resolved');

    // Add resolution message
    const resolutionMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id, // For testing, we'll use vendor as "admin"
      content: 'This conversation has been marked as resolved by an administrator.',
      type: 'system',
      isBotMessage: true
    });
    await resolutionMessage.save();
    console.log('Added resolution message:', resolutionMessage.content);

    // Test 7: Chat analytics
    console.log('\n=== Test 7: Chat analytics ===');
    
    const totalConversations = await ChatbotConversation.countDocuments();
    const activeConversations = await ChatbotConversation.countDocuments({ 
      isActive: true, 
      isResolved: false 
    });
    const resolvedConversations = await ChatbotConversation.countDocuments({ 
      isResolved: true 
    });
    const totalMessages = await ChatbotMessage.countDocuments();
    
    console.log('Chat Analytics:');
    console.log(`- Total conversations: ${totalConversations}`);
    console.log(`- Active conversations: ${activeConversations}`);
    console.log(`- Resolved conversations: ${resolvedConversations}`);
    console.log(`- Total messages: ${totalMessages}`);

    console.log('\n=== All tests completed successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testAdminChatAPI();
}

module.exports = testAdminChatAPI;
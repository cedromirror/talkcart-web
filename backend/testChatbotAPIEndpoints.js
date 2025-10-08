const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');
const express = require('express');
const { authenticateTokenStrict } = require('./routes/auth');

// Mock request and response objects for testing
const createMockReq = (userId, body = {}, params = {}, query = {}) => ({
  user: { userId },
  body,
  params,
  query,
  app: {
    get: () => null // Mock io instance
  }
});

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  res.status().json = jest.fn().mockReturnThis();
  return res;
};

// Import the chatbot route handlers
const chatbotRoutes = require('./routes/chatbot');

// Mock the sendSuccess and sendError functions
const sendSuccess = (res, data, message = 'Success') => {
  return res.json({
    success: true,
    data,
    message
  });
};

const sendError = (res, error, statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(details && { details })
  });
};

const testChatbotAPIEndpoints = async () => {
  console.log('Testing Chatbot API Endpoints...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Setup test data
    console.log('1. Setting up test data...');
    
    // Create test users
    let vendor = await User.findOne({ username: 'api_test_vendor' });
    if (!vendor) {
      vendor = new User({
        username: 'api_test_vendor',
        email: 'api_vendor@test.com',
        password: 'test123',
        displayName: 'API Test Vendor'
      });
      await vendor.save();
    }
    
    let customer = await User.findOne({ username: 'api_test_customer' });
    if (!customer) {
      customer = new User({
        username: 'api_test_customer',
        email: 'api_customer@test.com',
        password: 'test123',
        displayName: 'API Test Customer'
      });
      await customer.save();
    }
    
    // Create test product
    let product = await Product.findOne({ name: 'API Test Product' });
    if (!product) {
      product = new Product({
        vendorId: vendor._id,
        name: 'API Test Product',
        description: 'This is a test product for API endpoint testing',
        price: 299.99,
        currency: 'USD',
        category: 'Other',
        images: [{ url: '/images/placeholder-image.png' }]
      });
      await product.save();
    }
    
    console.log('✓ Test data setup complete');
    
    // Test 2: Create conversation endpoint
    console.log('\n2. Testing create conversation endpoint...');
    
    const createConversationReq = createMockReq(customer._id.toString(), {
      vendorId: vendor._id.toString(),
      productId: product._id.toString()
    });
    const createConversationRes = createMockRes();
    
    // Mock the sendSuccess function
    const originalSendSuccess = global.sendSuccess;
    const originalSendError = global.sendError;
    global.sendSuccess = sendSuccess;
    global.sendError = sendError;
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations' && layer.route?.methods?.post)
      ?.route?.stack[0]?.handle(createConversationReq, createConversationRes);
    
    let conversationId;
    if (createConversationRes.json.mock.calls[0][0].success) {
      conversationId = createConversationRes.json.mock.calls[0][0].data.conversation._id;
      console.log('✓ Conversation created successfully');
      console.log(`  Conversation ID: ${conversationId}`);
    } else {
      throw new Error(`Failed to create conversation: ${createConversationRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 3: Send message endpoint
    console.log('\n3. Testing send message endpoint...');
    
    const sendMessageReq = createMockReq(customer._id.toString(), {
      content: 'Hello vendor, I am interested in this product. Can you tell me more about it?'
    }, {
      id: conversationId
    });
    const sendMessageRes = createMockRes();
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route?.methods?.post)
      ?.route?.stack[0]?.handle(sendMessageReq, sendMessageRes);
    
    let messageId;
    if (sendMessageRes.json.mock.calls[0][0].success) {
      messageId = sendMessageRes.json.mock.calls[0][0].data.message._id;
      console.log('✓ Message sent successfully');
      console.log(`  Message ID: ${messageId}`);
    } else {
      throw new Error(`Failed to send message: ${sendMessageRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 4: Get messages endpoint
    console.log('\n4. Testing get messages endpoint...');
    
    const getMessagesReq = createMockReq(customer._id.toString(), {}, {
      id: conversationId
    }, {
      limit: 10,
      page: 1
    });
    const getMessagesRes = createMockRes();
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route?.methods?.get)
      ?.route?.stack[0]?.handle(getMessagesReq, getMessagesRes);
    
    if (getMessagesRes.json.mock.calls[0][0].success) {
      const messages = getMessagesRes.json.mock.calls[0][0].data.messages;
      console.log(`✓ Retrieved ${messages.length} messages`);
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. "${msg.content}"`);
      });
    } else {
      throw new Error(`Failed to get messages: ${getMessagesRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 5: Get conversation endpoint
    console.log('\n5. Testing get conversation endpoint...');
    
    const getConversationReq = createMockReq(customer._id.toString(), {}, {
      id: conversationId
    });
    const getConversationRes = createMockRes();
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations/:id' && layer.route?.methods?.get)
      ?.route?.stack[0]?.handle(getConversationReq, getConversationRes);
    
    if (getConversationRes.json.mock.calls[0][0].success) {
      const conversation = getConversationRes.json.mock.calls[0][0].data.conversation;
      console.log('✓ Conversation retrieved successfully');
      console.log(`  Product: ${conversation.productId.name}`);
      console.log(`  Participants: ${conversation.customerId.username} and ${conversation.vendorId.username}`);
    } else {
      throw new Error(`Failed to get conversation: ${getConversationRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 6: Get conversations endpoint
    console.log('\n6. Testing get conversations endpoint...');
    
    const getConversationsReq = createMockReq(customer._id.toString(), {}, {}, {
      limit: 10,
      page: 1
    });
    const getConversationsRes = createMockRes();
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations' && layer.route?.methods?.get)
      ?.route?.stack[0]?.handle(getConversationsReq, getConversationsRes);
    
    if (getConversationsRes.json.mock.calls[0][0].success) {
      const conversations = getConversationsRes.json.mock.calls[0][0].data.conversations;
      console.log(`✓ Retrieved ${conversations.length} conversations`);
    } else {
      throw new Error(`Failed to get conversations: ${getConversationsRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 7: Vendor sends response
    console.log('\n7. Testing vendor response...');
    
    const vendorResponseReq = createMockReq(vendor._id.toString(), {
      content: 'Thank you for your interest! This product is one of our best sellers. We have 10 units in stock and can ship within 24 hours.'
    }, {
      id: conversationId
    });
    const vendorResponseRes = createMockRes();
    
    await chatbotRoutes.stack.find(layer => layer.route?.path === '/conversations/:id/messages' && layer.route?.methods?.post)
      ?.route?.stack[0]?.handle(vendorResponseReq, vendorResponseRes);
    
    if (vendorResponseRes.json.mock.calls[0][0].success) {
      console.log('✓ Vendor response sent successfully');
    } else {
      throw new Error(`Failed to send vendor response: ${vendorResponseRes.json.mock.calls[0][0].error}`);
    }
    
    // Test 8: Cleanup
    console.log('\n8. Cleaning up test data...');
    
    await ChatbotMessage.deleteMany({ conversationId });
    await ChatbotConversation.deleteOne({ _id: conversationId });
    
    console.log('✓ Test data cleanup successful');
    
    // Restore original functions
    if (originalSendSuccess) global.sendSuccess = originalSendSuccess;
    if (originalSendError) global.sendError = originalSendError;
    
    console.log('\n🎉 All Chatbot API Endpoint Tests Passed!');
    console.log('\n✅ Summary:');
    console.log('  - Create conversation endpoint: Working');
    console.log('  - Send message endpoint: Working');
    console.log('  - Get messages endpoint: Working');
    console.log('  - Get conversation endpoint: Working');
    console.log('  - Get conversations endpoint: Working');
    console.log('  - Vendor response functionality: Working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Chatbot API endpoint test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testChatbotAPIEndpoints();
}

module.exports = testChatbotAPIEndpoints;
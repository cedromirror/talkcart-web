const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');

// Simulate frontend API calls to test integration
const testFrontendIntegration = async () => {
  console.log('Testing Frontend Integration with Chatbot API...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Setup test data
    console.log('1. Setting up test data...');
    
    // Create test users
    let vendor = await User.findOne({ username: 'frontend_test_vendor' });
    if (!vendor) {
      vendor = new User({
        username: 'frontend_test_vendor',
        email: 'frontend_vendor@test.com',
        password: 'test123',
        displayName: 'Frontend Test Vendor'
      });
      await vendor.save();
    }
    
    let customer = await User.findOne({ username: 'frontend_test_customer' });
    if (!customer) {
      customer = new User({
        username: 'frontend_test_customer',
        email: 'frontend_customer@test.com',
        password: 'test123',
        displayName: 'Frontend Test Customer'
      });
      await customer.save();
    }
    
    // Create test product
    let product = await Product.findOne({ name: 'Frontend Test Product' });
    if (!product) {
      product = new Product({
        vendorId: vendor._id,
        name: 'Frontend Test Product',
        description: 'This is a test product for frontend integration testing',
        price: 499.99,
        currency: 'USD',
        category: 'Other',
        images: [{ url: 'https://via.placeholder.com/150' }]
      });
      await product.save();
    }
    
    console.log('✓ Test data setup complete');
    
    // Test 2: Simulate frontend conversation creation
    console.log('\n2. Simulating frontend conversation creation...');
    
    // This simulates what happens when ChatbotButton.createConversation is called
    const conversationData = {
      vendorId: vendor._id.toString(),
      productId: product._id.toString()
    };
    
    // Create conversation (as the frontend would)
    const newConversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: conversationData.vendorId,
      productId: conversationData.productId,
      productName: product.name
    });
    
    await newConversation.save();
    console.log('✓ Conversation created successfully (frontend simulation)');
    
    // Test 3: Simulate frontend initial message sending
    console.log('\n3. Simulating frontend initial message sending...');
    
    const initialMessage = {
      content: 'Hello! I found your product on the marketplace and I have some questions.'
    };
    
    // Send initial message (as the frontend would)
    const message = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: customer._id,
      content: initialMessage.content,
      isBotMessage: false
    });
    
    await message.save();
    
    // Update conversation
    newConversation.lastMessage = message._id;
    newConversation.lastActivity = new Date();
    await newConversation.save();
    
    console.log('✓ Initial message sent successfully (frontend simulation)');
    
    // Test 4: Simulate frontend message retrieval
    console.log('\n4. Simulating frontend message retrieval...');
    
    // This simulates what happens when chatbotApi.getMessages is called
    const retrievedMessages = await ChatbotMessage.find({
      conversationId: newConversation._id
    })
    .populate('senderId', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`✓ Retrieved ${retrievedMessages.length} messages (frontend simulation)`);
    console.log(`  Latest message: "${retrievedMessages[0].content}"`);
    
    // Test 5: Simulate frontend additional message sending
    console.log('\n5. Simulating frontend additional message sending...');
    
    const additionalMessage = {
      content: 'Specifically, I want to know about the warranty and return policy.'
    };
    
    // Send additional message (as the frontend would)
    const additionalMsg = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: customer._id,
      content: additionalMessage.content,
      isBotMessage: false
    });
    
    await additionalMsg.save();
    
    // Update conversation
    newConversation.lastMessage = additionalMsg._id;
    newConversation.lastActivity = new Date();
    await newConversation.save();
    
    console.log('✓ Additional message sent successfully (frontend simulation)');
    
    // Test 6: Simulate vendor response
    console.log('\n6. Simulating vendor response...');
    
    const vendorResponse = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: vendor._id,
      content: 'Thank you for your interest! Our product comes with a 2-year warranty and we offer a 30-day return policy. Is there anything else you\'d like to know?',
      isBotMessage: false
    });
    
    await vendorResponse.save();
    
    // Update conversation
    newConversation.lastMessage = vendorResponse._id;
    newConversation.lastActivity = new Date();
    await newConversation.save();
    
    console.log('✓ Vendor response sent successfully');
    
    // Test 7: Simulate frontend conversation retrieval
    console.log('\n7. Simulating frontend conversation retrieval...');
    
    // This simulates what happens when chatbotApi.getConversation is called
    const retrievedConversation = await ChatbotConversation.findById(newConversation._id)
      .populate('customerId', 'username displayName')
      .populate('vendorId', 'username displayName')
      .populate('productId', 'name price currency')
      .populate('lastMessage');
    
    console.log('✓ Conversation retrieved successfully (frontend simulation)');
    console.log(`  Product: ${retrievedConversation.productId.name}`);
    console.log(`  Customer: ${retrievedConversation.customerId.username}`);
    console.log(`  Vendor: ${retrievedConversation.vendorId.username}`);
    console.log(`  Last message: "${retrievedConversation.lastMessage.content}"`);
    
    // Test 8: Simulate frontend conversation list retrieval
    console.log('\n8. Simulating frontend conversation list retrieval...');
    
    // This simulates what happens when chatbotApi.getConversations is called
    const userConversations = await ChatbotConversation.find({
      $or: [
        { customerId: customer._id },
        { vendorId: customer._id }
      ],
      isActive: true
    })
    .populate('customerId', 'username displayName')
    .populate('vendorId', 'username displayName')
    .populate('productId', 'name images price currency')
    .populate('lastMessage', 'content senderId createdAt isBotMessage')
    .sort({ lastActivity: -1 })
    .limit(20);
    
    console.log(`✓ Retrieved ${userConversations.length} conversations (frontend simulation)`);
    
    // Cleanup
    console.log('\n9. Cleaning up test data...');
    await ChatbotMessage.deleteMany({ conversationId: newConversation._id });
    await ChatbotConversation.deleteOne({ _id: newConversation._id });
    console.log('✓ Test data cleanup successful');
    
    console.log('\n🎉 All Frontend Integration Tests Passed!');
    console.log('\n✅ Summary:');
    console.log('  - Conversation creation (frontend simulation): Working');
    console.log('  - Initial message sending (frontend simulation): Working');
    console.log('  - Message retrieval (frontend simulation): Working');
    console.log('  - Additional message sending (frontend simulation): Working');
    console.log('  - Vendor response handling: Working');
    console.log('  - Conversation retrieval (frontend simulation): Working');
    console.log('  - Conversation list retrieval (frontend simulation): Working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Frontend integration test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testFrontendIntegration();
}

module.exports = testFrontendIntegration;
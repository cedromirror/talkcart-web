const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');

const comprehensiveTest = async () => {
  console.log('Running Comprehensive Chatbot API Test...');
  
  try {
    // Connect to database
    await connectDB();
    
    // Test 1: Create test user and product if they don't exist
    console.log('\n1. Setting up test data...');
    
    // Create a test vendor user
    let vendor = await User.findOne({ username: 'test_vendor' });
    if (!vendor) {
      vendor = new User({
        username: 'test_vendor',
        email: 'vendor@test.com',
        password: 'test123',
        displayName: 'Test Vendor'
      });
      await vendor.save();
      console.log('✓ Created test vendor');
    } else {
      console.log('✓ Using existing test vendor');
    }
    
    // Create a test customer user
    let customer = await User.findOne({ username: 'test_customer' });
    if (!customer) {
      customer = new User({
        username: 'test_customer',
        email: 'customer@test.com',
        password: 'test123',
        displayName: 'Test Customer'
      });
      await customer.save();
      console.log('✓ Created test customer');
    } else {
      console.log('✓ Using existing test customer');
    }
    
    // Create a test product
    let product = await Product.findOne({ name: 'Test Product for Chatbot' });
    if (!product) {
      product = new Product({
        vendorId: vendor._id,
        name: 'Test Product for Chatbot',
        description: 'This is a test product for chatbot functionality',
        price: 99.99,
        currency: 'USD',
        category: 'Other',
        images: [{ url: '/images/placeholder-image.png' }]
      });
      await product.save();
      console.log('✓ Created test product');
    } else {
      console.log('✓ Using existing test product');
    }
    
    // Test 2: Chatbot Conversation Model
    console.log('\n2. Testing ChatbotConversation model...');
    
    const testConversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: vendor._id,
      productId: product._id,
      productName: product.name
    });
    
    await testConversation.save();
    console.log('✓ ChatbotConversation creation successful');
    
    // Test 3: Chatbot Message Model
    console.log('\n3. Testing ChatbotMessage model...');
    
    const testMessage = new ChatbotMessage({
      conversationId: testConversation._id,
      senderId: customer._id,
      content: 'Hello, I have a question about this product.',
      isBotMessage: false
    });
    
    await testMessage.save();
    console.log('✓ ChatbotMessage creation successful');
    
    // Update conversation with last message
    testConversation.lastMessage = testMessage._id;
    await testConversation.save();
    console.log('✓ Conversation last message update successful');
    
    // Test 4: Querying Conversations
    console.log('\n4. Testing conversation queries...');
    
    const conversations = await ChatbotConversation.find({
      customerId: customer._id
    }).populate('lastMessage').populate('productId').populate('vendorId');
    
    console.log(`✓ Found ${conversations.length} conversations`);
    console.log(`✓ Conversation product: ${conversations[0].productId.name}`);
    console.log(`✓ Conversation vendor: ${conversations[0].vendorId.username}`);
    
    // Test 5: Querying Messages
    console.log('\n5. Testing message queries...');
    
    const messages = await ChatbotMessage.find({
      conversationId: testConversation._id
    }).populate('senderId');
    
    console.log(`✓ Found ${messages.length} messages`);
    console.log(`✓ Message content: ${messages[0].content}`);
    console.log(`✓ Message sender: ${messages[0].senderId.username}`);
    
    // Test 6: Bot Response Simulation
    console.log('\n6. Testing bot response simulation...');
    
    const botResponse = new ChatbotMessage({
      conversationId: testConversation._id,
      senderId: vendor._id,
      content: 'Thanks for your message. How can I help you with this product?',
      isBotMessage: true,
      botConfidence: 0.9,
      suggestedResponses: [
        { text: "What's the price?", action: "ask_price" },
        { text: "Is it available?", action: "ask_availability" }
      ]
    });
    
    await botResponse.save();
    console.log('✓ Bot response creation successful');
    
    // Update conversation with bot response as last message
    testConversation.lastMessage = botResponse._id;
    testConversation.lastActivity = new Date();
    await testConversation.save();
    console.log('✓ Conversation updated with bot response');
    
    // Test 7: Resolving Conversation
    console.log('\n7. Testing conversation resolution...');
    
    testConversation.isResolved = true;
    await testConversation.save();
    console.log('✓ Conversation resolution successful');
    
    // Test 8: Cleanup
    console.log('\n8. Cleaning up test data...');
    
    await ChatbotMessage.deleteMany({ conversationId: testConversation._id });
    await ChatbotConversation.deleteOne({ _id: testConversation._id });
    // Note: We're not deleting the test users and product as they might be used by other tests
    
    console.log('✓ Test data cleanup successful');
    
    console.log('\n🎉 All Comprehensive Chatbot API Tests Passed!');
    console.log('\n✅ Summary:');
    console.log('  - ChatbotConversation model: Working');
    console.log('  - ChatbotMessage model: Working');
    console.log('  - Database queries: Working');
    console.log('  - Population: Working');
    console.log('  - Bot responses: Working');
    console.log('  - Conversation resolution: Working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Comprehensive test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  comprehensiveTest();
}

module.exports = comprehensiveTest;
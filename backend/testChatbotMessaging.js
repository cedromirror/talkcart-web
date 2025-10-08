const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');

const testChatbotMessaging = async () => {
  console.log('Testing Chatbot Send/Receive Message Functionality...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Test 1: Create test users and product if they don't exist
    console.log('1. Setting up test data...');
    
    // Create a test vendor user
    let vendor = await User.findOne({ username: 'test_vendor_messaging' });
    if (!vendor) {
      vendor = new User({
        username: 'test_vendor_messaging',
        email: 'vendor_messaging@test.com',
        password: 'test123',
        displayName: 'Test Vendor Messaging'
      });
      await vendor.save();
      console.log('✓ Created test vendor');
    } else {
      console.log('✓ Using existing test vendor');
    }
    
    // Create a test customer user
    let customer = await User.findOne({ username: 'test_customer_messaging' });
    if (!customer) {
      customer = new User({
        username: 'test_customer_messaging',
        email: 'customer_messaging@test.com',
        password: 'test123',
        displayName: 'Test Customer Messaging'
      });
      await customer.save();
      console.log('✓ Created test customer');
    } else {
      console.log('✓ Using existing test customer');
    }
    
    // Create a test product
    let product = await Product.findOne({ name: 'Test Product for Messaging' });
    if (!product) {
      product = new Product({
        vendorId: vendor._id,
        name: 'Test Product for Messaging',
        description: 'This is a test product for messaging functionality',
        price: 199.99,
        currency: 'USD',
        category: 'Other',
        images: [{ url: 'https://via.placeholder.com/150' }]
      });
      await product.save();
      console.log('✓ Created test product');
    } else {
      console.log('✓ Using existing test product');
    }
    
    // Test 2: Create chatbot conversation
    console.log('\n2. Creating chatbot conversation...');
    
    const conversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: vendor._id,
      productId: product._id,
      productName: product.name
    });
    
    await conversation.save();
    console.log('✓ Chatbot conversation created successfully');
    
    // Test 3: Send customer message
    console.log('\n3. Sending customer message...');
    
    const customerMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'Hello, I have a question about this product. Is it still available?',
      isBotMessage: false
    });
    
    await customerMessage.save();
    console.log('✓ Customer message sent successfully');
    
    // Update conversation with last message
    conversation.lastMessage = customerMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('✓ Conversation updated with customer message');
    
    // Test 4: Send vendor response
    console.log('\n4. Sending vendor response...');
    
    const vendorMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Yes, this product is still available. We have 5 units in stock. How many would you like to purchase?',
      isBotMessage: false
    });
    
    await vendorMessage.save();
    console.log('✓ Vendor response sent successfully');
    
    // Update conversation with last message
    conversation.lastMessage = vendorMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('✓ Conversation updated with vendor response');
    
    // Test 5: Test bot response simulation
    console.log('\n5. Testing bot response simulation...');
    
    const botMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id, // Bot messages are sent by vendor
      content: 'Thanks for your message about "Test Product for Messaging". A vendor representative will respond to you shortly.',
      type: 'system',
      isBotMessage: true,
      botConfidence: 0.8,
      suggestedResponses: [
        { text: "What's the price?", action: "ask_price" },
        { text: "Is it available?", action: "ask_availability" },
        { text: "Can I get more details?", action: "ask_details" }
      ]
    });
    
    await botMessage.save();
    console.log('✓ Bot response created successfully');
    
    // Update conversation with last message
    conversation.lastMessage = botMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('✓ Conversation updated with bot response');
    
    // Test 6: Retrieve messages
    console.log('\n6. Retrieving messages...');
    
    const messages = await ChatbotMessage.find({
      conversationId: conversation._id
    })
    .populate('senderId', 'username displayName')
    .sort({ createdAt: 1 }); // Oldest first
    
    console.log(`✓ Retrieved ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.senderId.username}: "${msg.content}" (${msg.isBotMessage ? 'Bot' : 'User'})`);
    });
    
    // Test 7: Verify conversation details
    console.log('\n7. Verifying conversation details...');
    
    const updatedConversation = await ChatbotConversation.findById(conversation._id)
      .populate('customerId', 'username')
      .populate('vendorId', 'username')
      .populate('productId', 'name')
      .populate('lastMessage');
    
    console.log(`✓ Conversation last message: "${updatedConversation.lastMessage.content}"`);
    console.log(`✓ Conversation participants: ${updatedConversation.customerId.username} and ${updatedConversation.vendorId.username}`);
    console.log(`✓ Conversation product: ${updatedConversation.productName}`);
    
    // Test 8: Cleanup
    console.log('\n8. Cleaning up test data...');
    
    await ChatbotMessage.deleteMany({ conversationId: conversation._id });
    await ChatbotConversation.deleteOne({ _id: conversation._id });
    // Note: We're not deleting the test users and product as they might be used by other tests
    
    console.log('✓ Test data cleanup successful');
    
    console.log('\n🎉 All Chatbot Messaging Tests Passed!');
    console.log('\n✅ Summary:');
    console.log('  - Conversation creation: Working');
    console.log('  - Customer message sending: Working');
    console.log('  - Vendor message sending: Working');
    console.log('  - Bot response simulation: Working');
    console.log('  - Message retrieval: Working');
    console.log('  - Conversation updates: Working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Chatbot messaging test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testChatbotMessaging();
}

module.exports = testChatbotMessaging;
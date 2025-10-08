const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');

const testChatbotFullIntegration = async () => {
  console.log('Testing Full Chatbot Integration...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Setup test data
    console.log('1. Setting up test data...');
    
    // Create test vendor user
    const vendor = new User({
      username: 'integration_vendor_' + Math.random().toString(36).substring(2, 8),
      email: 'integration_vendor_' + Math.random().toString(36).substring(2, 8) + '@test.com',
      password: 'test123',
      displayName: 'Integration Test Vendor',
      role: 'vendor'
    });
    await vendor.save();
    
    // Create test customer user
    const customer = new User({
      username: 'integration_customer_' + Math.random().toString(36).substring(2, 8),
      email: 'integration_customer_' + Math.random().toString(36).substring(2, 8) + '@test.com',
      password: 'test123',
      displayName: 'Integration Test Customer',
      role: 'user'
    });
    await customer.save();
    
    // Create test product
    const product = new Product({
      vendorId: vendor._id,
      name: 'Integration Product ' + Math.random().toString(36).substring(2, 8),
      description: 'This is a test product for integration testing',
      price: 399.99,
      currency: 'USD',
      category: 'Other',
      images: [{ url: 'https://via.placeholder.com/150' }]
    });
    await product.save();
    
    console.log('✓ Test data setup complete');
    
    // Test 1: Create chatbot conversation
    console.log('\n2. Testing conversation creation...');
    
    const conversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: vendor._id,
      productId: product._id,
      productName: product.name
    });
    
    await conversation.save();
    console.log('✓ Chatbot conversation created successfully');
    
    // Test 2: Send customer message
    console.log('\n3. Testing message sending...');
    
    const customerMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'Hello vendor, I have a question about your product.',
      isBotMessage: false
    });
    
    await customerMessage.save();
    
    // Update conversation
    conversation.lastMessage = customerMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('✓ Customer message sent successfully');
    
    // Test 3: Send vendor response
    console.log('\n4. Testing vendor response...');
    
    const vendorMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Hello! Thank you for your interest. What would you like to know about the product?',
      isBotMessage: false
    });
    
    await vendorMessage.save();
    
    // Update conversation
    conversation.lastMessage = vendorMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('✓ Vendor response sent successfully');
    
    // Test 4: Retrieve messages
    console.log('\n5. Testing message retrieval...');
    
    const messages = await ChatbotMessage.find({
      conversationId: conversation._id
    })
    .populate('senderId', 'username displayName')
    .sort({ createdAt: 1 });
    
    console.log(`✓ Retrieved ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.senderId.username}: "${msg.content}"`);
    });
    
    // Test 5: Search vendors functionality
    console.log('\n6. Testing vendor search functionality...');
    
    // Simulate vendor search query
    const productVendors = await Product.distinct('vendorId', { isActive: true });
    console.log(`✓ Found ${productVendors.length} vendors with active products`);
    
    // Build vendor query
    let vendorQuery = {};
    if (productVendors.length > 0) {
      vendorQuery._id = { $in: productVendors };
    }
    
    // Add search filter
    const searchQuery = 'integration';
    vendorQuery.$or = [
      { username: { $regex: searchQuery, $options: 'i' } },
      { displayName: { $regex: searchQuery, $options: 'i' } }
    ];
    
    // Execute vendor search
    const vendors = await User.find(vendorQuery, 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`✓ Found ${vendors.length} vendors matching search query`);
    vendors.forEach(vendor => {
      console.log(`  - ${vendor.displayName} (${vendor.username})`);
    });
    
    // Test 6: Verify conversation retrieval
    console.log('\n7. Testing conversation retrieval...');
    
    const retrievedConversation = await ChatbotConversation.findById(conversation._id)
      .populate('customerId', 'username displayName')
      .populate('vendorId', 'username displayName')
      .populate('productId', 'name')
      .populate('lastMessage');
    
    console.log('✓ Conversation retrieved successfully');
    console.log(`  Product: ${retrievedConversation.productId.name}`);
    console.log(`  Customer: ${retrievedConversation.customerId.displayName}`);
    console.log(`  Vendor: ${retrievedConversation.vendorId.displayName}`);
    console.log(`  Last message: "${retrievedConversation.lastMessage.content}"`);
    
    // Test 7: Test conversation resolution
    console.log('\n8. Testing conversation resolution...');
    
    retrievedConversation.isResolved = true;
    retrievedConversation.lastActivity = new Date();
    await retrievedConversation.save();
    
    const resolutionMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'This conversation has been marked as resolved. Thank you for your inquiry!',
      type: 'system',
      isBotMessage: true
    });
    
    await resolutionMessage.save();
    
    console.log('✓ Conversation resolved successfully');
    
    // Cleanup
    console.log('\n9. Cleaning up test data...');
    await ChatbotMessage.deleteMany({ conversationId: conversation._id });
    await ChatbotConversation.deleteOne({ _id: conversation._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ 
      _id: { 
        $in: [vendor._id, customer._id] 
      } 
    });
    console.log('✓ Test data cleanup successful');
    
    console.log('\n🎉 All Chatbot Integration Tests Passed!');
    console.log('\n✅ Summary:');
    console.log('  - Conversation creation: Working');
    console.log('  - Message sending/receiving: Working');
    console.log('  - Vendor search functionality: Working');
    console.log('  - Conversation retrieval: Working');
    console.log('  - Conversation resolution: Working');
    console.log('  - Data cleanup: Working');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Chatbot integration test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testChatbotFullIntegration();
}

module.exports = testChatbotFullIntegration;
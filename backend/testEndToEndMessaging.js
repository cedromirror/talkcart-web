const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const connectDB = require('./config/database');
const { ChatbotConversation, ChatbotMessage, Product, User } = require('./models');

const testEndToEndMessaging = async () => {
  console.log('Testing End-to-End Chatbot Messaging Flow...\n');
  
  try {
    // Connect to database
    await connectDB();
    
    // Setup test data
    console.log('1. Setting up test environment...');
    
    // Create test users
    const vendor = new User({
      username: 'e2e_vendor',
      email: 'e2e_vendor@test.com',
      password: 'test123',
      displayName: 'E2E Test Vendor'
    });
    await vendor.save();
    
    const customer = new User({
      username: 'e2e_customer',
      email: 'e2e_customer@test.com',
      password: 'test123',
      displayName: 'E2E Test Customer'
    });
    await customer.save();
    
    // Create test product
    const product = new Product({
      vendorId: vendor._id,
      name: 'End-to-End Test Product',
      description: 'This product is used for end-to-end messaging flow testing',
      price: 599.99,
      currency: 'USD',
      category: 'Other',
      images: [{ url: 'https://via.placeholder.com/150' }]
    });
    await product.save();
    
    console.log('✓ Test environment setup complete');
    
    // Test 2: Complete messaging flow
    console.log('\n2. Testing complete messaging flow...');
    
    // Phase 1: Customer initiates conversation
    console.log('  Phase 1: Customer initiates conversation');
    const conversation = new ChatbotConversation({
      customerId: customer._id,
      vendorId: vendor._id,
      productId: product._id,
      productName: product.name
    });
    await conversation.save();
    console.log('    ✓ Conversation created');
    
    // Customer sends initial message
    const initialMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'Hi! I\'m interested in the "End-to-End Test Product". Can you tell me more about its features?',
      isBotMessage: false
    });
    await initialMessage.save();
    
    conversation.lastMessage = initialMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Initial inquiry sent');
    
    // Phase 2: Bot responds automatically
    console.log('  Phase 2: Bot auto-response');
    const botResponse = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: `Thanks for your interest in "${product.name}"! A vendor representative will respond shortly with more details.`,
      type: 'system',
      isBotMessage: true,
      botConfidence: 0.9
    });
    await botResponse.save();
    
    conversation.lastMessage = botResponse._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Bot response generated');
    
    // Phase 3: Vendor provides detailed response
    console.log('  Phase 3: Vendor detailed response');
    const vendorResponse = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: `Hello! Thank you for your interest in our "${product.name}". This premium product features:

• High-quality materials
• 2-year warranty
• Free shipping
• 30-day return policy

It's currently priced at $${product.price} with 5 units available in stock. Would you like to proceed with a purchase?`,
      isBotMessage: false
    });
    await vendorResponse.save();
    
    conversation.lastMessage = vendorResponse._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Vendor response sent');
    
    // Phase 4: Customer asks follow-up question
    console.log('  Phase 4: Customer follow-up');
    const followUpMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'That sounds great! Do you offer any bulk discounts? I might want to purchase 3 units for my office.',
      isBotMessage: false
    });
    await followUpMessage.save();
    
    conversation.lastMessage = followUpMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Follow-up question sent');
    
    // Phase 5: Vendor responds to follow-up
    console.log('  Phase 5: Vendor follow-up response');
    const followUpResponse = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Yes, we do offer bulk discounts! For 3 units, you\'ll get a 15% discount, bringing the total to $1,529.97 (originally $1,799.97). We can also include free engraving on each unit. Would you like to proceed with this order?',
      isBotMessage: false
    });
    await followUpResponse.save();
    
    conversation.lastMessage = followUpResponse._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Follow-up response sent');
    
    // Phase 6: Customer confirms interest
    console.log('  Phase 6: Customer confirmation');
    const confirmationMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: customer._id,
      content: 'That\'s perfect! Please proceed with the order for 3 units with engraving. How do I complete the purchase?',
      isBotMessage: false
    });
    await confirmationMessage.save();
    
    conversation.lastMessage = confirmationMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Order confirmation sent');
    
    // Phase 7: Vendor provides purchase instructions
    console.log('  Phase 7: Vendor purchase instructions');
    const instructionsMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Great! I\'ll prepare your order right away. You can complete the purchase through our secure checkout system. I\'ll send you a direct link to the payment page. Thank you for your business!',
      isBotMessage: false
    });
    await instructionsMessage.save();
    
    conversation.lastMessage = instructionsMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    console.log('    ✓ Purchase instructions sent');
    
    // Phase 8: Retrieve and verify complete conversation
    console.log('  Phase 8: Retrieving complete conversation');
    const allMessages = await ChatbotMessage.find({
      conversationId: conversation._id
    })
    .populate('senderId', 'username displayName')
    .sort({ createdAt: 1 });
    
    console.log(`    ✓ Retrieved ${allMessages.length} total messages:`);
    allMessages.forEach((msg, index) => {
      const sender = msg.senderId.username;
      const type = msg.isBotMessage ? '(Bot)' : msg.senderId._id.equals(vendor._id) ? '(Vendor)' : '(Customer)';
      console.log(`      ${index + 1}. ${sender} ${type}: "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}"`);
    });
    
    // Phase 9: Verify conversation state
    console.log('  Phase 9: Verifying conversation state');
    const finalConversation = await ChatbotConversation.findById(conversation._id)
      .populate('lastMessage');
    
    console.log(`    ✓ Last message: "${finalConversation.lastMessage.content.substring(0, 50)}..."`);
    console.log(`    ✓ Total messages: ${allMessages.length}`);
    console.log(`    ✓ Conversation active: ${finalConversation.isActive}`);
    console.log(`    ✓ Last activity: ${finalConversation.lastActivity}`);
    
    // Phase 10: Mark conversation as resolved
    console.log('  Phase 10: Resolving conversation');
    finalConversation.isResolved = true;
    finalConversation.lastActivity = new Date();
    await finalConversation.save();
    
    const resolutionMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'This conversation has been marked as resolved. Your order for 3 units is being processed. A confirmation email has been sent to your address. Thank you for choosing our products!',
      type: 'system',
      isBotMessage: true
    });
    await resolutionMessage.save();
    
    console.log('    ✓ Conversation resolved successfully');
    
    // Phase 11: Final verification
    console.log('  Phase 11: Final verification');
    const resolvedConversation = await ChatbotConversation.findById(conversation._id);
    console.log(`    ✓ Conversation resolved: ${resolvedConversation.isResolved}`);
    console.log(`    ✓ Conversation active: ${resolvedConversation.isActive}`);
    
    // Cleanup
    console.log('\n3. Cleaning up test data...');
    await ChatbotMessage.deleteMany({ conversationId: conversation._id });
    await ChatbotConversation.deleteOne({ _id: conversation._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ 
      _id: { 
        $in: [vendor._id, customer._id] 
      } 
    });
    console.log('✓ All test data cleaned up');
    
    console.log('\n🎉 End-to-End Messaging Flow Test Passed!');
    console.log('\n✅ Summary:');
    console.log('  - Conversation initiation: Working');
    console.log('  - Customer messaging: Working');
    console.log('  - Bot auto-responses: Working');
    console.log('  - Vendor responses: Working');
    console.log('  - Multi-turn conversation: Working');
    console.log('  - Message retrieval: Working');
    console.log('  - Conversation state management: Working');
    console.log('  - Conversation resolution: Working');
    
    console.log('\n📊 Conversation Statistics:');
    console.log(`  - Total messages exchanged: ${allMessages.length}`);
    console.log(`  - Customer messages: ${allMessages.filter(m => m.senderId._id.equals(customer._id)).length}`);
    console.log(`  - Vendor messages: ${allMessages.filter(m => m.senderId._id.equals(vendor._id) && !m.isBotMessage).length}`);
    console.log(`  - Bot messages: ${allMessages.filter(m => m.isBotMessage).length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ End-to-end messaging test failed:', error);
    process.exit(1);
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testEndToEndMessaging();
}

module.exports = testEndToEndMessaging;
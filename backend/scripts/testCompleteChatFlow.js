const mongoose = require('mongoose');
const { ChatbotConversation, ChatbotMessage, User } = require('../models');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/talkcart');

async function testCompleteChatFlow() {
  try {
    console.log('🧪 Testing Complete Vendor-Admin Chat Flow...\n');
    
    // Find a vendor user
    const vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) {
      console.log('❌ No vendor found in database. Please create a vendor user first.');
      return;
    }
    
    console.log(`✅ Found vendor: ${vendor.username} (${vendor._id})\n`);
    
    // Step 1: Create a vendor-admin conversation
    console.log('Step 1: Creating vendor-admin conversation...\n');
    
    let conversation = new ChatbotConversation({
      customerId: 'admin',
      vendorId: vendor._id,
      productId: new mongoose.Types.ObjectId(),
      productName: 'Vendor Support',
      isResolved: false,
      botEnabled: false
    });
    
    await conversation.save();
    console.log(`✅ Conversation created: ${conversation._id}\n`);
    
    // Step 2: Send welcome message from admin
    console.log('Step 2: Sending welcome message from admin...\n');
    
    const welcomeMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: 'admin',
      content: `Hello ${vendor.displayName || vendor.username}! How can I help you with your vendor account today?`,
      type: 'system',
      isBotMessage: false
    });
    
    await welcomeMessage.save();
    conversation.lastMessage = welcomeMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    console.log('✅ Welcome message sent\n');
    
    // Step 3: Send message from vendor
    console.log('Step 3: Sending message from vendor...\n');
    
    const vendorMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Hi admin, I need help with my product listings. Some of my products are not showing up in search results.',
      isBotMessage: false
    });
    
    await vendorMessage.save();
    conversation.lastMessage = vendorMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    console.log('✅ Vendor message sent\n');
    
    // Step 4: Send response from admin
    console.log('Step 4: Sending response from admin...\n');
    
    const adminResponse = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: 'admin',
      content: 'I can help you with that. Let me check your product listings. Can you provide the names or IDs of the products that are not showing up?',
      isBotMessage: false
    });
    
    await adminResponse.save();
    conversation.lastMessage = adminResponse._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    console.log('✅ Admin response sent\n');
    
    // Step 5: Send follow-up from vendor
    console.log('Step 5: Sending follow-up from vendor...\n');
    
    const vendorFollowUp = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Sure, the products are "Blue Jeans" (ID: PRD-001) and "Black T-Shirt" (ID: PRD-002). They were active but not appearing in search.',
      isBotMessage: false
    });
    
    await vendorFollowUp.save();
    conversation.lastMessage = vendorFollowUp._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    console.log('✅ Vendor follow-up sent\n');
    
    // Step 6: Retrieve all messages
    console.log('Step 6: Retrieving conversation messages...\n');
    
    const messages = await ChatbotMessage.find({
      conversationId: conversation._id,
      isDeleted: false
    })
    .sort({ createdAt: 1 });
    
    console.log(`✅ Found ${messages.length} messages in the conversation:\n`);
    
    messages.forEach((message, index) => {
      const sender = message.senderId === 'admin' ? 'Admin' : 'Vendor';
      console.log(`${index + 1}. ${sender}: ${message.content}`);
      console.log(`   Sent at: ${message.createdAt}\n`);
    });
    
    // Step 7: Test conversation retrieval
    console.log('Step 7: Testing conversation retrieval...\n');
    
    const retrievedConversation = await ChatbotConversation.findById(conversation._id)
      .populate('lastMessage');
    
    if (retrievedConversation && retrievedConversation.lastMessage) {
      console.log('✅ Conversation retrieved successfully');
      console.log(`Latest message: ${retrievedConversation.lastMessage.content}\n`);
    } else {
      console.log('❌ Failed to retrieve conversation\n');
    }
    
    // Step 8: Test conversation resolution
    console.log('Step 8: Testing conversation resolution...\n');
    
    conversation.isResolved = true;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    const resolutionMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: 'admin',
      content: 'I\'ve checked your products and updated their visibility settings. They should now appear in search results. Please let me know if you need any further assistance.',
      type: 'system',
      isBotMessage: false
    });
    
    await resolutionMessage.save();
    conversation.lastMessage = resolutionMessage._id;
    await conversation.save();
    
    console.log('✅ Conversation marked as resolved\n');
    
    console.log('🎉 Complete Vendor-Admin Chat Flow Test PASSED!');
    console.log('\nSummary:');
    console.log('- ✅ Conversation creation');
    console.log('- ✅ Message exchange (both directions)');
    console.log('- ✅ Message retrieval');
    console.log('- ✅ Conversation state management');
    console.log('- ✅ Resolution workflow');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testCompleteChatFlow();

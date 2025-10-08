const mongoose = require('mongoose');
const { ChatbotConversation, ChatbotMessage, User } = require('../models');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/talkcart');

async function debugVendorAdminChat() {
  try {
    console.log('🔍 Debugging Vendor-Admin Chat Issues...\n');
    
    // Find a vendor user
    const vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) {
      console.log('❌ No vendor found in database');
      return;
    }
    
    console.log(`✅ Found vendor: ${vendor.username} (${vendor._id})\n`);
    
    // Check for existing vendor-admin conversations
    console.log('Checking for existing vendor-admin conversations...\n');
    
    const existingConversations = await ChatbotConversation.find({
      vendorId: vendor._id,
      customerId: 'admin',
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${existingConversations.length} vendor-admin conversations:\n`);
    
    existingConversations.forEach((conv, index) => {
      console.log(`${index + 1}. Conversation ID: ${conv._id}`);
      console.log(`   Product: ${conv.productName}`);
      console.log(`   Active: ${conv.isActive}`);
      console.log(`   Resolved: ${conv.isResolved}`);
      console.log(`   Created: ${conv.createdAt}`);
      console.log(`   Last Activity: ${conv.lastActivity}`);
      console.log(`   Valid ObjectId: ${mongoose.Types.ObjectId.isValid(conv._id)}\n`);
    });
    
    if (existingConversations.length > 0) {
      // Check messages in the most recent conversation
      const recentConversation = existingConversations[0];
      console.log(`Checking messages in conversation ${recentConversation._id}...\n`);
      
      const messages = await ChatbotMessage.find({
        conversationId: recentConversation._id
      }).sort({ createdAt: 1 });
      
      console.log(`Found ${messages.length} messages:\n`);
      
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. Message ID: ${msg._id}`);
        console.log(`   Sender: ${msg.senderId}`);
        console.log(`   Content: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`   Valid conversationId: ${mongoose.Types.ObjectId.isValid(msg.conversationId)}\n`);
      });
    }
    
    // Test creating a new conversation
    console.log('Testing new conversation creation...\n');
    
    const newConversation = new ChatbotConversation({
      customerId: 'admin',
      vendorId: vendor._id,
      productId: new mongoose.Types.ObjectId(),
      productName: 'Debug Test Conversation',
      isResolved: false,
      botEnabled: false
    });
    
    await newConversation.save();
    console.log(`✅ Created new conversation: ${newConversation._id}`);
    console.log(`✅ Valid ObjectId: ${mongoose.Types.ObjectId.isValid(newConversation._id)}\n`);
    
    // Test creating a message
    const testMessage = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: vendor._id,
      content: 'This is a debug test message',
      isBotMessage: false
    });
    
    await testMessage.save();
    console.log(`✅ Created test message: ${testMessage._id}`);
    console.log(`✅ Valid conversationId: ${mongoose.Types.ObjectId.isValid(testMessage.conversationId)}\n`);
    
    // Clean up
    await ChatbotMessage.deleteMany({ conversationId: newConversation._id });
    await ChatbotConversation.findByIdAndDelete(newConversation._id);
    console.log('✅ Cleaned up test data\n');
    
    console.log('🎉 Debugging completed successfully!');
    console.log('\nIf you\'re still seeing "Invalid conversation ID" errors:');
    console.log('1. Check that conversation IDs are valid MongoDB ObjectIds');
    console.log('2. Ensure the conversation exists in the database');
    console.log('3. Verify the user has permission to access the conversation');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the debug script
debugVendorAdminChat();
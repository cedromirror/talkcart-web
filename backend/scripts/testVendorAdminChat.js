const mongoose = require('mongoose');
const { ChatbotConversation, ChatbotMessage, User } = require('../models');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/talkcart');

async function testVendorAdminChat() {
  try {
    console.log('Testing Vendor-Admin Chat Functionality...\n');
    
    // Find a vendor user
    const vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) {
      console.log('No vendor found in database. Please create a vendor user first.');
      return;
    }
    
    console.log(`Found vendor: ${vendor.username} (${vendor._id})\n`);
    
    // Check if vendor-admin conversation already exists
    let conversation = await ChatbotConversation.findOne({
      vendorId: vendor._id,
      customerId: 'admin',
      isActive: true
    });
    
    if (conversation) {
      console.log('Existing vendor-admin conversation found:');
      console.log(`Conversation ID: ${conversation._id}`);
      console.log(`Last activity: ${conversation.lastActivity}\n`);
    } else {
      // Create a new vendor-admin conversation
      console.log('Creating new vendor-admin conversation...\n');
      
      conversation = new ChatbotConversation({
        customerId: 'admin',
        vendorId: vendor._id,
        productId: new mongoose.Types.ObjectId(), // Create a dummy ObjectId
        productName: 'Vendor Support',
        isResolved: false,
        botEnabled: false
      });
      
      await conversation.save();
      
      // Create welcome message from admin
      const welcomeMessage = new ChatbotMessage({
        conversationId: conversation._id,
        senderId: 'admin',
        content: `Hello ${vendor.displayName || vendor.username}! How can I help you with your vendor account today?`,
        type: 'system',
        isBotMessage: false
      });
      
      await welcomeMessage.save();
      
      // Update conversation with last message
      conversation.lastMessage = welcomeMessage._id;
      await conversation.save();
      
      console.log('New vendor-admin conversation created successfully:');
      console.log(`Conversation ID: ${conversation._id}\n`);
    }
    
    // Send a test message from vendor
    console.log('Sending test message from vendor...\n');
    
    const vendorMessage = new ChatbotMessage({
      conversationId: conversation._id,
      senderId: vendor._id,
      content: 'Hi admin, I need help with my product listings.',
      isBotMessage: false
    });
    
    await vendorMessage.save();
    
    // Update conversation's last message and activity
    conversation.lastMessage = vendorMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();
    
    console.log('Test message sent successfully!\n');
    
    // Retrieve all messages in the conversation
    console.log('Retrieving conversation messages...\n');
    
    const messages = await ChatbotMessage.find({
      conversationId: conversation._id,
      isDeleted: false
    })
    .sort({ createdAt: 1 });
    
    console.log(`Found ${messages.length} messages in the conversation:\n`);
    
    messages.forEach((message, index) => {
      const sender = message.senderId === 'admin' ? 'Admin' : 'Vendor';
      console.log(`${index + 1}. ${sender}: ${message.content}`);
      console.log(`   Sent at: ${message.createdAt}\n`);
    });
    
    console.log('✅ Vendor-Admin chat test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testVendorAdminChat();

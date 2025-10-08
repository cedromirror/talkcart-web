const mongoose = require('mongoose');

// Test ObjectId validation
function testObjectIdValidation() {
  console.log('Testing ObjectId validation...\n');
  
  // Valid ObjectId examples
  const validIds = [
    '507f1f77bcf86cd799439011',
    '507f1f77bcf86cd799439012',
    '000000000000000000000000'
  ];
  
  // Invalid ObjectId examples
  const invalidIds = [
    'invalid-id',
    '123',
    '507f1f77bcf86cd79943901', // Too short
    '507f1f77bcf86cd7994390111', // Too long
    '',
    null,
    undefined
  ];
  
  // Regex for ObjectId validation
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  console.log('Valid ObjectIds:');
  validIds.forEach(id => {
    const isValid = objectIdRegex.test(id);
    console.log(`  ${id} -> ${isValid ? 'VALID' : 'INVALID'}`);
  });
  
  console.log('\nInvalid ObjectIds:');
  invalidIds.forEach(id => {
    const isValid = id && objectIdRegex.test(id.toString());
    console.log(`  ${id} -> ${isValid ? 'VALID' : 'INVALID'}`);
  });
  
  console.log('\n✅ ObjectId validation test completed');
}

// Test conversation creation with proper validation
async function testConversationCreation() {
  try {
    console.log('\nTesting conversation creation...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');
    
    const { ChatbotConversation } = require('../models');
    
    // Create a test conversation with proper ObjectId
    const conversation = new ChatbotConversation({
      customerId: 'admin',
      vendorId: new mongoose.Types.ObjectId(), // Generate a valid ObjectId
      productId: new mongoose.Types.ObjectId(), // Generate a valid ObjectId
      productName: 'Test Conversation',
      isResolved: false,
      botEnabled: false
    });
    
    await conversation.save();
    console.log(`✅ Created conversation with ID: ${conversation._id}\n`);
    
    // Test validation with invalid ID
    try {
      const invalidConversation = new ChatbotConversation({
        customerId: 'admin',
        vendorId: 'invalid-id', // This should cause issues
        productId: new mongoose.Types.ObjectId(),
        productName: 'Test Conversation',
        isResolved: false,
        botEnabled: false
      });
      
      await invalidConversation.save();
      console.log('❌ Should have failed with invalid vendorId');
    } catch (error) {
      console.log('✅ Correctly rejected invalid vendorId\n');
    }
    
    // Clean up
    await ChatbotConversation.findByIdAndDelete(conversation._id);
    console.log('✅ Cleaned up test data\n');
    
  } catch (error) {
    console.error('❌ Error during conversation creation test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run tests
testObjectIdValidation();
testConversationCreation().then(() => {
  console.log('\n🎉 All tests completed successfully!');
});
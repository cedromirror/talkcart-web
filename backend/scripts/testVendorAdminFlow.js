const axios = require('axios');
const mongoose = require('mongoose');
const { User } = require('../models');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/talkcart');

async function testVendorAdminFlow() {
  try {
    console.log('🧪 Testing Vendor-Admin Chat Flow...\n');
    
    // Find a vendor user
    const vendor = await User.findOne({ role: 'vendor' });
    if (!vendor) {
      console.log('❌ No vendor found in database');
      return;
    }
    
    console.log(`✅ Found vendor: ${vendor.username} (${vendor._id})\n`);
    
    // Simulate the exact flow that happens in the frontend
    console.log('Step 1: Getting vendor-admin conversation...\n');
    
    try {
      // This would normally include an auth token
      const getResponse = await axios.get('http://localhost:8000/api/chatbot/conversations/vendor-admin');
      console.log('❌ Should have failed without auth token');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected request without auth token\n');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test direct conversation access with a valid ID
    console.log('Step 2: Testing direct conversation access...\n');
    
    // Get a valid conversation ID from the database
    const { ChatbotConversation } = require('../models');
    const conversation = await ChatbotConversation.findOne({
      vendorId: vendor._id,
      customerId: 'admin'
    });
    
    if (conversation) {
      console.log(`Found conversation: ${conversation._id}\n`);
      
      // Test accessing messages with this conversation ID
      try {
        // This would normally include an auth token
        const messagesResponse = await axios.get(`http://localhost:8000/api/chatbot/conversations/${conversation._id}/messages`);
        console.log('❌ Should have failed without auth token');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('✅ Correctly rejected request without auth token\n');
        } else if (error.response && error.response.status === 400) {
          console.log('Response data:', error.response.data);
          if (error.response.data && error.response.data.message === 'Invalid conversation ID') {
            console.log('❌ Found the issue: Invalid conversation ID error');
            console.log('Conversation ID was:', conversation._id);
            console.log('Type of ID:', typeof conversation._id);
            console.log('Length of ID:', conversation._id.length);
          }
        } else {
          console.log('❌ Unexpected error:', error.message);
        }
      }
    } else {
      console.log('❌ No conversation found to test with');
    }
    
    // Test with an invalid conversation ID
    console.log('Step 3: Testing with invalid conversation ID...\n');
    
    const invalidIds = [
      'invalid-id',
      '123',
      '',
      null
    ];
    
    for (const invalidId of invalidIds) {
      try {
        // This would normally include an auth token
        const response = await axios.get(`http://localhost:8000/api/chatbot/conversations/${invalidId}/messages`);
        console.log(`❌ Should have failed with invalid ID: ${invalidId}`);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log(`✅ Correctly rejected invalid ID: ${invalidId}`);
          console.log(`   Error message: ${error.response.data.message}\n`);
        } else {
          console.log(`❌ Unexpected error with ID ${invalidId}:`, error.message);
        }
      }
    }
    
    console.log('🎉 Vendor-Admin Chat Flow Test Completed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the test
testVendorAdminFlow();
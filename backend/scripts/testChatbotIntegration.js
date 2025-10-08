const axios = require('axios');

// Test chatbot integration
async function testChatbotIntegration() {
  try {
    console.log('Testing chatbot integration...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:8000/api/chatbot/health');
    console.log('Health check:', healthResponse.data);
    
    console.log('Chatbot integration test completed successfully!');
  } catch (error) {
    console.error('Chatbot integration test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

testChatbotIntegration();
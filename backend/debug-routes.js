// Debug route registration
const express = require('express');
const app = express();

// Load chatbot routes
const chatbotRoutes = require('./routes/chatbot');

console.log('Chatbot routes type:', typeof chatbotRoutes);
console.log('Chatbot routes keys:', Object.keys(chatbotRoutes));

// Register chatbot routes
app.use('/api/chatbot', chatbotRoutes);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Start server
const server = app.listen(8001, () => {
  console.log('Debug server running on port 8001');
  
  // Test the chatbot health endpoint
  const http = require('http');
  
  const req = http.get('http://localhost:8001/api/chatbot/health', (res) => {
    console.log('Chatbot health endpoint status:', res.statusCode);
    
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Chatbot health response:', result);
      } catch (e) {
        console.log('Chatbot health response:', data);
      }
      
      // Close server
      server.close();
    });
  });
  
  req.on('error', (err) => {
    console.log('Chatbot health endpoint error:', err.message);
    server.close();
  });
});
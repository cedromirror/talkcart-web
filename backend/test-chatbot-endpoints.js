const http = require('http');

// Test the health endpoint
const healthReq = http.get('http://localhost:8000/api/chatbot/health', (res) => {
  console.log('Health endpoint status:', res.statusCode);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Health endpoint response:', result);
    } catch (e) {
      console.log('Health endpoint response:', data);
    }
  });
});

healthReq.on('error', (err) => {
  console.log('Health endpoint error:', err.message);
});

// Test the edit message endpoint (should return 401 without auth)
const editReq = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/chatbot/conversations/test/messages/test',
  method: 'PUT'
}, (res) => {
  console.log('Edit message endpoint status:', res.statusCode);
});

editReq.on('error', (err) => {
  console.log('Edit message endpoint error:', err.message);
});

editReq.end();

// Test the delete message endpoint (should return 401 without auth)
const deleteReq = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/chatbot/conversations/test/messages/test',
  method: 'DELETE'
}, (res) => {
  console.log('Delete message endpoint status:', res.statusCode);
});

deleteReq.on('error', (err) => {
  console.log('Delete message endpoint error:', err.message);
});

deleteReq.end();

// Test the reply message endpoint (should return 401 without auth)
const replyReq = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/chatbot/conversations/test/messages/test/reply',
  method: 'POST'
}, (res) => {
  console.log('Reply message endpoint status:', res.statusCode);
});

replyReq.on('error', (err) => {
  console.log('Reply message endpoint error:', err.message);
});

replyReq.end();
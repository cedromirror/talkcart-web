const http = require('http');

console.log('Verifying chatbot endpoints...');

// Test all chatbot endpoints
const endpoints = [
  { path: '/api/chatbot/health', method: 'GET' },
  { path: '/api/chatbot/search/vendors', method: 'GET' },
  { path: '/api/chatbot/search/customers', method: 'GET' },
  { path: '/api/chatbot/conversations', method: 'POST' },
  { path: '/api/chatbot/conversations/test', method: 'GET' },
  { path: '/api/chatbot/conversations/test/messages', method: 'GET' },
  { path: '/api/chatbot/conversations/test/messages', method: 'POST' },
  { path: '/api/chatbot/conversations/test/messages/test', method: 'PUT' },
  { path: '/api/chatbot/conversations/test/messages/test', method: 'DELETE' },
  { path: '/api/chatbot/conversations/test/messages/test/reply', method: 'POST' },
  { path: '/api/chatbot/conversations/test/resolve', method: 'PUT' },
  { path: '/api/chatbot/conversations/test', method: 'DELETE' }
];

function testEndpoint(endpoint, callback) {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: endpoint.path,
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`${endpoint.method} ${endpoint.path} - Status: ${res.statusCode}`);
    callback();
  });

  req.on('error', (err) => {
    console.log(`${endpoint.method} ${endpoint.path} - Error: ${err.message}`);
    callback();
  });

  // For POST/PUT requests, send empty body
  if (['POST', 'PUT'].includes(endpoint.method)) {
    req.write('{}');
  }

  req.end();
}

// Test endpoints sequentially
function testEndpoints(index = 0) {
  if (index >= endpoints.length) {
    console.log('All endpoints tested.');
    return;
  }

  testEndpoint(endpoints[index], () => {
    testEndpoints(index + 1);
  });
}

testEndpoints();
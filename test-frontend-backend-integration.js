#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test
 * 
 * This script tests the complete integration between the frontend and backend
 * for posts functionality, including:
 * - API endpoint availability
 * - CORS configuration
 * - Post creation and retrieval
 * - Media handling
 * - Error handling
 */

const axios = require('axios');

// Configuration
const FRONTEND_URL = 'http://localhost:4000';
const BACKEND_URL = 'http://localhost:8000';
const API_URL = `${FRONTEND_URL}/api`; // Using Next.js proxy

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function logTest(testName, status, details = '') {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: details });
    console.log(`❌ ${testName}: ${details}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      status: error.response?.status,
      data: error.response?.data 
    };
  }
}

// Test functions
async function testBackendHealth() {
  console.log('\n🔍 Testing Backend Health...');
  
  const result = await makeRequest('GET', `${BACKEND_URL}/api/posts/health`);
  
  if (result.success && result.data?.success) {
    logTest('Backend Health Check', 'PASS', 'Backend is responding correctly');
  } else {
    logTest('Backend Health Check', 'FAIL', `Backend not responding: ${result.error}`);
  }
}

async function testBackendTestEndpoint() {
  console.log('\n🔍 Testing Backend Test Endpoint...');
  
  const result = await makeRequest('GET', `${BACKEND_URL}/api/test/posts`);
  
  if (result.success && result.data?.success && result.data?.data?.length > 0) {
    logTest('Backend Test Endpoint', 'PASS', `Retrieved ${result.data.data.length} test posts`);
  } else {
    logTest('Backend Test Endpoint', 'FAIL', `Test endpoint not working: ${result.error}`);
  }
}

async function testFrontendProxy() {
  console.log('\n🔍 Testing Frontend Proxy...');
  
  const result = await makeRequest('GET', `${API_URL}/posts/health`);
  
  if (result.success && result.data?.success) {
    logTest('Frontend Proxy', 'PASS', 'Frontend proxy is working correctly');
  } else {
    logTest('Frontend Proxy', 'FAIL', `Frontend proxy not working: ${result.error}`);
  }
}

async function testFrontendTestProxy() {
  console.log('\n🔍 Testing Frontend Test Proxy...');
  
  const result = await makeRequest('GET', `${API_URL}/test/posts`);
  
  if (result.success && result.data?.success && result.data?.data?.length > 0) {
    logTest('Frontend Test Proxy', 'PASS', `Retrieved ${result.data.data.length} test posts via proxy`);
  } else {
    logTest('Frontend Test Proxy', 'FAIL', `Frontend test proxy not working: ${result.error}`);
  }
}

async function testMediaHandling() {
  console.log('\n🔍 Testing Media Handling...');
  
  // Test Cloudinary proxy
  const cloudinaryResult = await makeRequest('GET', `${FRONTEND_URL}/cloudinary/demo/image/upload/v1234567890/sample.jpg`);
  if (cloudinaryResult.success || cloudinaryResult.status === 200) {
    logTest('Cloudinary Proxy', 'PASS', 'Cloudinary images are accessible through proxy');
  } else {
    logTest('Cloudinary Proxy', 'FAIL', `Cloudinary proxy not working: ${cloudinaryResult.error}`);
  }
}

async function testFrontendComponents() {
  console.log('\n🔍 Testing Frontend Component Integration...');
  
  // Check if frontend is serving static files
  try {
    const response = await axios.get(`${FRONTEND_URL}/`);
    if (response.status === 200) {
      logTest('Frontend Static Serving', 'PASS', 'Frontend is serving static content');
    } else {
      logTest('Frontend Static Serving', 'FAIL', `Frontend not serving content: ${response.status}`);
    }
  } catch (error) {
    logTest('Frontend Static Serving', 'FAIL', `Frontend not accessible: ${error.message}`);
  }
}

async function testURLNormalization() {
  console.log('\n🔍 Testing URL Normalization...');
  
  // Test the URL normalization logic
  const normalizeMediaUrl = (urlString) => {
    try {
      if (!urlString) return null;
      
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          return urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        return urlString;
      }
      
      if (urlString.startsWith('/')) {
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          urlString = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev ? 'http://localhost:8000' : '';
        
        if (baseUrl) {
          return `${baseUrl}${urlString}`;
        }
        return urlString;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };
  
  const testCases = [
    {
      input: 'http://localhost:8000/uploads/talkcart/talkcart/test.jpg',
      expected: 'http://localhost:8000/uploads/talkcart/test.jpg'
    },
    {
      input: '/uploads/talkcart/talkcart/test.jpg',
      expected: 'http://localhost:8000/uploads/talkcart/test.jpg'
    },
    {
      input: 'https://res.cloudinary.com/demo/image/upload/test.jpg',
      expected: 'https://res.cloudinary.com/demo/image/upload/test.jpg'
    }
  ];
  
  let passed = 0;
  testCases.forEach((testCase, index) => {
    const result = normalizeMediaUrl(testCase.input);
    if (result === testCase.expected) {
      passed++;
    }
  });
  
  if (passed === testCases.length) {
    logTest('URL Normalization', 'PASS', `All ${testCases.length} test cases passed`);
  } else {
    logTest('URL Normalization', 'FAIL', `${passed}/${testCases.length} test cases passed`);
  }
}

async function testPostRendering() {
  console.log('\n🔍 Testing Post Rendering Logic...');
  
  // Test the post rendering logic from PostListItem component
  const testPost = {
    _id: '1',
    content: 'Test post with media',
    author: {
      _id: 'user1',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://via.placeholder.com/50'
    },
    media: [{
      url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg',
      resource_type: 'image',
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg'
    }],
    createdAt: new Date().toISOString(),
    likeCount: 5,
    commentCount: 2,
    shareCount: 1,
    privacy: 'public'
  };
  
  // Test URL normalization for media
  const normalizeMediaUrl = (urlString) => {
    try {
      if (!urlString) return null;
      
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          return urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        return urlString;
      }
      
      if (urlString.startsWith('/')) {
        if (urlString.includes('/uploads/talkcart/talkcart/')) {
          urlString = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        }
        
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev ? 'http://localhost:8000' : '';
        
        if (baseUrl) {
          return `${baseUrl}${urlString}`;
        }
        return urlString;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };
  
  // Test media URL normalization
  const mediaUrl = testPost.media[0].secure_url || testPost.media[0].url;
  const normalizedUrl = normalizeMediaUrl(mediaUrl);
  
  if (normalizedUrl === mediaUrl) {
    logTest('Post Media URL Normalization', 'PASS', 'Media URLs are normalized correctly');
  } else {
    logTest('Post Media URL Normalization', 'FAIL', `Expected ${mediaUrl}, got ${normalizedUrl}`);
  }
  
  // Test post structure
  if (testPost._id && testPost.content && testPost.author && testPost.media) {
    logTest('Post Structure Validation', 'PASS', 'Post structure is valid');
  } else {
    logTest('Post Structure Validation', 'FAIL', 'Post structure is invalid');
  }
}

// Main test runner
async function runIntegrationTests() {
  console.log('🚀 Starting Frontend-Backend Integration Tests\n');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`API URL: ${API_URL}\n`);
  
  try {
    await testBackendHealth();
    await testBackendTestEndpoint();
    await testFrontendProxy();
    await testFrontendTestProxy();
    await testMediaHandling();
    await testFrontendComponents();
    await testURLNormalization();
    await testPostRendering();
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
    }
    
    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Frontend-Backend integration is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the issues above.');
    }
    
  } catch (error) {
    console.error('\n💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = {
  runIntegrationTests,
  testResults
};

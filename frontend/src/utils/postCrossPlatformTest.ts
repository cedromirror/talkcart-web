/**
 * Cross-platform post functionality test utilities
 */

import { normalizePostData, isValidUrl, normalizeUrl } from './crossPlatformUtils';

/**
 * Test data for cross-platform compatibility testing
 */
export const testPostData = {
  // Standard post data
  standard: {
    _id: '507f1f77bcf86cd799439011',
    content: 'This is a test post',
    type: 'text',
    author: {
      _id: '507f1f77bcf86cd799439012',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    },
    media: [],
    hashtags: ['test', 'example'],
    likes: [],
    shares: [],
    bookmarks: [],
    views: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    isActive: true
  }
};

/**
 * Test URL normalization
 */
export const testUrlNormalization = () => {
  console.log('🧪 Testing URL normalization...');
  
  const testUrls = [
    'https://example.com/image.jpg',
    '/uploads/test-image.jpg',
    '/uploads/talkcart/talkcart/test-image.jpg',
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
    'blob:https://example.com/12345678-1234-1234-1234-123456789abc',
    'invalid-url',
    null,
    undefined,
    ''
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`Test ${index + 1}: ${url}`);
    const normalized = normalizeUrl(url);
    const isValid = isValidUrl(normalized || '');
    console.log(`  Normalized: ${normalized}`);
    console.log(`  Valid: ${isValid}`);
    console.log('---');
  });
};

/**
 * Run all tests
 */
export const runAllTests = () => {
  console.log('🚀 Running all cross-platform post functionality tests...\n');
  testUrlNormalization();
  console.log('✅ All tests completed!');
};

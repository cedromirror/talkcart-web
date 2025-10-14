// Test script for URL normalization logic

// This replicates the exact logic from our PostListItem component
const normalizeMediaUrl = (urlString) => {
  try {
    if (!urlString) return null;
    
    // Handle already valid absolute URLs
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      // Fix duplicate talkcart path issue
      if (urlString.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in URL:', urlString);
        const fixedUrl = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        console.log('✅ Fixed URL:', fixedUrl);
        return fixedUrl;
      }
      return urlString;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      // Check for malformed URLs with duplicate path segments
      if (urlString.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in relative URL:', urlString);
        urlString = urlString.replace('/uploads/talkcart/talkcart/', '/uploads/talkcart/');
        console.log('✅ Fixed relative URL:', urlString);
      }
      
      // For development, use localhost:8000 as the base
      // For production, this should be handled by the backend
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:8000' : '';
      
      if (baseUrl) {
        return `${baseUrl}${urlString}`;
      }
      return urlString;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Error in normalizeMediaUrl:', e);
    // Try one more time with basic validation for edge cases
    if (urlString && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      return urlString;
    }
    return null;
  }
};

// Test cases that match our actual usage
const testCases = [
  {
    name: 'Normal absolute URL',
    input: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
    expected: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j'
  },
  {
    name: 'Duplicate path URL (the main issue)',
    input: 'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
    expected: 'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j'
  },
  {
    name: 'Relative URL with duplicate path',
    input: '/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
    expected: '/uploads/talkcart/file_1760459532573_hmjwxi463j'
  },
  {
    name: 'Normal relative URL',
    input: '/uploads/talkcart/normal_file.mp4',
    expected: '/uploads/talkcart/normal_file.mp4'
  },
  {
    name: 'Cloudinary URL',
    input: 'https://res.cloudinary.com/dqhawepog/video/upload/v1234567890/sample.mp4',
    expected: 'https://res.cloudinary.com/dqhawepog/video/upload/v1234567890/sample.mp4'
  }
];

console.log('=== URL Normalization Logic Test ===\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: ${testCase.input}`);
  
  const result = normalizeMediaUrl(testCase.input);
  console.log(`Output: ${result}`);
  console.log(`Expected: ${testCase.expected}`);
  
  if (result === testCase.expected) {
    console.log('✅ PASS\n');
    passedTests++;
  } else {
    console.log('❌ FAIL\n');
  }
});

console.log(`=== Test Results: ${passedTests}/${totalTests} passed ===`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! The URL normalization logic is working correctly.');
} else {
  console.log('⚠️ Some tests failed. There may be issues with the URL normalization logic.');
}
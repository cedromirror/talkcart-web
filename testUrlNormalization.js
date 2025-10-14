// Test script for URL normalization function

// Import our functions from the PostListItem component
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

// Test cases
const testCases = [
  // The exact error case from the console
  'http://localhost:8000/uploads/talkcart/file_1760459532573_hmjwxi463j',
  
  // Case with duplicate path
  'http://localhost:8000/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
  
  // Relative URL with duplicate path
  '/uploads/talkcart/talkcart/file_1760459532573_hmjwxi463j',
  
  // Normal relative URL
  '/uploads/talkcart/file_normal.mp4',
  
  // Cloudinary URL
  'https://res.cloudinary.com/demo/video/upload/v1234567890/sample.mp4',
  
  // Invalid URL
  'invalid-url'
];

console.log('=== URL Normalization Test ===\n');

testCases.forEach((testCase, index) => {
  console.log(`Test Case ${index + 1}: ${testCase}`);
  const result = normalizeMediaUrl(testCase);
  console.log(`Result: ${result}`);
  console.log('---\n');
});
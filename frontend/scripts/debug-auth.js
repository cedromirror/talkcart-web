// Debug authentication issues with vendor-admin chat
console.log('Debugging vendor-admin chat authentication...');

// Check if we're in browser environment
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  console.log('Browser environment detected');
  
  // Check for auth token
  const token = localStorage.getItem('token');
  console.log('Auth token present:', !!token);
  if (token) {
    console.log('Token length:', token.length);
    // Don't log the actual token for security reasons
  }
  
  // Check for user data
  const user = localStorage.getItem('user');
  console.log('User data present:', !!user);
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('User role:', userData.role);
      console.log('User ID:', userData.id || userData._id);
    } catch (e) {
      console.log('User data parsing error:', e.message);
    }
  }
  
  // Check API base URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  console.log('API Base URL:', apiBaseUrl);
  
  // Test if we can make a simple request
  console.log('Testing basic connectivity...');
} else {
  console.log('Not in browser environment or localStorage not available');
}

console.log('Debug script completed');
const axios = require('axios');
const fs = require('fs');

// Test the image upload endpoint
async function testImageUpload() {
  try {
    // Create a simple test image (just some binary data)
    const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('images', new Blob([testImageData], { type: 'image/png' }), 'test.png');
    
    // Make the request
    const response = await axios.post('http://localhost:8000/api/marketplace/products/upload-images', formData, {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGM5MzkxMDNkMmJhMzY0ZDM1ZWZjZGIiLCJpYXQiOjE3Mjg0OTk2MzksImV4cCI6MTcyODUwMzIzOX0.5J7V5p6sjh6K1LZ5LZ5LZ5LZ5LZ5LZ5LZ5LZ5LZ5LZ5',
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testImageUpload();
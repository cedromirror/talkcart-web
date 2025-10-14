// Simple test to verify the Cloudinary configuration fixes work correctly
const { uploadMultiple, uploadFields } = require('../config/cloudinary');

// Mock request and response objects
const createMockReq = (files) => ({
  protocol: 'http',
  get: () => 'localhost:8000',
  files: files
});

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.data = data;
    return this;
  }
};

// Mock the config to simulate local storage
const mockConfig = {
  cloudinary: {
    enabled: false
  },
  upload: {
    maxFileSize: 200,
    maxFieldSize: 10
  }
};

// Temporarily mock the config module
jest.mock('../config/config', () => mockConfig);

console.log('Testing Cloudinary configuration fixes...\n');

// Test uploadMultiple function
console.log('Testing uploadMultiple function...');
const files = [
  { filename: 'file1.mp4' },
  { filename: 'file2.jpg' },
  { filename: 'file3.png' }
];

const req = createMockReq(files);

// Call the uploadMultiple function with a mock next function
uploadMultiple('files')(req, mockRes, () => {
  console.log('uploadMultiple test results:');
  console.log('  File 1 public_id:', req.files[0].public_id);
  console.log('  File 2 public_id:', req.files[1].public_id);
  console.log('  File 3 public_id:', req.files[2].public_id);
  
  console.log('  File 1 secure_url:', req.files[0].secure_url);
  console.log('  File 2 url:', req.files[1].url);
  console.log('  File 3 secure_url:', req.files[2].secure_url);
  
  // Verify correctness
  const isCorrect = 
    req.files[0].public_id === 'talkcart/file1.mp4' &&
    req.files[1].public_id === 'talkcart/file2.jpg' &&
    req.files[2].public_id === 'talkcart/file3.png' &&
    req.files[0].secure_url === 'http://localhost:8000/uploads/talkcart/file1.mp4' &&
    req.files[1].url === 'http://localhost:8000/uploads/talkcart/file2.jpg' &&
    req.files[2].secure_url === 'http://localhost:8000/uploads/talkcart/file3.png';
    
  console.log('  Result:', isCorrect ? 'PASS' : 'FAIL');
});

// Test uploadFields function
console.log('\nTesting uploadFields function...');
const filesGrouped = {
  videos: [
    { filename: 'video1.mp4' },
    { filename: 'video2.mp4' }
  ],
  images: [
    { filename: 'image1.jpg' },
    { filename: 'image2.png' }
  ]
};

const req2 = {
  protocol: 'http',
  get: () => 'localhost:8000',
  files: filesGrouped
};

// Call the uploadFields function with a mock next function
uploadFields([])(req2, mockRes, () => {
  console.log('uploadFields test results:');
  console.log('  Video 1 public_id:', req2.files.videos[0].public_id);
  console.log('  Video 2 public_id:', req2.files.videos[1].public_id);
  console.log('  Image 1 public_id:', req2.files.images[0].public_id);
  console.log('  Image 2 public_id:', req2.files.images[1].public_id);
  
  console.log('  Video 1 secure_url:', req2.files.videos[0].secure_url);
  console.log('  Video 2 url:', req2.files.videos[1].url);
  console.log('  Image 1 secure_url:', req2.files.images[0].secure_url);
  console.log('  Image 2 url:', req2.files.images[1].url);
  
  // Verify correctness
  const isCorrect = 
    req2.files.videos[0].public_id === 'talkcart/video1.mp4' &&
    req2.files.videos[1].public_id === 'talkcart/video2.mp4' &&
    req2.files.images[0].public_id === 'talkcart/image1.jpg' &&
    req2.files.images[1].public_id === 'talkcart/image2.png' &&
    req2.files.videos[0].secure_url === 'http://localhost:8000/uploads/talkcart/video1.mp4' &&
    req2.files.videos[1].url === 'http://localhost:8000/uploads/talkcart/video2.mp4' &&
    req2.files.images[0].secure_url === 'http://localhost:8000/uploads/talkcart/image1.jpg' &&
    req2.files.images[1].url === 'http://localhost:8000/uploads/talkcart/image2.png';
    
  console.log('  Result:', isCorrect ? 'PASS' : 'FAIL');
});

console.log('\nCloudinary configuration tests completed.');
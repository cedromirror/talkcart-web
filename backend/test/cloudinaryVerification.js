// Simple verification script to test Cloudinary configuration fixes

// Import the functions we want to test
const { uploadMultiple, uploadFields } = require('../config/cloudinary');

// Mock request object
const mockReq = {
  protocol: 'http',
  get: function() {
    return 'localhost:8000';
  }
};

// Mock response object
const mockRes = {
  status: function(code) {
    return this;
  },
  json: function(data) {
    return this;
  }
};

console.log('=== Cloudinary Configuration Verification ===\n');

// Test 1: Verify uploadMultiple function
console.log('Test 1: uploadMultiple function');
const testFiles = [
  { filename: 'video1.mp4' },
  { filename: 'image1.jpg' },
  { filename: 'document1.pdf' }
];

// Add files to mock request
mockReq.files = testFiles;

console.log('Before uploadMultiple:');
testFiles.forEach((file, index) => {
  console.log(`  File ${index + 1}:`, file);
});

// Call uploadMultiple function
uploadMultiple('files')(mockReq, mockRes, () => {
  console.log('After uploadMultiple:');
  mockReq.files.forEach((file, index) => {
    console.log(`  File ${index + 1}:`);
    console.log(`    filename: ${file.filename}`);
    console.log(`    public_id: ${file.public_id}`);
    console.log(`    secure_url: ${file.secure_url}`);
    console.log(`    url: ${file.url}`);
  });

  // Verify the fixes
  const publicIdsCorrect = mockReq.files.every(file => file.public_id === `talkcart/${file.filename}`);
  const secureUrlsCorrect = mockReq.files.every(file => file.secure_url === `http://localhost:8000/uploads/talkcart/${file.filename}`);
  const urlsCorrect = mockReq.files.every(file => file.url === `http://localhost:8000/uploads/talkcart/${file.filename}`);
  
  console.log('\nVerification Results:');
  console.log(`  Public IDs correct: ${publicIdsCorrect}`);
  console.log(`  Secure URLs correct: ${secureUrlsCorrect}`);
  console.log(`  URLs correct: ${urlsCorrect}`);
  console.log(`  Overall: ${publicIdsCorrect && secureUrlsCorrect && urlsCorrect ? 'PASS' : 'FAIL'}`);

  // Test 2: Verify uploadFields function
  console.log('\nTest 2: uploadFields function');
  const groupedFiles = {
    videos: [
      { filename: 'video2.mp4' },
      { filename: 'video3.mov' }
    ],
    images: [
      { filename: 'image2.png' },
      { filename: 'image3.gif' }
    ]
  };

  // Update mock request
  mockReq.files = groupedFiles;

  console.log('Before uploadFields:');
  Object.keys(groupedFiles).forEach(group => {
    console.log(`  ${group}:`);
    groupedFiles[group].forEach((file, index) => {
      console.log(`    File ${index + 1}:`, file);
    });
  });

  // Call uploadFields function
  uploadFields([])(mockReq, mockRes, () => {
    console.log('After uploadFields:');
    Object.keys(mockReq.files).forEach(group => {
      console.log(`  ${group}:`);
      mockReq.files[group].forEach((file, index) => {
        console.log(`    File ${index + 1}:`);
        console.log(`      filename: ${file.filename}`);
        console.log(`      public_id: ${file.public_id}`);
        console.log(`      secure_url: ${file.secure_url}`);
        console.log(`      url: ${file.url}`);
      });
    });

    // Verify the fixes
    let allPublicIdsCorrect = true;
    let allSecureUrlsCorrect = true;
    let allUrlsCorrect = true;
    
    Object.keys(mockReq.files).forEach(group => {
      mockReq.files[group].forEach(file => {
        if (file.public_id !== `talkcart/${file.filename}`) allPublicIdsCorrect = false;
        if (file.secure_url !== `http://localhost:8000/uploads/talkcart/${file.filename}`) allSecureUrlsCorrect = false;
        if (file.url !== `http://localhost:8000/uploads/talkcart/${file.filename}`) allUrlsCorrect = false;
      });
    });
    
    console.log('\nVerification Results:');
    console.log(`  Public IDs correct: ${allPublicIdsCorrect}`);
    console.log(`  Secure URLs correct: ${allSecureUrlsCorrect}`);
    console.log(`  URLs correct: ${allUrlsCorrect}`);
    console.log(`  Overall: ${allPublicIdsCorrect && allSecureUrlsCorrect && allUrlsCorrect ? 'PASS' : 'FAIL'}`);
    
    console.log('\n=== Verification Complete ===');
  });
});
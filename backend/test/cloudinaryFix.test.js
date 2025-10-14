// Test to verify the Cloudinary configuration fixes
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

const mockNext = jest.fn();

// Test the uploadMultiple function fix
describe('Cloudinary Configuration Fixes', () => {
  test('uploadMultiple should correctly set public_id for each file', () => {
    const files = [
      { filename: 'file1.mp4' },
      { filename: 'file2.jpg' }
    ];
    
    const req = createMockReq(files);
    
    // Mock the config to simulate local storage
    jest.mock('../config/config', () => ({
      cloudinary: {
        enabled: false
      }
    }));
    
    // Call the uploadMultiple function
    uploadMultiple('files')(req, mockRes, mockNext);
    
    // Verify that each file has the correct public_id
    expect(req.files[0].public_id).toBe('talkcart/file1.mp4');
    expect(req.files[1].public_id).toBe('talkcart/file2.jpg');
    
    // Verify that URLs are correctly set
    expect(req.files[0].secure_url).toBe('http://localhost:8000/uploads/talkcart/file1.mp4');
    expect(req.files[1].url).toBe('http://localhost:8000/uploads/talkcart/file2.jpg');
  });
  
  test('uploadFields should correctly set public_id for multiple files', () => {
    const files = {
      videos: [
        { filename: 'video1.mp4' },
        { filename: 'video2.mp4' }
      ],
      images: [
        { filename: 'image1.jpg' }
      ]
    };
    
    const req = {
      protocol: 'http',
      get: () => 'localhost:8000',
      files: files
    };
    
    // Call the uploadFields function
    uploadFields([])(req, mockRes, mockNext);
    
    // Verify that each file has the correct public_id
    expect(req.files.videos[0].public_id).toBe('talkcart/video1.mp4');
    expect(req.files.videos[1].public_id).toBe('talkcart/video2.mp4');
    expect(req.files.images[0].public_id).toBe('talkcart/image1.jpg');
  });
});
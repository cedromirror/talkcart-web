// Test to verify the Cloudinary configuration fixes work correctly
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

// Mock the config to simulate local storage
jest.mock('../config/config', () => ({
  cloudinary: {
    enabled: false
  },
  upload: {
    maxFileSize: 200,
    maxFieldSize: 10
  }
}));

describe('Cloudinary Configuration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploadMultiple correctly sets public_id for each file', () => {
    const files = [
      { filename: 'file1.mp4' },
      { filename: 'file2.jpg' },
      { filename: 'file3.png' }
    ];
    
    const req = createMockReq(files);
    
    // Call the uploadMultiple function
    uploadMultiple('files')(req, mockRes, mockNext);
    
    // Verify that each file has the correct public_id
    expect(req.files[0].public_id).toBe('talkcart/file1.mp4');
    expect(req.files[1].public_id).toBe('talkcart/file2.jpg');
    expect(req.files[2].public_id).toBe('talkcart/file3.png');
    
    // Verify that URLs are correctly set
    expect(req.files[0].secure_url).toBe('http://localhost:8000/uploads/talkcart/file1.mp4');
    expect(req.files[1].url).toBe('http://localhost:8000/uploads/talkcart/file2.jpg');
    expect(req.files[2].secure_url).toBe('http://localhost:8000/uploads/talkcart/file3.png');
    
    // Verify that next() was called
    expect(mockNext).toHaveBeenCalled();
  });
  
  test('uploadFields correctly sets public_id for multiple file groups', () => {
    const files = {
      videos: [
        { filename: 'video1.mp4' },
        { filename: 'video2.mp4' }
      ],
      images: [
        { filename: 'image1.jpg' },
        { filename: 'image2.png' }
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
    expect(req.files.images[1].public_id).toBe('talkcart/image2.png');
    
    // Verify that URLs are correctly set
    expect(req.files.videos[0].secure_url).toBe('http://localhost:8000/uploads/talkcart/video1.mp4');
    expect(req.files.videos[1].url).toBe('http://localhost:8000/uploads/talkcart/video2.mp4');
    expect(req.files.images[0].secure_url).toBe('http://localhost:8000/uploads/talkcart/image1.jpg');
    expect(req.files.images[1].url).toBe('http://localhost:8000/uploads/talkcart/image2.png');
    
    // Verify that next() was called
    expect(mockNext).toHaveBeenCalled();
  });
  
  test('uploadMultiple handles empty files array', () => {
    const files = [];
    
    const req = createMockReq(files);
    
    // Call the uploadMultiple function
    uploadMultiple('files')(req, mockRes, mockNext);
    
    // Verify that next() was called even with empty files
    expect(mockNext).toHaveBeenCalled();
  });
  
  test('uploadFields handles missing files', () => {
    const req = {
      protocol: 'http',
      get: () => 'localhost:8000'
    };
    
    // Call the uploadFields function
    uploadFields([])(req, mockRes, mockNext);
    
    // Verify that next() was called even with missing files
    expect(mockNext).toHaveBeenCalled();
  });
});
const fs = require('fs');
const path = require('path');

// Function to check if a file is a valid media file
function checkMediaFile(filePath) {
  try {
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Check file size
    const size = stats.size;
    
    // Read first few bytes to check file signature
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // Check for common file signatures
    const signatures = {
      mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4
      webm: [0x1A, 0x45, 0xDF, 0xA3], // WebM
      mov: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], // MOV
      jpg: [0xFF, 0xD8, 0xFF], // JPEG
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
      gif: [0x47, 0x49, 0x46, 0x38], // GIF
    };
    
    let fileType = 'unknown';
    let isValidMedia = false;
    
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    
    // Check file signatures
    for (const [type, signature] of Object.entries(signatures)) {
      if (buffer.length >= signature.length) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
          if (buffer[i] !== signature[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          fileType = type;
          isValidMedia = ['mp4', 'webm', 'mov', 'jpg', 'png', 'gif'].includes(type);
          break;
        }
      }
    }
    
    // Special case for files without extensions that might be media
    if (fileType === 'unknown' && ext === '') {
      // If it's a small file with text content, it's likely not a media file
      if (size < 100) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.trim().length > 0 && content.trim().length === size) {
            fileType = 'text';
            isValidMedia = false;
          }
        } catch (e) {
          // If we can't read as text, it might be binary media
          fileType = 'binary';
          isValidMedia = size > 1000; // Assume binary files > 1KB might be media
        }
      }
    }
    
    return {
      path: filePath,
      size,
      fileType,
      isValidMedia,
      isTextFile: fileType === 'text',
      isEmpty: size === 0
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      size: 0,
      fileType: 'error',
      isValidMedia: false,
      isTextFile: false,
      isEmpty: true
    };
  }
}

// Check all files in the uploads directory
function checkUploadsDirectory() {
  const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'talkcart');
  
  console.log(`Checking files in: ${uploadsDir}\n`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  
  if (files.length === 0) {
    console.log('No files found in uploads directory');
    return;
  }
  
  console.log(`Found ${files.length} files:\n`);
  
  files.forEach((file, index) => {
    const filePath = path.join(uploadsDir, file);
    const result = checkMediaFile(filePath);
    
    console.log(`File ${index + 1}: ${file}`);
    console.log(`  Path: ${result.path}`);
    console.log(`  Size: ${result.size} bytes`);
    console.log(`  Type: ${result.fileType}`);
    console.log(`  Valid Media: ${result.isValidMedia ? '✅ Yes' : '❌ No'}`);
    console.log(`  Text File: ${result.isTextFile ? '✅ Yes' : '❌ No'}`);
    console.log(`  Empty: ${result.isEmpty ? '✅ Yes' : '❌ No'}`);
    
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    
    if (result.isTextFile) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`  Content: "${content.trim()}"`);
      } catch (e) {
        console.log(`  Content: (binary data)`);
      }
    }
    
    console.log('');
  });
}

// Run the check
checkUploadsDirectory();
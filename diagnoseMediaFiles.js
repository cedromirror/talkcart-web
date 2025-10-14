const fs = require('fs');
const path = require('path');
const http = require('http');

// Function to diagnose a media file in detail
function diagnoseMediaFile(filePath, url) {
  console.log(`\n=== Diagnosing Media File ===`);
  console.log(`File Path: ${filePath}`);
  console.log(`URL: ${url}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File does not exist');
      return;
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`File Size: ${stats.size} bytes`);
    console.log(`Created: ${stats.birthtime}`);
    console.log(`Modified: ${stats.mtime}`);
    
    // Check if file is empty
    if (stats.size === 0) {
      console.log('❌ File is empty');
      return;
    }
    
    // Read first 100 bytes to check content
    const buffer = Buffer.alloc(Math.min(100, stats.size));
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    // Try to read as text
    try {
      const content = buffer.toString('utf8');
      console.log(`Content (first 100 chars): "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      
      // Check if it's mostly text
      const printableChars = content.split('').filter(char => 
        char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
      ).length;
      
      const textRatio = printableChars / content.length;
      console.log(`Text Ratio: ${(textRatio * 100).toFixed(2)}%`);
      
      if (textRatio > 0.9) {
        console.log('📝 File appears to be a text file');
      } else {
        console.log('📄 File contains binary data');
      }
    } catch (e) {
      console.log('📄 File contains binary data (not readable as text)');
    }
    
    // Check for common file signatures
    const signatures = {
      mp4: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      webm: [0x1A, 0x45, 0x8C, 0xDF],
      mov: [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
      jpg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      gif: [0x47, 0x49, 0x46, 0x38]
    };
    
    let detectedType = 'unknown';
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
          detectedType = type;
          break;
        }
      }
    }
    
    console.log(`Detected File Type: ${detectedType}`);
    
    // Try to make an HTTP request to the URL to see what the server returns
    console.log('\n--- HTTP Request Test ---');
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 8000,
      path: urlObj.pathname,
      method: 'HEAD'
    };
    
    const req = http.request(options, (res) => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Content-Length: ${res.headers['content-length']}`);
      
      if (res.statusCode === 200) {
        console.log('✅ HTTP request successful');
      } else {
        console.log('❌ HTTP request failed');
      }
    });
    
    req.on('error', (e) => {
      console.log(`❌ HTTP request error: ${e.message}`);
    });
    
    req.end();
    
  } catch (error) {
    console.log(`❌ Error diagnosing file: ${error.message}`);
  }
}

// Diagnose the specific files from the console warnings
const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'talkcart');

// Files from the console warnings
const problematicFiles = [
  'file_1760446946793_ix9n9oc37qk',
  'file_1760446837408_hdvxpldhbv',
  'file_1760430244935_xsegmcosses'
];

console.log('=== Media File Diagnosis Tool ===\n');

problematicFiles.forEach((filename) => {
  const filePath = path.join(uploadsDir, filename);
  const url = `http://localhost:8000/uploads/talkcart/${filename}`;
  diagnoseMediaFile(filePath, url);
});

console.log('\n=== Diagnosis Complete ===');
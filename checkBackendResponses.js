const http = require('http');

// Function to check what the backend returns for a URL
function checkBackendResponse(url) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Checking Backend Response ===`);
    console.log(`URL: ${url}`);
    
    try {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 8000,
        path: urlObj.pathname,
        method: 'GET'
      };
      
      const req = http.request(options, (res) => {
        console.log(`HTTP Status: ${res.statusCode}`);
        console.log(`Content-Type: ${res.headers['content-type']}`);
        console.log(`Content-Length: ${res.headers['content-length']}`);
        
        // Collect response data
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`Response Data (first 200 chars): "${data.substring(0, 200)}${data.length > 200 ? '...' : ''}"`);
          console.log(`Response Data Length: ${data.length} bytes`);
          
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'],
            contentLength: res.headers['content-length'],
            data: data
          });
        });
      });
      
      req.on('error', (e) => {
        console.log(`❌ HTTP request error: ${e.message}`);
        reject(e);
      });
      
      req.end();
    } catch (error) {
      console.log(`❌ Error creating request: ${error.message}`);
      reject(error);
    }
  });
}

// Check the specific URLs from the console warnings
async function checkAllUrls() {
  const urls = [
    'http://localhost:8000/uploads/talkcart/file_1760446946793_ix9n9oc37qk',
    'http://localhost:8000/uploads/talkcart/file_1760446837408_hdvxpldhbv',
    'http://localhost:8000/uploads/talkcart/file_1760430244935_xsegmcosses'
  ];
  
  console.log('=== Backend Response Checker ===\n');
  
  for (const url of urls) {
    try {
      await checkBackendResponse(url);
    } catch (error) {
      console.log(`Error checking ${url}: ${error.message}`);
    }
  }
  
  console.log('\n=== Backend Response Check Complete ===');
}

// Run the checks
checkAllUrls();
#!/usr/bin/env node

/**
 * Script to verify vendor payment APIs are working correctly
 */

const http = require('http');

// Test the vendor payment preferences endpoint
function testPaymentPreferences() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/marketplace/vendors/me/payment-preferences',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token' // This will fail auth but we can see if endpoint exists
      }
    };

    const req = http.request(options, (res) => {
      console.log(`Payment Preferences Status: ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (error) => {
      console.error('Payment Preferences Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test the payout history endpoint
function testPayoutHistory() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/marketplace/vendors/me/payout-history?limit=20',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token' // This will fail auth but we can see if endpoint exists
      }
    };

    const req = http.request(options, (res) => {
      console.log(`Payout History Status: ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (error) => {
      console.error('Payout History Error:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function verifyAPIs() {
  console.log('Verifying Vendor Payment APIs...\n');
  
  try {
    await testPaymentPreferences();
  } catch (error) {
    console.log('Payment Preferences test failed:', error.message);
  }
  
  try {
    await testPayoutHistory();
  } catch (error) {
    console.log('Payout History test failed:', error.message);
  }
  
  console.log('\nAPI verification completed.');
}

// Run the script if called directly
if (require.main === module) {
  verifyAPIs();
}

module.exports = verifyAPIs;
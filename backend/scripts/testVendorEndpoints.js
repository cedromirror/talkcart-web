#!/usr/bin/env node

/**
 * Script to test vendor payment endpoints
 * This script tests the vendor payment preferences and payout history endpoints
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = require('../config/database');

async function testVendorEndpoints() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    // Test VendorPaymentPreferences model
    const VendorPaymentPreferences = require('../models/VendorPaymentPreferences');
    
    // Create a test vendor ID (using a sample user ID)
    const User = require('../models/User');
    const users = await User.find().limit(1);
    
    if (users.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    const testVendorId = users[0]._id;
    console.log('Testing with vendor ID:', testVendorId);
    
    // Test creating vendor payment preferences
    console.log('\n=== Testing Vendor Payment Preferences ===');
    const testPreferences = {
      vendorId: testVendorId,
      mobileMoney: {
        enabled: true,
        provider: 'mtn',
        phoneNumber: '+1234567890',
        country: 'GH'
      },
      bankAccount: {
        enabled: false
      },
      paypal: {
        enabled: true,
        email: 'test@example.com'
      },
      cryptoWallet: {
        enabled: false
      },
      defaultPaymentMethod: 'mobileMoney',
      withdrawalPreferences: {
        minimumAmount: 20,
        frequency: 'weekly'
      }
    };
    
    // Upsert test preferences
    const preferences = await VendorPaymentPreferences.findOneAndUpdate(
      { vendorId: testVendorId },
      testPreferences,
      { upsert: true, new: true, runValidators: true }
    );
    
    console.log('Created/Updated payment preferences:', preferences._id);
    
    // Test fetching payment preferences
    const fetchedPreferences = await VendorPaymentPreferences.findOne({ vendorId: testVendorId });
    console.log('Fetched payment preferences:', fetchedPreferences ? 'SUCCESS' : 'FAILED');
    
    // Test vendor payout service
    console.log('\n=== Testing Vendor Payout Service ===');
    const vendorPayoutService = require('../services/vendorPayoutService');
    
    // Test getVendorPayoutHistory
    try {
      const history = await vendorPayoutService.getVendorPayoutHistory(testVendorId, { limit: 10 });
      console.log('Payout history fetch:', Array.isArray(history) ? 'SUCCESS' : 'FAILED');
      console.log('History items:', history.length);
    } catch (error) {
      console.error('Error fetching payout history:', error.message);
    }
    
    console.log('\n=== Test Summary ===');
    console.log('Vendor payment endpoints test completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error in testVendorEndpoints:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  testVendorEndpoints();
}

module.exports = testVendorEndpoints;
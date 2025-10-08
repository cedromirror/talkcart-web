#!/usr/bin/env node

/**
 * Script to verify vendor payout functionality
 * This script checks the status of vendor payouts and reports any issues.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = require('../config/database');
const VendorPaymentPreferences = require('../models/VendorPaymentPreferences');
const Order = require('../models/Order');
const User = require('../models/User');

async function verifyVendorPayouts() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    // Get statistics
    console.log('\n=== VENDOR PAYOUT SYSTEM VERIFICATION ===');
    
    // Count vendors with payment preferences
    const vendorPrefsCount = await VendorPaymentPreferences.countDocuments();
    console.log(`Vendors with payment preferences: ${vendorPrefsCount}`);
    
    // Count vendors with payout history
    const vendorsWithPayouts = await VendorPaymentPreferences.countDocuments({
      'payoutHistory.0': { $exists: true }
    });
    console.log(`Vendors with payout history: ${vendorsWithPayouts}`);
    
    // Find orders that should have vendor payouts processed
    const completedOrders = await Order.countDocuments({
      status: 'completed'
    });
    console.log(`Total completed orders: ${completedOrders}`);
    
    const processedOrders = await Order.countDocuments({
      status: 'completed',
      'metadata.vendorPayoutProcessed': true
    });
    console.log(`Orders with vendor payouts processed: ${processedOrders}`);
    
    const unprocessedOrders = await Order.countDocuments({
      status: 'completed',
      'metadata.vendorPayoutProcessed': { $ne: true }
    });
    console.log(`Orders with vendor payouts NOT processed: ${unprocessedOrders}`);
    
    // Show details of unprocessed orders
    if (unprocessedOrders > 0) {
      console.log('\n=== UNPROCESSED ORDERS ===');
      const orders = await Order.find({
        status: 'completed',
        'metadata.vendorPayoutProcessed': { $ne: true }
      })
      .limit(10)
      .populate('userId', 'username')
      .sort({ createdAt: -1 });
      
      orders.forEach(order => {
        console.log(`  Order: ${order.orderNumber} (${order._id})`);
        console.log(`    User: ${order.userId?.username || 'Unknown'}`);
        console.log(`    Created: ${order.createdAt}`);
        console.log(`    Items: ${order.items.length}`);
        console.log(`    Total: ${order.totalAmount} ${order.currency}`);
        console.log('');
      });
      
      if (unprocessedOrders > 10) {
        console.log(`  ... and ${unprocessedOrders - 10} more orders`);
      }
    }
    
    // Check for vendors with payout history
    if (vendorsWithPayouts > 0) {
      console.log('\n=== RECENT PAYOUTS ===');
      const recentPayouts = await VendorPaymentPreferences.find({
        'payoutHistory.0': { $exists: true }
      })
      .sort({ 'payoutHistory.processedAt': -1 })
      .limit(5);
      
      for (const vendorPrefs of recentPayouts) {
        const vendor = await User.findById(vendorPrefs.vendorId);
        const latestPayout = vendorPrefs.payoutHistory[vendorPrefs.payoutHistory.length - 1];
        
        console.log(`  Vendor: ${vendor?.username || vendorPrefs.vendorId}`);
        console.log(`    Latest payout: ${latestPayout.amount} ${latestPayout.currency}`);
        console.log(`    Method: ${latestPayout.method}`);
        console.log(`    Status: ${latestPayout.status}`);
        console.log(`    Processed: ${latestPayout.processedAt}`);
        console.log('');
      }
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`System Status: ${unprocessedOrders === 0 ? 'HEALTHY' : 'NEEDS ATTENTION'}`);
    console.log(`Vendors configured: ${vendorPrefsCount}`);
    console.log(`Orders pending payout processing: ${unprocessedOrders}`);
    
    if (unprocessedOrders > 0) {
      console.log(`\nRecommendation: Run the fixIncompleteVendorPayouts.js script to process pending payouts`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error in verifyVendorPayouts:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  verifyVendorPayouts();
}

module.exports = verifyVendorPayouts;
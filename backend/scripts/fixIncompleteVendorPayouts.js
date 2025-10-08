#!/usr/bin/env node

/**
 * Script to fix incomplete vendor payouts
 * This script identifies orders that should have vendor payouts but don't,
 * and processes them manually.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Connect to database
const connectDB = require('../config/database');
const vendorPayoutService = require('../services/vendorPayoutService');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

async function fixIncompleteVendorPayouts() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    // Find completed orders that haven't been processed for vendor payouts
    const query = {
      status: 'completed',
      'metadata.vendorPayoutProcessed': { $ne: true }
    };

    console.log('Searching for incomplete vendor payouts...');
    const orders = await Order.find(query)
      .limit(100) // Process in batches
      .populate('userId', 'username displayName email walletAddress')
      .sort({ createdAt: 1 });

    console.log(`Found ${orders.length} orders with incomplete vendor payouts`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      payouts: []
    };

    for (const order of orders) {
      try {
        console.log(`\nProcessing order ${order.orderNumber} (${order._id})`);
        
        // Process payout for each item in the order
        for (const item of order.items) {
          // Try to get vendor ID from different possible locations
          let vendorId = null;
          
          // Check if we have productId with vendorId
          if (item.productId && typeof item.productId === 'object' && item.productId.vendorId) {
            vendorId = item.productId.vendorId;
            console.log(`  Found vendor ID from productId.vendorId: ${vendorId}`);
          } 
          // Check if we have direct vendorId on item
          else if (item.vendorId) {
            vendorId = item.vendorId;
            console.log(`  Found vendor ID from item.vendorId: ${vendorId}`);
          }
          // Check if we have productId as string and can look up the product
          else if (item.productId) {
            console.log(`  Looking up product ${item.productId} to get vendor ID`);
            try {
              const product = await Product.findById(item.productId);
              if (product && product.vendorId) {
                vendorId = product.vendorId;
                console.log(`  Found vendor ID from product lookup: ${vendorId}`);
              }
            } catch (productError) {
              console.error(`  Error looking up product ${item.productId}:`, productError.message);
            }
          }
          
          if (vendorId) {
            const vendor = await User.findById(vendorId);
            if (vendor) {
              // Calculate payout amount (item price * quantity)
              const itemTotal = item.price * item.quantity;
              
              console.log(`  Calculating payout for vendor ${vendor.username} (${vendorId}) - Amount: ${itemTotal} ${order.currency}`);
              
              // Calculate vendor payout after commission
              const payoutCalculation = await vendorPayoutService.calculatePayout(itemTotal, order.currency);
              
              console.log(`  Payout calculation:`, payoutCalculation);
              
              // Process the payout
              const payoutResult = await vendorPayoutService.processVendorPayout(
                vendor,
                payoutCalculation.vendorAmount,
                order.currency,
                {
                  orderId: order._id,
                  orderNumber: order.orderNumber,
                  itemId: item._id,
                  productName: item.name,
                  quantity: item.quantity,
                  orderTotal: itemTotal,
                  commissionRate: payoutCalculation.commissionRate,
                  commissionAmount: payoutCalculation.commissionAmount
                }
              );
              
              results.payouts.push(payoutResult);
              results.successful++;
              console.log(`  ✓ Successfully processed payout for vendor ${vendor.username}`);
            } else {
              console.warn(`  ⚠ Vendor ${vendorId} not found`);
              results.errors.push({
                orderId: order._id,
                itemId: item._id,
                error: `Vendor ${vendorId} not found`
              });
              results.failed++;
            }
          } else {
            console.warn(`  ⚠ No vendor ID found for item ${item._id}`);
            results.errors.push({
              orderId: order._id,
              itemId: item._id,
              error: 'No vendor ID found'
            });
            results.failed++;
          }
        }
        
        // Mark order as processed for vendor payouts
        if (!order.metadata) order.metadata = {};
        order.metadata.vendorPayoutProcessed = true;
        await order.save();
        
        results.processed++;
        console.log(`  ✓ Order ${order.orderNumber} marked as processed`);
      } catch (error) {
        console.error(`  ✗ Error processing payout for order ${order._id}:`, error.message);
        results.failed++;
        results.errors.push({
          orderId: order._id,
          error: error.message
        });
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Processed: ${results.processed}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Payouts processed: ${results.payouts.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Order: ${error.orderId} - ${error.error}`);
      });
    }
    
    if (results.payouts.length > 0) {
      console.log('\nPayouts:');
      results.payouts.forEach((payout, index) => {
        console.log(`  ${index + 1}. Vendor: ${payout.vendorId} - ${payout.amount} ${payout.currency} (${payout.method})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error in fixIncompleteVendorPayouts:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  fixIncompleteVendorPayouts();
}

module.exports = fixIncompleteVendorPayouts;
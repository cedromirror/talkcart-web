const Order = require('../models/Order');
const VendorPaymentPreferences = require('../models/VendorPaymentPreferences');
const Settings = require('../models/Settings');
const User = require('../models/User');
// Node.js 18+ has built-in fetch support
const fetch = global.fetch || require('node-fetch');

class VendorPayoutService {
  /**
   * Calculate the amount vendor should receive after commission
   * @param {number} orderAmount - Total order amount
   * @param {string} currency - Currency of the order
   * @returns {Object} Object containing vendor amount, commission amount, and rate
   */
  async calculatePayout(orderAmount, currency) {
    try {
      // Get commission rate from settings
      const settings = await Settings.getOrCreateDefault('marketplace');
      const commissionRate = settings.commissionRate || 0.10; // Default 10%
      
      const commissionAmount = orderAmount * commissionRate;
      const vendorAmount = orderAmount - commissionAmount;
      
      return {
        vendorAmount: parseFloat(vendorAmount.toFixed(2)),
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        commissionRate,
        currency
      };
    } catch (error) {
      console.error('Error calculating payout:', error);
      throw new Error(`Failed to calculate payout: ${error.message}`);
    }
  }

  /**
   * Get vendor's payment preferences
   * @param {string} vendorId - Vendor's user ID
   * @returns {Object} Vendor's payment preferences
   */
  async getVendorPaymentPreferences(vendorId) {
    try {
      const preferences = await VendorPaymentPreferences.findOne({ vendorId });
      return preferences || {
        mobileMoney: { enabled: false },
        bankAccount: { enabled: false },
        paypal: { enabled: false },
        cryptoWallet: { enabled: false },
        defaultPaymentMethod: 'mobileMoney'
      };
    } catch (error) {
      console.error('Error fetching vendor payment preferences:', error);
      throw new Error(`Failed to fetch vendor payment preferences: ${error.message}`);
    }
  }

  /**
   * Process payout to vendor based on their preferences
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} payoutDetails - Details about the payout
   * @returns {Object} Payout result
   */
  async processVendorPayout(vendor, amount, currency, payoutDetails) {
    try {
      const vendorId = vendor._id;
      console.log(`Processing vendor payout for vendor ${vendorId}`, { amount, currency, payoutDetails });
      
      const preferences = await this.getVendorPaymentPreferences(vendorId);
      const paymentMethod = preferences.defaultPaymentMethod || 'mobileMoney';
      
      // Check if the preferred payment method is enabled
      if (!preferences[paymentMethod] || !preferences[paymentMethod].enabled) {
        const errorMsg = `Vendor's preferred payment method (${paymentMethod}) is not enabled`;
        console.error(errorMsg, { vendorId, paymentMethod, preferences });
        throw new Error(errorMsg);
      }
      
      let result = {
        status: 'pending',
        method: paymentMethod,
        amount,
        currency,
        vendorId,
        payoutDetails
      };
      
      // Process based on payment method
      switch (paymentMethod) {
        case 'mobileMoney':
          result = await this.processMobileMoneyPayout(vendor, amount, currency, preferences.mobileMoney, payoutDetails);
          break;
        case 'bankAccount':
          result = await this.processBankPayout(vendor, amount, currency, preferences.bankAccount, payoutDetails);
          break;
        case 'paypal':
          result = await this.processPayPalPayout(vendor, amount, currency, preferences.paypal, payoutDetails);
          break;
        case 'cryptoWallet':
          result = await this.processCryptoPayout(vendor, amount, currency, preferences.cryptoWallet, payoutDetails);
          break;
        default:
          const errorMsg = `Unsupported payment method: ${paymentMethod}`;
          console.error(errorMsg, { vendorId, paymentMethod });
          throw new Error(errorMsg);
      }
      
      console.log(`Vendor payout processed successfully`, { vendorId, result });
      
      // Record payout in vendor's payment preferences
      await this.recordPayout(vendorId, {
        orderId: payoutDetails.orderId,
        amount: result.amount,
        currency: result.currency,
        method: result.method,
        status: result.status,
        transactionId: result.transactionId,
        details: result.details
      });
      
      return result;
    } catch (error) {
      console.error('Error processing vendor payout:', error);
      throw new Error(`Failed to process vendor payout: ${error.message}`);
    }
  }

  /**
   * Record payout in vendor's payment preferences
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} payoutRecord - Payout record to store
   */
  async recordPayout(vendorId, payoutRecord) {
    try {
      console.log(`Recording payout for vendor ${vendorId}`, { payoutRecord });
      await VendorPaymentPreferences.findOneAndUpdate(
        { vendorId },
        { 
          $push: { 
            payoutHistory: {
              ...payoutRecord,
              processedAt: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );
      console.log(`Payout recorded successfully for vendor ${vendorId}`);
    } catch (error) {
      console.error('Error recording payout:', error);
      // Don't throw error as this is just for tracking
    }
  }

  /**
   * Process mobile money payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} mobileMoneyDetails - Mobile money details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processMobileMoneyPayout(vendor, amount, currency, mobileMoneyDetails, payoutDetails) {
    try {
      console.log(`Processing mobile money payout for vendor ${vendor._id}`, { amount, currency, mobileMoneyDetails });
      
      // For mobile money, we would typically integrate with a payment provider
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'mobileMoney',
        amount,
        currency,
        vendorId: vendor._id,
        transactionId: `mm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          provider: mobileMoneyDetails.provider,
          phoneNumber: mobileMoneyDetails.phoneNumber,
          country: mobileMoneyDetails.country,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Mobile money payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing mobile money payout:', error);
      throw new Error(`Failed to process mobile money payout: ${error.message}`);
    }
  }

  /**
   * Process bank account payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} bankDetails - Bank account details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processBankPayout(vendor, amount, currency, bankDetails, payoutDetails) {
    try {
      console.log(`Processing bank payout for vendor ${vendor._id}`, { amount, currency, bankDetails });
      
      // For bank transfers, we would typically integrate with a banking API
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'bankAccount',
        amount,
        currency,
        vendorId: vendor._id,
        transactionId: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          country: bankDetails.country,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Bank payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing bank payout:', error);
      throw new Error(`Failed to process bank payout: ${error.message}`);
    }
  }

  /**
   * Process PayPal payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} paypalDetails - PayPal details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processPayPalPayout(vendor, amount, currency, paypalDetails, payoutDetails) {
    try {
      console.log(`Processing PayPal payout for vendor ${vendor._id}`, { amount, currency, paypalDetails });
      
      // For PayPal, we would typically integrate with PayPal's API
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'paypal',
        amount,
        currency,
        vendorId: vendor._id,
        transactionId: `pp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          email: paypalDetails.email,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`PayPal payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing PayPal payout:', error);
      throw new Error(`Failed to process PayPal payout: ${error.message}`);
    }
  }

  /**
   * Process crypto wallet payout
   * @param {Object} vendor - Vendor user object
   * @param {number} amount - Amount to payout
   * @param {string} currency - Currency of the payout
   * @param {Object} cryptoDetails - Crypto wallet details
   * @param {Object} payoutDetails - Payout details
   * @returns {Object} Payout result
   */
  async processCryptoPayout(vendor, amount, currency, cryptoDetails, payoutDetails) {
    try {
      console.log(`Processing crypto payout for vendor ${vendor._id}`, { amount, currency, cryptoDetails });
      
      // For crypto payouts, we would typically integrate with a crypto payment provider
      // For now, we'll simulate the process and mark as pending manual transfer
      const result = {
        status: 'pending_manual',
        method: 'cryptoWallet',
        amount,
        currency,
        vendorId: vendor._id,
        transactionId: `crypto_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        details: {
          walletAddress: cryptoDetails.walletAddress,
          network: cryptoDetails.network,
          vendorName: vendor.displayName || vendor.username,
          ...payoutDetails
        }
      };
      
      console.log(`Crypto payout processed`, { vendorId: vendor._id, result });
      return result;
    } catch (error) {
      console.error('Error processing crypto payout:', error);
      throw new Error(`Failed to process crypto payout: ${error.message}`);
    }
  }

  /**
   * Process payouts for completed orders
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  async processCompletedOrderPayouts(options = {}) {
    try {
      const { limit = 100, force = false } = options;
      
      console.log(`Starting vendor payout processing`, { limit, force });
      
      // Find completed orders that haven't been processed for vendor payouts
      const query = {
        status: 'completed',
        'metadata.vendorPayoutProcessed': { $ne: true }
      };
      
      const orders = await Order.find(query)
        .limit(limit)
        .populate('userId', 'username displayName email walletAddress')
        .sort({ createdAt: 1 });
      
      console.log(`Found ${orders.length} orders to process for vendor payouts`);
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        payouts: []
      };
      
      for (const order of orders) {
        try {
          console.log(`Processing order ${order._id} for vendor payouts`);
          
          // Process payout for each item in the order
          for (const item of order.items) {
            // Fix: Check for proper vendor ID structure
            let vendorId = null;
            if (item.productId && item.productId.vendorId) {
              // New structure
              vendorId = item.productId.vendorId;
            } else if (item.vendorId) {
              // Old structure or direct vendor ID
              vendorId = item.vendorId;
            }
            
            if (vendorId) {
              const vendor = await User.findById(vendorId);
              if (vendor) {
                // Calculate payout amount (item price * quantity)
                const itemTotal = item.price * item.quantity;
                
                console.log(`Calculating payout for vendor ${vendorId}`, { itemTotal, currency: order.currency });
                
                // Calculate vendor payout after commission
                const payoutCalculation = await this.calculatePayout(itemTotal, order.currency);
                
                console.log(`Payout calculation result`, { vendorId, payoutCalculation });
                
                // Process the payout
                const payoutResult = await this.processVendorPayout(
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
                console.log(`Successfully processed payout for vendor ${vendorId}`, { payoutResult });
              } else {
                console.warn(`Vendor not found for item`, { vendorId, itemId: item._id });
              }
            } else {
              console.warn(`No vendor ID found for item`, { item });
            }
          }
          
          // Mark order as processed for vendor payouts
          if (!order.metadata) order.metadata = {};
          order.metadata.vendorPayoutProcessed = true;
          await order.save();
          
          results.processed++;
          console.log(`Order ${order._id} marked as processed for vendor payouts`);
        } catch (error) {
          console.error(`Error processing payout for order ${order._id}:`, error);
          results.failed++;
          results.errors.push({
            orderId: order._id,
            error: error.message
          });
        }
      }
      
      console.log(`Vendor payout processing completed`, results);
      return results;
    } catch (error) {
      console.error('Error processing completed order payouts:', error);
      throw new Error(`Failed to process completed order payouts: ${error.message}`);
    }
  }

  /**
   * Get vendor's payout history
   * @param {string} vendorId - Vendor's user ID
   * @param {Object} options - Query options
   * @returns {Array} Payout history
   */
  async getVendorPayoutHistory(vendorId, options = {}) {
    try {
      const { limit = 50, status } = options;
      
      console.log(`Fetching payout history for vendor ${vendorId}`, { limit, status });
      
      // Validate vendorId
      if (!vendorId) {
        throw new Error('Vendor ID is required');
      }
      
      const query = { vendorId };
      if (status) {
        query['payoutHistory.status'] = status;
      }
      
      const preferences = await VendorPaymentPreferences.findOne(query);
      
      if (!preferences || !preferences.payoutHistory) {
        console.log(`No payout history found for vendor ${vendorId}`);
        return [];
      }
      
      let history = preferences.payoutHistory;
      
      // Filter by status if provided
      if (status) {
        history = history.filter(payout => payout.status === status);
      }
      
      // Sort by processed date (newest first) and limit
      history.sort((a, b) => new Date(b.processedAt) - new Date(a.processedAt));
      
      const result = history.slice(0, limit);
      console.log(`Found ${result.length} payout history records for vendor ${vendorId}`);
      
      return result;
    } catch (error) {
      console.error('Error fetching vendor payout history:', error);
      throw new Error(`Failed to fetch vendor payout history: ${error.message}`);
    }
  }
}

module.exports = new VendorPayoutService();
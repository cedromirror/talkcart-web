const express = require('express');
const router = express.Router();
// Stripe require removed as part of Stripe cleanup
const Joi = require('joi');
const { authenticateToken } = require('./auth');
const Order = require('../models/Order');

// Stripe initialization removed as part of Stripe cleanup

// Flutterwave config
const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY; // for reference
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Validation schema for Flutterwave init
const flwInitSchema = Joi.object({
  amount: Joi.number().positive().required(), // major units
  currency: Joi.string().uppercase().valid('RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS', 'SOS').required(),
  tx_ref: Joi.string().min(8).required(),
  customer: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().optional(),
    phonenumber: Joi.string().optional(),
  }).required(),
  meta: Joi.object().unknown(true).default({}),
}).required();

// Stripe schema removed as part of Stripe cleanup

// @route   POST /api/payments/flutterwave/init
// @desc    Initialize Flutterwave payment (Inline/Standard)
// @access  Private
router.post('/flutterwave/init', authenticateToken, async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) {
      return res.status(400).json({ success: false, error: 'Flutterwave not configured' });
    }
    const { error, value } = flwInitSchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    }

    // Add user's currency information to meta for tracking
    const enhancedMeta = {
      ...value.meta,
      user_currency: req.user?.currency || 'USD',
      original_amount: value.amount,
      original_currency: value.currency,
    };

    const payload = {
      ...value,
      meta: enhancedMeta,
      // Set redirect_url for Standard; Inline can ignore
      redirect_url: value.redirect_url || undefined,
    };

    const resp = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
      return res.status(500).json({ success: false, error: 'Failed to init Flutterwave', details: data });
    }

    // Return ids needed for client Inline checkout if applicable
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Flutterwave init error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initialize payment', message: err.message });
  }
});

// @route   GET /api/payments/history
// @desc    Get user's payment history (based on completed orders)
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const query = { 
      userId,
      status: 'completed'  // Only show completed payments
    };

    // Find completed orders for this user
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Transform orders into payment history format
    const payments = orders.map(order => ({
      id: order._id,
      orderId: order._id,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      method: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt
    }));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get specific payment details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const paymentId = req.params.id;

    // Find the order that matches this payment
    const order = await Order.findOne({ 
      _id: paymentId, 
      userId,
      status: 'completed'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = {
      id: order._id,
      orderId: order._id,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      method: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      items: order.items,
      shippingAddress: order.shippingAddress
    };

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

// Stripe intent route removed as part of Stripe cleanup

module.exports = router;
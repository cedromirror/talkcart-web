const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');
let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.warn('Stripe SDK not initialized:', e.message);
  }
}

const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH; // For webhook verification
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;   // For server-side verification

// Middleware to verify Stripe webhook signature
const verifyStripeSignature = (req, res, next) => {
  if (!stripe) {
    return res.status(500).json({
      success: false,
      message: 'Stripe not configured'
    });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).json({
      success: false,
      message: 'Webhook not properly configured'
    });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid signature'
    });
  }
};

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhook events
// @access  Public (with signature verification)
router.post('/stripe', express.raw({ type: 'application/json' }), verifyStripeSignature, async (req, res) => {
  const event = req.stripeEvent;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`💳 Payment succeeded: ${paymentIntent.id}`);

        // Find and update order status
        const order = await Order.findOne({
          'paymentDetails.paymentIntentId': paymentIntent.id
        });

        if (order) {
          order.status = 'completed';
          order.completedAt = new Date().toISOString();
          await order.save();

          console.log(`📦 Order ${order.orderNumber} marked as completed`);

          // TODO: Send email confirmation, update inventory, etc.
        } else {
          console.warn(`⚠️  No order found for PaymentIntent: ${paymentIntent.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);

        // Find and update order status
        const order = await Order.findOne({
          'paymentDetails.paymentIntentId': paymentIntent.id
        });

        if (order) {
          order.status = 'cancelled';
          order.cancelledAt = new Date().toISOString();
          await order.save();

          console.log(`📦 Order ${order.orderNumber} marked as cancelled due to payment failure`);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        console.log(`🚫 Payment canceled: ${paymentIntent.id}`);

        // Find and update order status
        const order = await Order.findOne({
          'paymentDetails.paymentIntentId': paymentIntent.id
        });

        if (order) {
          order.status = 'cancelled';
          order.cancelledAt = new Date().toISOString();
          await order.save();

          console.log(`📦 Order ${order.orderNumber} marked as cancelled`);
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.log(`⚡ Dispute created: ${dispute.id}`);

        // TODO: Handle dispute logic, notify administrators
        break;
      }

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook handler failed',
      error: error.message
    });
  }
});

// @route   GET /api/webhooks/stripe/test
// @desc    Test webhook endpoint (development only)
// @access  Public
router.get('/stripe/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  res.json({
    success: true,
    message: 'Stripe webhook endpoint is reachable',
    environment: process.env.NODE_ENV,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'configured' : 'not configured',
    stripe: stripe ? 'initialized' : 'not initialized'
  });
});

// Flutterwave webhook verification middleware
const verifyFlutterwaveSignature = (req, res, next) => {
  try {
    if (!FLW_SECRET_HASH) {
      return res.status(400).json({ success: false, message: 'Flutterwave webhook not configured' });
    }
    const signature = req.headers['flutterwave-signature'];
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing flutterwave-signature header' });
    }
    const computed = crypto.createHmac('sha256', FLW_SECRET_HASH).update(req.body).digest('hex');
    if (computed !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid Flutterwave signature' });
    }
    next();
  } catch (err) {
    console.error('Flutterwave signature verification failed:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid Flutterwave signature' });
  }
};

// @route   POST /api/webhooks/flutterwave
// @desc    Handle Flutterwave webhook events (always verify via API before fulfillment)
// @access  Public (with signature verification)
router.post('/flutterwave', express.raw({ type: 'application/json' }), verifyFlutterwaveSignature, async (req, res) => {
  try {
    const payload = JSON.parse(req.body?.toString?.() || '{}');
    const data = payload?.data || {};
    const txId = data?.id;
    const txRef = data?.tx_ref;
    const status = (data?.status || '').toLowerCase();

    if (!txId || !txRef) {
      return res.status(200).json({ success: true, received: true });
    }

    // Verify with Flutterwave API before fulfilling
    const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
    });
    const verify = await resp.json();
    const vdata = verify?.data || {};
    const ok = (vdata.status || '').toLowerCase() === 'successful' && String(vdata.tx_ref) === String(txRef);

    if (ok) {
      // Try to update order by tx_ref mapping (requires orders storing tx_ref in paymentDetails)
      const order = await Order.findOne({ 'paymentDetails.tx_ref': txRef });
      if (order) {
        order.status = 'completed';
        order.completedAt = new Date().toISOString();
        await order.save();
        console.log(`📦 Order ${order.orderNumber} marked as completed via Flutterwave webhook`);
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Flutterwave webhook handler error:', error);
    return res.status(400).json({ success: false, message: 'Flutterwave webhook handler failed' });
  }
});

module.exports = router;
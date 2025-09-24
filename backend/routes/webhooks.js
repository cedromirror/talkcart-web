const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const WebhookEvent = require('../models/WebhookEvent');
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
    // Idempotency guard: store processed Stripe event IDs
    try {
      await WebhookEvent.create({ source: 'stripe', eventId: event.id, meta: { type: event.type } });
    } catch (e) {
      // Duplicate (unique index) → already processed
      return res.status(200).json({ success: true, received: true, duplicate: true });
    }

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
        } else {
          console.warn(`⚠️  No order found for PaymentIntent: ${paymentIntent.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);

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
// Supports both official 'verif-hash' header (equals FLW_SECRET_HASH)
// and legacy 'flutterwave-signature' (HMAC-SHA256 of raw body with FLW_SECRET_HASH)
const verifyFlutterwaveSignature = (req, res, next) => {
  try {
    if (!FLW_SECRET_HASH) {
      return res.status(400).json({ success: false, message: 'Flutterwave webhook not configured' });
    }

    const verifHash = req.headers['verif-hash'];
    const flwSignature = req.headers['flutterwave-signature'];
    const raw = req.body; // Buffer provided by express.raw({ type: 'application/json' })

    let ok = false;

    // Preferred verification per Flutterwave docs
    if (verifHash && verifHash === FLW_SECRET_HASH) {
      ok = true;
    } else if (flwSignature && raw) {
      // Fallback for integrations that send HMAC signature
      try {
        const computed = crypto.createHmac('sha256', FLW_SECRET_HASH).update(raw).digest('hex');
        ok = computed === flwSignature;
      } catch (e) {
        ok = false;
      }
    }

    if (!ok) {
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

    if (!txId || !txRef) {
      return res.status(200).json({ success: true, received: true });
    }

    // Idempotency guard for Flutterwave (use txId) - tolerate duplicates
    try {
      await WebhookEvent.create({ source: 'flutterwave', eventId: String(txId), tx_ref: String(txRef), meta: { event: payload?.event } });
    } catch (e) {
      return res.status(200).json({ success: true, received: true, duplicate: true });
    }

    // Verify with Flutterwave API before fulfilling
    const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
    });
    const verify = await resp.json();
    const vdata = verify?.data || {};
    const ok = (vdata.status || '').toLowerCase() === 'successful' && String(vdata.tx_ref) === String(txRef);

    if (ok) {
      // 1) Update cart payment record if we can locate the cart
      const currency = String(vdata.currency || '').toUpperCase() || undefined;
      const amountCents = Math.max(1, Math.round(Number(vdata.amount || 0) * 100));
      const flw_tx_id = String(vdata.id || txId);
      const meta = vdata.meta || data.meta || {};
      const cartId = meta.cartId || meta.cart_id;

      try {
        let cart = null;
        if (cartId) {
          cart = await Cart.findById(cartId);
        }
        if (!cart) {
          cart = await Cart.findOne({ 'payments.tx_ref': txRef });
        }

        if (cart) {
          const cur = currency || 'USD';
          const idx = cart.payments.findIndex(p => p.provider === 'flutterwave' && p.currency === cur);
          const record = { provider: 'flutterwave', currency: cur, amountCents, tx_ref: String(txRef), flw_tx_id, status: 'successful', updatedAt: new Date() };
          if (idx >= 0) cart.payments[idx] = record; else cart.payments.push(record);
          await cart.save();
          console.log(`🧾 Cart ${cart._id} payment updated via Flutterwave webhook: ${cur} ${amountCents}c`);
        }
      } catch (cartErr) {
        console.warn('Failed to update cart from Flutterwave webhook:', cartErr.message);
      }

      // 2) Update order if it exists and references this tx_ref (support both paymentDetails.tx_ref and top-level tx_ref)
      try {
        const order = await Order.findOne({ $or: [ { 'paymentDetails.tx_ref': txRef }, { tx_ref: txRef } ] });
        if (order) {
          order.status = 'completed';
          order.completedAt = new Date().toISOString();
          // persist tx_ref on order for universal linkage
          if (!order.tx_ref) order.tx_ref = String(txRef);
          await order.save();
          console.log(`📦 Order ${order.orderNumber} marked as completed via Flutterwave webhook`);
        }
      } catch (orderErr) {
        console.warn('Order update via Flutterwave webhook failed:', orderErr.message);
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Flutterwave webhook handler error:', error);
    return res.status(400).json({ success: false, message: 'Flutterwave webhook handler failed' });
  }
});

module.exports = router;
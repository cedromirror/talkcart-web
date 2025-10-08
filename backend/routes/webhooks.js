const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
// Cart model removed as part of cart functionality removal
const WebhookEvent = require('../models/WebhookEvent');
const crypto = require('crypto');

const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH; // For webhook verification
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;   // For server-side verification

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
// @desc    Handle Flutterwave webhook events (payment completion)
// @access  Public (with signature verification)
router.post('/flutterwave', express.raw({ type: 'application/json' }), verifyFlutterwaveSignature, async (req, res) => {
  try {
    // Idempotency guard: store processed Flutterwave event IDs
    const data = JSON.parse(req.body);
    const txId = String(data.id || '');
    const txRef = String(data.tx_ref || data.data?.tx_ref || '');

    if (!txId || !txRef) {
      return res.status(400).json({ success: false, message: 'Invalid Flutterwave event data' });
    }

    try {
      await WebhookEvent.create({ source: 'flutterwave', eventId: txId, meta: { txRef } });
    } catch (e) {
      // Duplicate (unique index) → already processed
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
      // Update order if it exists and references this tx_ref (support both paymentDetails.tx_ref and top-level tx_ref)
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
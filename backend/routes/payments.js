const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const Joi = require('joi');
const { authenticateToken } = require('./auth');

// Initialize Stripe if key provided
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null;

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

// Validation schema for custom intent creation (Stripe legacy)
const createIntentSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    id: Joi.string().optional(),
    name: Joi.string().optional(),
    price: Joi.number().min(0).optional(),
    quantity: Joi.number().integer().min(1).default(1),
    metadata: Joi.object().unknown(true).optional(),
  })).default([]),
  amount: Joi.number().min(0).optional(),
  currency: Joi.string().lowercase().default('usd'),
  metadata: Joi.object().unknown(true).default({}),
  idempotencyKey: Joi.string().optional(),
}).required();

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

    const payload = {
      ...value,
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

// @route   POST /api/payments/intent
// @desc    Create Stripe PaymentIntent (legacy)
// @access  Private
router.post('/intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ success: false, error: 'Stripe not configured' });
    }

    const { error, value } = createIntentSchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    }

    const { items, amount, currency, metadata, idempotencyKey } = value;

    // Compute amount from items if not specified
    let totalMajor = amount;
    if (totalMajor == null) {
      totalMajor = items.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
    }

    if (!totalMajor || totalMajor <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount (computed or provided is 0)' });
    }

    // Build a concise metadata object (Stripe has size limits on metadata)
    const safeMetadata = { ...metadata };
    if (Array.isArray(items) && items.length > 0) {
      const summary = items.slice(0, 10).map((it) => ({ id: it.id, name: it.name, q: it.quantity, p: it.price }));
      safeMetadata.items_summary = JSON.stringify(summary);
      if (items.length > 10) safeMetadata.items_truncated = 'true';
    }

    const createArgs = {
      amount: Math.floor(totalMajor * 100), // convert to cents
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: safeMetadata,
    };

    const intent = await stripe.paymentIntents.create(createArgs, idempotencyKey ? { idempotencyKey } : undefined);

    return res.json({ success: true, data: { clientSecret: intent.client_secret, id: intent.id, amountCents: intent.amount, currency: intent.currency } });
  } catch (error) {
    console.error('Stripe intent error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create PaymentIntent', message: error.message });
  }
});

module.exports = router;
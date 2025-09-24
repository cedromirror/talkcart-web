const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateTokenStrict } = require('./auth');
const Joi = require('joi');
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.warn('Stripe SDK not initialized:', e.message);
  }
}

// Flutterwave config and verification helper
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
async function verifyFlutterwaveTransaction(txId, expectedTxRef, expectedAmount, expectedCurrency) {
  if (!FLW_SECRET_KEY) {
    throw new Error('Flutterwave secret key not configured');
  }
  const url = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(txId)}/verify`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Flutterwave verify failed (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  const data = json?.data || {};
  const statusOk = (data.status || '').toLowerCase() === 'successful';
  const refOk = !expectedTxRef || String(data.tx_ref) === String(expectedTxRef);
  const currencyOk = !expectedCurrency || String(data.currency || '').toUpperCase() === String(expectedCurrency).toUpperCase();
  const amountOk = !expectedAmount || Number(data.amount || 0) >= Number(expectedAmount);
  return { ok: !!(statusOk && refOk && currencyOk && amountOk), data };
}

// Payment details validation schemas
const stripeDetailsSchema = Joi.object({
  paymentIntentId: Joi.string().pattern(/^pi_/).required(),
}).required();

const flutterwaveDetailsSchema = Joi.object({
  tx_ref: Joi.string().min(8).required(),
  flw_tx_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  currency: Joi.string().uppercase().optional(),
}).required();

const cryptoDetailsSchema = Joi.object({
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  networkId: Joi.number().valid(1, 5, 137, 80001).required(),
}).required();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price currency images isNFT category description vendorId availability'
      });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    // Filter out any items where product no longer exists
    const validItems = cart.items.filter(item => item.productId);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    res.json({
      success: true,
      data: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        payments: cart.payments || [],
        summary: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalAmount,
          currency: 'USD', // Default currency
          hasNFTs: cart.items.some(item => item.productId?.isNFT),
          hasCryptoItems: cart.items.some(item => ['ETH', 'BTC', 'USDC', 'USDT'].includes(item.currency))
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

// @route   POST /api/cart/create-payment-intent
// @desc    Create Stripe PaymentIntent for non-NFT items subtotal
// @access  Private
router.post('/create-payment-intent', authenticateTokenStrict, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ success: false, message: 'Stripe not configured' });
    }
    const userId = req.user.userId;
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'isNFT name'
    });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    const regularItems = cart.items.filter(i => !i.productId?.isNFT);
    if (regularItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No regular items eligible for Stripe' });
    }
    const subtotal = regularItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const amountCents = Math.max(1, Math.round(subtotal * 100));
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { userId }
    });

    // Store/update payment record for USD group
    const cur = 'USD';
    const idx = cart.payments.findIndex(p => p.provider === 'stripe' && p.currency === cur);
    const record = { provider: 'stripe', currency: cur, paymentIntentId: intent.id, amountCents, status: intent.status, updatedAt: new Date() };
    if (idx >= 0) cart.payments[idx] = record; else cart.payments.push(record);
    await cart.save();

    return res.json({ success: true, data: { clientSecret: intent.client_secret, id: intent.id, amountCents } });
  } catch (err) {
    console.error('Create cart PaymentIntent error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create PaymentIntent' });
  }
});

// @route   POST /api/cart/create-intent/:currency
// @desc    Create Stripe PaymentIntent for a specific currency group (non-NFT items), with server-side price verification
// @access  Private
router.post('/create-intent/:currency', authenticateTokenStrict, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ success: false, message: 'Stripe not configured' });
    }

    const userId = req.user.userId;
    const rawCurrency = String(req.params.currency || '').toLowerCase();
    if (!rawCurrency) {
      return res.status(400).json({ success: false, message: 'Currency is required' });
    }

    // Allow list for Stripe fiat currencies (extend as needed)
    const allowedFiat = new Set(['usd', 'eur', 'gbp', 'cad', 'aud']);
    if (!allowedFiat.has(rawCurrency)) {
      return res.status(400).json({ success: false, message: `Currency not supported for Stripe: ${rawCurrency}` });
    }

    // Load cart with products to verify integrity
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'isNFT name price currency availability'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Filter non-NFT items that match the requested currency (match using Product.currency)
    const targetUpper = rawCurrency.toUpperCase();
    const groupItems = cart.items.filter(i => i.productId && !i.productId.isNFT && String(i.productId.currency || '').toUpperCase() === targetUpper);

    if (groupItems.length === 0) {
      return res.status(400).json({ success: false, message: `No eligible items for currency ${targetUpper}` });
    }

    // Validate availability and recompute subtotal based on authoritative Product.price and quantities
    const unavailable = groupItems.filter(i => ['sold', 'unavailable'].includes(String(i.productId.availability)));
    if (unavailable.length > 0) {
      return res.status(400).json({ success: false, message: 'Some items are no longer available in this currency group' });
    }

    const itemsSummary = groupItems.map(i => ({
      productId: String(i.productId._id),
      name: i.productId.name,
      unitPrice: Number(i.productId.price),
      quantity: Number(i.quantity || 1),
      cartItemId: String(i._id)
    }));
    const subtotalMajor = itemsSummary.reduce((sum, it) => sum + (Number(it.unitPrice) * Number(it.quantity)), 0);

    if (subtotalMajor <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid subtotal computed for currency group' });
    }

    const amountCents = Math.max(1, Math.round(subtotalMajor * 100));

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: rawCurrency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: String(userId),
        cartId: String(cart._id),
        currencyGroup: targetUpper,
        items_summary: JSON.stringify(itemsSummary.slice(0, 10)),
        items_truncated: itemsSummary.length > 10 ? 'true' : 'false'
      }
    });

    // Store/update payment record for this currency group
    const idx = cart.payments.findIndex(p => p.provider === 'stripe' && p.currency === targetUpper);
    const record = { provider: 'stripe', currency: targetUpper, paymentIntentId: intent.id, amountCents, status: intent.status, updatedAt: new Date() };
    if (idx >= 0) cart.payments[idx] = record; else cart.payments.push(record);
    await cart.save();

    return res.json({ success: true, data: { clientSecret: intent.client_secret, id: intent.id, amountCents, currency: rawCurrency, items: itemsSummary } });
  } catch (err) {
    console.error('Create cart currency PaymentIntent error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create PaymentIntent for currency group' });
  }
});

// @route   POST /api/cart/flutterwave/init/:currency
// @desc    Initialize Flutterwave payment for a specific currency group in the cart
// @access  Private
router.post('/flutterwave/init/:currency', authenticateTokenStrict, async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) {
      return res.status(400).json({ success: false, message: 'Flutterwave not configured' });
    }

    const userId = req.user.userId;
    const rawCurrency = String(req.params.currency || '').toUpperCase();
    const allowedFLW = new Set(['RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS', 'SOS']);
    if (!rawCurrency || !allowedFLW.has(rawCurrency)) {
      return res.status(400).json({ success: false, message: `Currency not supported for Flutterwave: ${rawCurrency || '(missing)'}` });
    }

    // Load cart with products to verify integrity
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'isNFT name price currency availability'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Filter non-NFT items that match the requested currency
    const groupItems = cart.items.filter(i => i.productId && !i.productId.isNFT && String(i.productId.currency || '').toUpperCase() === rawCurrency);
    if (groupItems.length === 0) {
      return res.status(400).json({ success: false, message: `No eligible items for currency ${rawCurrency}` });
    }

    // Validate availability and recompute subtotal
    const unavailable = groupItems.filter(i => ['sold', 'unavailable'].includes(String(i.productId.availability)));
    if (unavailable.length > 0) {
      return res.status(400).json({ success: false, message: 'Some items are no longer available in this currency group' });
    }

    const itemsSummary = groupItems.map(i => ({
      productId: String(i.productId._id),
      name: i.productId.name,
      unitPrice: Number(i.productId.price),
      quantity: Number(i.quantity || 1),
      cartItemId: String(i._id)
    }));
    const subtotalMajor = itemsSummary.reduce((sum, it) => sum + (Number(it.unitPrice) * Number(it.quantity)), 0);
    if (subtotalMajor <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid subtotal computed for currency group' });
    }

    // Validate request body for tx_ref and customer
    const flwCartInitSchema = Joi.object({
      tx_ref: Joi.string().min(8).required(),
      customer: Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().optional(),
        phonenumber: Joi.string().optional(),
      }).required(),
      redirect_url: Joi.string().uri().optional(),
      meta: Joi.object().unknown(true).default({}),
    }).required();

    const { error, value } = flwCartInitSchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, message: 'Validation failed', details: error.details.map(d => d.message) });
    }

    const payload = {
      amount: subtotalMajor,
      currency: rawCurrency,
      tx_ref: value.tx_ref,
      customer: value.customer,
      redirect_url: value.redirect_url || undefined,
      meta: {
        ...(value.meta || {}),
        userId: String(userId),
        cartId: String(cart._id),
        currencyGroup: rawCurrency,
        items_summary: itemsSummary.slice(0, 10),
        items_truncated: itemsSummary.length > 10 ? 'true' : 'false',
      },
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
      return res.status(500).json({ success: false, message: 'Failed to initialize Flutterwave payment', details: data });
    }

    // Persist/initiate cart payment record for this currency group
    const amountCents = Math.max(1, Math.round(subtotalMajor * 100));
    const recIdx = cart.payments.findIndex(p => p.provider === 'flutterwave' && p.currency === rawCurrency && p.tx_ref === value.tx_ref);
    const record = { provider: 'flutterwave', currency: rawCurrency, amountCents, tx_ref: value.tx_ref, status: 'initialized', updatedAt: new Date() };
    if (recIdx >= 0) cart.payments[recIdx] = record; else cart.payments.push(record);
    await cart.save();

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Create cart Flutterwave init error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize Flutterwave for currency group' });
  }
});

// @route   PATCH /api/cart/payment/flutterwave/status
// @desc    Refresh Flutterwave payment status for a given tx_ref and flw_tx_id and persist to cart.payments
// @access  Private
router.patch('/payment/flutterwave/status', authenticateTokenStrict, async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) return res.status(400).json({ success: false, message: 'Flutterwave not configured' });
    const userId = req.user.userId;
    const { error, value } = flutterwaveDetailsSchema.validate(req.body || {}, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: 'Invalid Flutterwave payment details', details: error.details.map(d => d.message) });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const verify = await verifyFlutterwaveTransaction(value.flw_tx_id, value.tx_ref);
    if (!verify.ok) {
      return res.status(402).json({ success: false, message: 'Payment not verified as successful' });
    }

    const v = verify.data || {};
    const currency = String(v.currency || '').toUpperCase() || 'USD';
    const amountCents = Math.max(1, Math.round(Number(v.amount || 0) * 100));
    const status = String(v.status || '').toLowerCase();

    // Update/create payment record
    let idx = cart.payments.findIndex(p => p.provider === 'flutterwave' && p.currency === currency && p.tx_ref === value.tx_ref);
    if (idx < 0) idx = cart.payments.findIndex(p => p.provider === 'flutterwave' && p.currency === currency);
    const record = { provider: 'flutterwave', currency, amountCents, tx_ref: String(value.tx_ref), flw_tx_id: String(value.flw_tx_id), status, updatedAt: new Date() };
    if (idx >= 0) cart.payments[idx] = record; else cart.payments.push(record);
    await cart.save();

    return res.json({ success: true, data: { currency, amountCents, status, tx_ref: value.tx_ref, flw_tx_id: String(value.flw_tx_id) } });
  } catch (err) {
    console.error('Refresh Flutterwave payment status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to refresh Flutterwave payment status' });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is available
    if (product.availability === 'sold' || product.availability === 'unavailable') {
      return res.status(400).json({
        success: false,
        message: 'Product is not available for purchase'
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Add item to cart
    const added = cart.addItem(productId, product, quantity);

    if (!added) {
      return res.status(400).json({
        success: false,
        message: 'Item already exists in cart (NFTs cannot be duplicated)'
      });
    }

    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.productId',
      select: 'name price currency images isNFT category description vendorId availability'
    });

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        payments: cart.payments || [],
        summary: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalAmount,
          currency: 'USD',
          hasNFTs: cart.items.some(item => item.productId?.isNFT),
          hasCryptoItems: cart.items.some(item => ['ETH', 'BTC', 'USDC', 'USDT'].includes(item.currency))
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
});

// @route   PUT /api/cart/item/:itemId
// @desc    Update cart item quantity
// @access  Private
router.put('/item/:itemId', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const updated = cart.updateItemQuantity(itemId, quantity);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.productId',
      select: 'name price currency images isNFT category description vendorId availability'
    });

    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        payments: cart.payments || [],
        summary: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalAmount,
          currency: 'USD',
          hasNFTs: cart.items.some(item => item.productId?.isNFT),
          hasCryptoItems: cart.items.some(item => ['ETH', 'BTC', 'USDC', 'USDT'].includes(item.currency))
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item'
    });
  }
});

// @route   DELETE /api/cart/item/:itemId
// @desc    Remove item from cart
// @access  Private
router.delete('/item/:itemId', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.removeItem(itemId);
    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.productId',
      select: 'name price currency images isNFT category description vendorId availability'
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        _id: cart._id,
        userId: cart.userId,
        items: cart.items,
        payments: cart.payments || [],
        summary: {
          totalItems: cart.totalItems,
          totalPrice: cart.totalAmount,
          currency: 'USD',
          hasNFTs: cart.items.some(item => item.productId?.isNFT),
          hasCryptoItems: cart.items.some(item => ['ETH', 'BTC', 'USDC', 'USDT'].includes(item.currency))
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove cart item'
    });
  }
});

// @route   DELETE /api/cart/clear
// @desc    Clear all items from cart
// @access  Private
router.delete('/clear', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.clearCart();
    await cart.save();

    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        _id: cart._id,
        userId: cart.userId,
        items: [],
        summary: {
          totalItems: 0,
          totalPrice: 0,
          currency: 'USD',
          hasNFTs: false,
          hasCryptoItems: false
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

// @route   POST /api/cart/checkout
// @desc    Process cart checkout with multiple payment methods
// @access  Private
// Idempotency: prevent duplicate processing for the same request
const processedCheckouts = new Set(); // key: userId + paymentMethod + intentId + timestamp bucket

router.post('/checkout', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethod, paymentDetails } = req.body;

    // Validate payment method
    const validPaymentMethods = ['stripe', 'flutterwave', 'mobile_money', 'crypto', 'nft'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Validate paymentDetails shape per method
    try {
      if (paymentMethod === 'stripe') {
        const { error } = stripeDetailsSchema.validate(paymentDetails);
        if (error) {
          return res.status(400).json({ success: false, message: `Invalid Stripe payment details: ${error.message}` });
        }
      } else if (paymentMethod === 'flutterwave') {
        // Optional: allow using only cart.payments records without providing details here
        if (paymentDetails) {
          if (Array.isArray(paymentDetails)) {
            for (const d of paymentDetails) {
              const { error } = flutterwaveDetailsSchema.validate(d);
              if (error) {
                return res.status(400).json({ success: false, message: `Invalid Flutterwave payment details: ${error.message}` });
              }
            }
          } else {
            const { error } = flutterwaveDetailsSchema.validate(paymentDetails);
            if (error) {
              return res.status(400).json({ success: false, message: `Invalid Flutterwave payment details: ${error.message}` });
            }
          }
        }
      } else if (paymentMethod === 'crypto' || paymentMethod === 'nft') {
        const { error } = cryptoDetailsSchema.validate(paymentDetails);
        if (error) {
          return res.status(400).json({ success: false, message: `Invalid crypto payment details: ${error.message}` });
        }
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid payment details' });
    }

    // Simple idempotency key (5-minute bucket)
    const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
    let idemKeyExtra = '';
    if (paymentMethod === 'stripe') {
      idemKeyExtra = paymentDetails?.paymentIntentId || '';
    } else if (paymentMethod === 'flutterwave') {
      // Build a deterministic key from tx_ref(s) and flw_tx_id(s) if provided; else fallback to method only
      const details = Array.isArray(paymentDetails) ? paymentDetails : (paymentDetails ? [paymentDetails] : []);
      const parts = details.map(d => `${d?.tx_ref || ''}:${d?.flw_tx_id || ''}`).sort().join('|');
      idemKeyExtra = parts || 'cart-records';
    } else {
      idemKeyExtra = paymentMethod;
    }
    const idemKey = `${userId}:${paymentMethod}:${idemKeyExtra}:${bucket}`;
    if (processedCheckouts.has(idemKey)) {
      return res.status(409).json({ success: false, message: 'Duplicate checkout request detected. Please wait a moment and try again.' });
    }
    processedCheckouts.add(idemKey);
    setTimeout(() => processedCheckouts.delete(idemKey), 10 * 60 * 1000);

    // Get user's cart
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name price currency images isNFT category description vendorId availability'
      });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate all items are still available
    const unavailableItems = cart.items.filter(item =>
      !item.productId ||
      item.productId.availability === 'sold' ||
      item.productId.availability === 'unavailable'
    );

    if (unavailableItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some items in cart are no longer available',
        data: { unavailableItems }
      });
    }

    // Separate items by payment type
    const regularItems = cart.items.filter(item => !item.productId.isNFT);
    const nftItems = cart.items.filter(item => item.productId.isNFT);

    let results = {
      success: true,
      message: 'Checkout completed successfully',
      data: {
        orderId: `order_${Date.now()}_${userId.substring(0, 8)}`,
        processedItems: [],
        failedItems: [],
        totalAmount: cart.totalAmount,
        paymentMethod
      }
    };

    // Process regular items with Stripe (require all currency groups to be paid)
    if (regularItems.length > 0 && paymentMethod === 'stripe') {
      if (!stripe) {
        return res.status(500).json({ success: false, message: 'Stripe is not configured on the server' });
      }

      // Determine currency groups for non-NFT items by Product.currency
      const groups = new Map();
      const stripeGroupIntents = new Map(); // currency (UPPER) -> { id, amountCents }
      for (const item of regularItems) {
        const cur = String(item.productId.currency || 'USD').toUpperCase();
        if (!groups.has(cur)) groups.set(cur, []);
        groups.get(cur).push(item);
      }

      // Verify each group's PaymentIntent has succeeded; persist latest status to cart.payments
      for (const [cur, items] of groups.entries()) {
        // Find a recorded paymentIntent for this currency
        const record = cart.payments.find(p => p.provider === 'stripe' && p.currency === cur);
        const providedId = paymentDetails?.paymentIntentId; // backwards compatibility for single-currency

        let paymentIntentIdToCheck = record?.paymentIntentId || providedId;
        if (!paymentIntentIdToCheck) {
          return res.status(400).json({ success: false, message: `Missing PaymentIntent for currency group ${cur}` });
        }

        let paymentIntent;
        try {
          paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentIdToCheck);
        } catch (err) {
          return res.status(400).json({ success: false, message: `Invalid PaymentIntent for ${cur}` });
        }

        if (paymentIntent.currency.toUpperCase() !== cur) {
          return res.status(400).json({ success: false, message: `PaymentIntent currency mismatch for ${cur}` });
        }
        if (paymentIntent.status !== 'succeeded') {
          return res.status(402).json({ success: false, message: `Payment not completed for ${cur}. Status: ${paymentIntent.status}` });
        }

        // Update/Add payment record and track intent for possible partial reversal
        const recIdx = cart.payments.findIndex(p => p.provider === 'stripe' && p.currency === cur);
        const amountCents = Number(paymentIntent.amount);
        const rec = { provider: 'stripe', currency: cur, paymentIntentId: paymentIntent.id, amountCents, status: paymentIntent.status, updatedAt: new Date() };
        if (recIdx >= 0) cart.payments[recIdx] = rec; else cart.payments.push(rec);
        stripeGroupIntents.set(cur, { id: paymentIntent.id, amountCents });
      }

      await cart.save();

      // All groups are paid; atomically decrement stock and mark processed
      for (const item of regularItems) {
        try {
          // Validate sufficient stock and decrement atomically
          const updated = await Product.findOneAndUpdate(
            {
              _id: item.productId._id,
              isNFT: false,
              isActive: true,
              // Either no stock tracking or stock >= quantity
              $or: [
                { stock: { $exists: false } },
                { stock: { $gte: item.quantity } }
              ]
            },
            {
              $inc: { stock: -item.quantity, sales: item.quantity }
            },
            { new: true }
          );

          if (!updated) {
            results.data.failedItems.push({
              productId: item.productId._id,
              name: item.productId.name,
              error: 'Insufficient stock or product unavailable'
            });
            continue;
          }

          results.data.processedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            quantity: item.quantity,
            amount: item.price * item.quantity,
            paymentMethod: 'stripe',
            status: 'completed'
          });
        } catch (error) {
          results.data.failedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            error: error.message
          });
        }
      }
    }

    // Process regular items with Flutterwave (require all currency groups to be paid)
    if (regularItems.length > 0 && paymentMethod === 'flutterwave') {
      if (!FLW_SECRET_KEY) {
        return res.status(500).json({ success: false, message: 'Flutterwave is not configured on the server' });
      }

      // Determine currency groups for non-NFT items by Product.currency
      const flwGroups = new Map(); // CUR -> items
      for (const item of regularItems) {
        const cur = String(item.productId.currency || 'USD').toUpperCase();
        if (!flwGroups.has(cur)) flwGroups.set(cur, []);
        flwGroups.get(cur).push(item);
      }

      // Build a quick index of provided details by currency if present
      const providedDetails = Array.isArray(paymentDetails) ? paymentDetails : (paymentDetails ? [paymentDetails] : []);
      const detailsByCur = new Map();
      for (const d of providedDetails) {
        if (!d) continue;
        const cur = String(d.currency || '').toUpperCase();
        if (!cur) continue;
        detailsByCur.set(cur, d);
      }

      // Verify each group's Flutterwave transaction and persist to cart.payments
      for (const [cur, items] of flwGroups.entries()) {
        // Preferred: Find prior cart payment record for this currency & tx_ref
        let record = cart.payments.find(p => p.provider === 'flutterwave' && p.currency === cur && p.status);
        const provided = detailsByCur.get(cur);
        const txRef = provided?.tx_ref || record?.tx_ref;
        const flwTxId = provided?.flw_tx_id || record?.flw_tx_id;
        if (!txRef || !flwTxId) {
          return res.status(400).json({ success: false, message: `Missing Flutterwave tx_ref or flw_tx_id for currency group ${cur}` });
        }

        // Compute expected subtotal for the group for server-side validation
        const subtotalMajor = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
        const expectedAmount = subtotalMajor; // in major units

        const verify = await verifyFlutterwaveTransaction(String(flwTxId), String(txRef), expectedAmount, cur);
        if (!verify.ok) {
          return res.status(402).json({ success: false, message: `Payment not completed or invalid for ${cur}` });
        }

        const v = verify.data || {};
        const amountCents = Math.max(1, Math.round(Number(v.amount || 0) * 100));
        const status = String(v.status || '').toLowerCase();

        // Update/Add cart payment record
        const recIdx = cart.payments.findIndex(p => p.provider === 'flutterwave' && p.currency === cur);
        const rec = { provider: 'flutterwave', currency: cur, amountCents, tx_ref: String(txRef), flw_tx_id: String(flwTxId), status, updatedAt: new Date() };
        if (recIdx >= 0) cart.payments[recIdx] = rec; else cart.payments.push(rec);
      }

      await cart.save();

      // All groups verified; decrement stock and mark processed
      for (const item of regularItems) {
        try {
          const updated = await Product.findOneAndUpdate(
            {
              _id: item.productId._id,
              isNFT: false,
              isActive: true,
              $or: [
                { stock: { $exists: false } },
                { stock: { $gte: item.quantity } }
              ]
            },
            {
              $inc: { stock: -item.quantity, sales: item.quantity }
            },
            { new: true }
          );

          if (!updated) {
            results.data.failedItems.push({
              productId: item.productId._id,
              name: item.productId.name,
              error: 'Insufficient stock or product unavailable'
            });
            continue;
          }

          results.data.processedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            quantity: item.quantity,
            amount: item.price * item.quantity,
            paymentMethod: 'flutterwave',
            status: 'completed'
          });
        } catch (error) {
          results.data.failedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            error: error.message
          });
        }
      }
    }

    // Process NFT items with crypto/Web3
    if (nftItems.length > 0 && (paymentMethod === 'crypto' || paymentMethod === 'nft')) {
      const { txHash, walletAddress, networkId } = paymentDetails;
      // Optionally verify tx on-chain using ethers
      try {
        const { getProvider } = require('../services/web3Service');
        const provider = getProvider(networkId);
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) {
          return res.status(402).json({ success: false, message: 'Crypto payment not confirmed on-chain' });
        }
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Unable to verify crypto transaction' });
      }

      for (const item of nftItems) {
        try {
          // Mark NFT as sold
          await Product.findByIdAndUpdate(item.productId._id, {
            availability: 'sold'
          });

          results.data.processedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            quantity: item.quantity,
            amount: item.price,
            paymentMethod: 'nft',
            status: 'completed'
          });

        } catch (error) {
          results.data.failedItems.push({
            productId: item.productId._id,
            name: item.productId.name,
            error: error.message
          });
        }
      }
    }

    // Create order for successfully processed items
    if (results.data.processedItems.length > 0) {
      try {
        const orderItems = results.data.processedItems.map(processedItem => {
          const cartItem = cart.items.find(item =>
            item.productId._id.toString() === processedItem.productId.toString()
          );
          return {
            productId: processedItem.productId,
            name: processedItem.name,
            price: cartItem.price,
            quantity: processedItem.quantity,
            currency: cartItem.currency || 'USD',
            isNFT: cartItem.productId.isNFT || false
          };
        });

        // Ensure Flutterwave identifiers are stored with the order if applicable
        let orderPaymentDetails = paymentDetails;
        if (paymentMethod === 'flutterwave') {
          const usedCurrencies = new Set(regularItems.map(i => String(i.productId.currency || 'USD').toUpperCase()));
          const flwRecs = (cart.payments || []).filter(p => p.provider === 'flutterwave' && usedCurrencies.has(String(p.currency || '').toUpperCase()));
          if (flwRecs.length > 0) {
            orderPaymentDetails = flwRecs.map(({ currency, tx_ref, flw_tx_id, amountCents, status }) => ({ currency, tx_ref, flw_tx_id, amountCents, status }));
          }
        }

        const order = new Order({
          userId,
          items: orderItems,
          totalAmount: results.data.processedItems.reduce((sum, item) => sum + item.amount, 0),
          currency: orderItems[0]?.currency || 'USD',
          paymentMethod,
          paymentDetails: orderPaymentDetails,
          tx_ref: Array.isArray(orderPaymentDetails)
            ? (orderPaymentDetails[0]?.tx_ref || undefined)
            : (orderPaymentDetails?.tx_ref || undefined),
          status: 'completed'
        });

        await order.save();
        results.data.orderId = order._id;
        results.data.orderNumber = order.orderNumber;
      } catch (orderError) {
        console.error('Error creating order:', orderError);
        // Don't fail the entire checkout if order creation fails
      }
    }

    // Clear cart after successful checkout
    if (results.data.failedItems.length === 0) {
      cart.clearCart();
      await cart.save();
      results.message = 'Checkout completed successfully. Cart cleared.';
    } else {
      // Remove only successfully processed items
      for (const processedItem of results.data.processedItems) {
        const itemToRemove = cart.items.find(item =>
          item.productId._id.toString() === processedItem.productId.toString()
        );
        if (itemToRemove) {
          cart.removeItem(itemToRemove._id);
        }
      }
      await cart.save();

      // Attempt partial reversal for Stripe payments if some regular items failed
      if (paymentMethod === 'stripe') {
        try {
          // Identify failed regular (non-NFT) items still in the cart snapshot and sum refund per currency
          const refundByCurrency = new Map(); // CUR -> cents
          for (const failed of results.data.failedItems) {
            const orig = cart.items.find(ci => ci.productId && ci.productId._id.toString() === failed.productId.toString());
            if (!orig) continue;
            const isRegular = orig.productId && !orig.productId.isNFT;
            if (!isRegular) continue;
            const cur = String(orig.productId.currency || 'USD').toUpperCase();
            const cents = Math.max(1, Math.round(Number(orig.price) * Number(orig.quantity) * 100));
            refundByCurrency.set(cur, (refundByCurrency.get(cur) || 0) + cents);
          }

          const socketService = req.app.get('socketService');
          for (const [cur, cents] of refundByCurrency.entries()) {
            const intentInfo = stripeGroupIntents.get(cur);
            if (!intentInfo || !intentInfo.id) continue;
            try {
              const amount = Math.min(cents, intentInfo.amountCents);
              if (amount > 0) {
                await stripe.refunds.create({ payment_intent: intentInfo.id, amount });
                results.data.refunds = results.data.refunds || [];
                const payload = { currency: cur, amountCents: amount, paymentIntentId: intentInfo.id, userId, status: 'submitted' };
                results.data.refunds.push(payload);
                if (socketService) socketService.broadcastRefundSubmitted(payload);
              }
            } catch (refundErr) {
              results.data.refunds = results.data.refunds || [];
              const payload = { currency: cur, amountCents: cents, paymentIntentId: intentInfo?.id, userId, status: 'failed', error: refundErr.message };
              results.data.refunds.push(payload);
              if (socketService) socketService.broadcastRefundFailed(payload);
              results.data.manualReview = true;
            }
          }
        } catch (prErr) {
          results.data.manualReview = true;
        }
      }

      results.message = 'Checkout partially completed. Some items failed.';
      results.success = results.data.processedItems.length > 0;
    }

    res.json(results);

  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Checkout failed',
      error: error.message
    });
  }
});

// @route   PATCH /api/cart/payment/stripe/status
// @desc    Refresh Stripe payment status for a given PaymentIntent ID and persist to cart.payments
// @access  Private
router.patch('/payment/stripe/status', authenticateTokenStrict, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const userId = req.user.userId;
    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId || !/^pi_/.test(paymentIntentId)) {
      return res.status(400).json({ success: false, message: 'Valid paymentIntentId is required' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    let intent;
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'PaymentIntent not found' });
    }

    const currency = String(intent.currency || '').toUpperCase();
    const amountCents = Number(intent.amount);
    const status = intent.status;

    const idx = cart.payments.findIndex(p => p.provider === 'stripe' && (p.paymentIntentId === paymentIntentId || p.currency === currency));
    const record = { provider: 'stripe', currency, paymentIntentId, amountCents, status, updatedAt: new Date() };
    if (idx >= 0) cart.payments[idx] = record; else cart.payments.push(record);
    await cart.save();

    return res.json({ success: true, data: { currency, amountCents, status } });
  } catch (err) {
    console.error('Refresh Stripe payment status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to refresh payment status' });
  }
});

module.exports = router;
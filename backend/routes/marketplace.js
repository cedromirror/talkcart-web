const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Product, User, Order, ProductReview, VendorPaymentPreferences, VendorStore } = require('../models');
const { uploadToCloudinary } = require('../config/cloudinary');
const Joi = require('joi');
const { ethers } = require('ethers');
const { validate } = require('../middleware/validation');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');


// Canonical categories list reused across routes and validation
const CATEGORIES = [
  'Digital Art',
  'Electronics',
  'Fashion',
  'Gaming',
  'Music',
  'Books',
  'Collectibles',
  'Education',
  'Accessories',
  'Food & Beverages',
  'Fitness',
  'Other'
];

// Optional Stripe initialization for real payments verification
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.warn('Stripe SDK not initialized in marketplace routes:', e.message);
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

  // Required checks per best practices
  const statusOk = (data.status || '').toLowerCase() === 'successful';
  const refOk = !expectedTxRef || String(data.tx_ref) === String(expectedTxRef);
  const currencyOk = !expectedCurrency || String(data.currency || '').toUpperCase() === String(expectedCurrency).toUpperCase();
  const amountOk = !expectedAmount || Number(data.amount || 0) >= Number(expectedAmount);

  return { ok: !!(statusOk && refOk && currencyOk && amountOk), data };
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Product model is imported from ../models

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Marketplace service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   POST /api/marketplace/products/upload-images
// @desc    Upload product images (Authenticated users only)
// @access  Private - Authenticated users only
router.post('/products/upload-images', authenticateTokenStrict, upload.array('images', 5), async (req, res) => {
  try {
    // Check if user is authenticated
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User not found.'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided'
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.buffer, {
          folder: 'marketplace/products',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        });

        uploadedImages.push({
          public_id: result.public_id,
          url: result.url,
          secure_url: result.secure_url,
          width: result.width,
          height: result.height
        });
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Continue with other images
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload any images'
      });
    }

    res.json({
      success: true,
      data: { images: uploadedImages },
      message: `${uploadedImages.length} image(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/products
// @desc    Get all products (with filters and sorting)
// @access  Public
router.get('/products', async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      category,
      search,
      minPrice,
      maxPrice,
      vendorId,
      isNFT,
      featured,
      sortBy // priceAsc | priceDesc | newest | sales | views | featured
    } = req.query;

    // Build query
    let query = { isActive: true };

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by vendor
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Filter by NFT flag
    if (typeof isNFT !== 'undefined') {
      query.isNFT = isNFT === 'true' || isNFT === true;
    }

    // Filter by featured
    if (typeof featured !== 'undefined') {
      query.featured = featured === 'true' || featured === true;
    }

    // Price filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    let sort = {};
    if (search) {
      sort = { score: { $meta: 'textScore' } };
    } else {
      switch (sortBy) {
        case 'priceAsc':
          sort = { price: 1 };
          break;
        case 'priceDesc':
          sort = { price: -1 };
          break;
        case 'sales':
          sort = { sales: -1 };
          break;
        case 'views':
          sort = { views: -1 };
          break;
        case 'featured':
          sort = { featured: -1, createdAt: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
      }
    }

    // Allow all active products from any vendor
    // If a vendorId is provided, use it as is
    // Otherwise, show all active products from all vendors
    if (query.vendorId) {
      // Validate the vendorId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(query.vendorId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vendor ID'
        });
      }
    }
    // If no vendorId is provided, we'll show all active products (no filter needed)

    // Get products from database
    const products = await Product.find(query)
      .populate('vendorId', 'username displayName avatar isVerified walletAddress role')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Product.countDocuments(query);

    // Transform data for compatibility
    const transformedProducts = products.map(product => ({
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress,
        role: product.vendorId.role
      },
      // Include new fields for enhanced marketplace experience
      discount: product.discount || 0,
      freeShipping: product.freeShipping || false,
      fastDelivery: product.fastDelivery || false,
      prime: product.prime || false,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock > 0 || product.isNFT)
    }));

    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get products',
      message: error.message,
    });
  }
});

// @route   POST /api/marketplace/products
// @desc    Create a new product (Authenticated users only)
// @access  Private (strict)
router.post('/products', authenticateTokenStrict, async (req, res) => {
  try {
    // Check if user is authenticated
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User not found.'
      });
    }

    // Define validation schema mirroring frontend rules
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(200).required(),
      description: Joi.string().trim().min(1).max(2000).required(),
      price: Joi.number().positive().required().custom((value, helpers) => {
        const currency = helpers?.state?.ancestors?.[0]?.currency || 'ETH';
        if (['USD', 'USDC', 'USDT'].includes(currency)) {
          // Up to 2 decimals
          if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
            return helpers.error('any.invalid');
          }
        }
        if (value > 1_000_000_000) return helpers.error('any.invalid');
        return value;
      }, 'price-decimals-check'),
      currency: Joi.string().valid('ETH', 'BTC', 'USD', 'USDC', 'USDT').default('ETH'),
      images: Joi.array().items(Joi.object({
        public_id: Joi.string().optional(),
        secure_url: Joi.string().uri().optional(),
        url: Joi.string().uri().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional(),
      })).max(5).default([]),
      category: Joi.string().valid(...CATEGORIES).required(),
      tags: Joi.array().items(Joi.string().trim().max(50)).max(20).default([]),
      stock: Joi.alternatives().conditional('isNFT', {
        is: true,
        then: Joi.number().integer().valid(1).default(1),
        otherwise: Joi.number().integer().min(0).max(1_000_000).default(1),
      }),
      featured: Joi.boolean().default(false),
      isNFT: Joi.boolean().default(false),
      contractAddress: Joi.alternatives().conditional('isNFT', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.forbidden(),
      }),
      tokenId: Joi.alternatives().conditional('isNFT', {
        is: true,
        then: Joi.string().pattern(/^\d+$/).required(), // positive integer as string
        otherwise: Joi.forbidden(),
      }),
      // New fields for enhanced marketplace experience
      discount: Joi.number().min(0).max(99).default(0),
      freeShipping: Joi.boolean().default(false),
      fastDelivery: Joi.boolean().default(false),
      prime: Joi.boolean().default(false),
      inStock: Joi.boolean().default(true),
    });

    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    }

    // Additional contract address validation using ethers
    if (value.isNFT) {
      const addr = String(value.contractAddress).trim();
      if (!ethers.isAddress(addr)) {
        return res.status(400).json({ success: false, error: 'Invalid Ethereum contract address' });
      }
      // Normalize to checksum formatting
      value.contractAddress = ethers.getAddress(addr);
    }

    // Build product doc
    const newProduct = new Product({
      vendorId: req.user.userId,
      name: value.name,
      description: value.description,
      price: value.price,
      currency: value.currency,
      images: value.images,
      category: value.category,
      tags: (value.tags || []).map(t => t.trim()),
      stock: value.stock,
      featured: value.featured,
      isNFT: value.isNFT,
      contractAddress: value.isNFT ? value.contractAddress : undefined,
      tokenId: value.isNFT ? value.tokenId : undefined,
      // New fields for enhanced marketplace experience
      discount: value.discount,
      freeShipping: value.freeShipping,
      fastDelivery: value.fastDelivery,
      prime: value.prime,
      inStock: value.inStock,
      isActive: true,
    });

    await newProduct.save();

    // Populate vendor data
    await newProduct.populate('vendorId', 'username displayName avatar isVerified walletAddress');

    const responseData = {
      ...newProduct.toObject(),
      id: newProduct._id,
      vendor: {
        id: newProduct.vendorId._id,
        username: newProduct.vendorId.username,
        displayName: newProduct.vendorId.displayName,
        avatar: newProduct.vendorId.avatar,
        isVerified: newProduct.vendorId.isVerified,
        walletAddress: newProduct.vendorId.walletAddress,
      },
      // Include new fields for enhanced marketplace experience
      discount: newProduct.discount || 0,
      freeShipping: newProduct.freeShipping || false,
      fastDelivery: newProduct.fastDelivery || false,
      prime: newProduct.prime || false,
      inStock: newProduct.inStock !== undefined ? newProduct.inStock : (newProduct.stock > 0 || newProduct.isNFT)
    };

    res.status(201).json({ success: true, data: responseData, message: 'Product created successfully' });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product', message: error.message });
  }
});

// @route   GET /api/marketplace/products/random
// @desc    Get random products for trending display
// @access  Public
router.get('/products/random', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // First check if there are any active products
    const productCount = await Product.countDocuments({ isActive: true });
    
    if (productCount === 0) {
      return res.json({
        success: true,
        data: {
          products: []
        }
      });
    }
    
    // Get random products using MongoDB aggregation
    const randomProducts = await Product.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: Math.min(parseInt(limit), productCount) } },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          id: '$_id',
          name: 1,
          description: 1,
          price: 1,
          currency: 1,
          images: 1,
          category: 1,
          isNFT: 1,
          featured: 1,
          tags: 1,
          stock: 1,
          rating: 1,
          reviewCount: 1,
          sales: 1,
          views: 1,
          createdAt: 1,
          vendor: {
            id: '$vendor._id',
            username: '$vendor.username',
            displayName: '$vendor.displayName',
            avatar: '$vendor.avatar',
            isVerified: '$vendor.isVerified',
            walletAddress: '$vendor.walletAddress'
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        products: randomProducts
      }
    });
  } catch (error) {
    console.error('Get random products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get random products',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/products/trending
// @desc    Get trending products based on views, sales, and ratings
// @access  Public
router.get('/products/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get trending products based on engagement metrics
    const trendingProducts = await Product.find({ isActive: true })
      .populate('vendorId', 'username displayName avatar isVerified walletAddress')
      .sort({ 
        views: -1, 
        sales: -1, 
        rating: -1, 
        createdAt: -1 
      })
      .limit(parseInt(limit))
      .lean();

    // Transform data for frontend compatibility
    const transformedProducts = trendingProducts.map(product => ({
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress
      }
    }));

    res.json({
      success: true,
      data: {
        products: transformedProducts
      }
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending products',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/products/:id
// @desc    Get single product
// @access  Public
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId early to avoid CastError and unify response as 404
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = await Product.findById(id)
      .populate('vendorId', 'username displayName avatar isVerified walletAddress role')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Increment views and broadcast update
    Product.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
      .then(updatedProduct => {
        // Broadcast view update via socket if available
        if (req.app.get('socketService') && updatedProduct) {
          req.app.get('socketService').broadcastProductViews(id, updatedProduct.views);
        }
      })
      .catch(err => console.error('View increment error:', err));

    // Allow viewing products from any vendor as long as the product is active
    if (!product.vendorId || !product.isActive) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const responseData = {
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress,
        role: product.vendorId.role
      },
      // Include new fields for enhanced marketplace experience
      discount: product.discount || 0,
      freeShipping: product.freeShipping || false,
      fastDelivery: product.fastDelivery || false,
      prime: product.prime || false,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock > 0 || product.isNFT)
    };

    res.json({
      success: true,
      data: { product: responseData },
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product',
      message: error.message,
    });
  }
});

// @route   PUT /api/marketplace/products/:id
// @desc    Update product (Product owner only)
// @access  Private (strict)
router.put('/products/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user is authenticated
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User not found.'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if user owns the product
    if (product.vendorId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this product',
      });
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('vendorId', 'username displayName avatar isVerified walletAddress');

    const responseData = {
      ...updatedProduct.toObject(),
      id: updatedProduct._id,
      vendor: {
        id: updatedProduct.vendorId._id,
        username: updatedProduct.vendorId.username,
        displayName: updatedProduct.vendorId.displayName,
        avatar: updatedProduct.vendorId.avatar,
        isVerified: updatedProduct.vendorId.isVerified,
        walletAddress: updatedProduct.vendorId.walletAddress
      },
      // Include new fields for enhanced marketplace experience
      discount: updatedProduct.discount || 0,
      freeShipping: updatedProduct.freeShipping || false,
      fastDelivery: updatedProduct.fastDelivery || false,
      prime: updatedProduct.prime || false,
      inStock: updatedProduct.inStock !== undefined ? updatedProduct.inStock : (updatedProduct.stock > 0 || updatedProduct.isNFT)
    };

    res.json({
      success: true,
      data: responseData,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error.message,
    });
  }
});

// @route   DELETE /api/marketplace/products/:id
// @desc    Delete product (Product owner only)
// @access  Private (strict)
router.delete('/products/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is authenticated
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. User not found.'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if user owns the product
    if (product.vendorId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this product',
      });
    }

    // Soft delete by setting isActive to false
    await Product.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      message: error.message,
    });
  }
});

// @route   GET /api/marketplace/categories
// @desc    Get all available categories (from Product enum)
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    // Keep a single canonical implementation of categories
    const categories = CATEGORIES;

    res.json({
      success: true,
      data: { categories },
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      message: error.message
    });
  }
});

// @route   POST /api/marketplace/products/:id/buy
// @desc    Buy a product directly (not through cart)
// @access  Private
router.post('/products/:id/buy', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;
    const { paymentMethod, paymentDetails } = req.body;

    // Validate ObjectId early to avoid CastError
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if product is available
    if (!product.isActive || product.stock <= 0) {
      return res.status(400).json({ success: false, error: 'Product is not available' });
    }

    // Handle different payment methods
    let orderData = {
      userId,
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        currency: product.currency,
        isNFT: product.isNFT
      }],
      totalAmount: product.price,
      currency: product.currency,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      status: 'pending'
    };

    // Special handling for Flutterwave
    if (paymentMethod === 'flutterwave') {
      // Check if we have the required Flutterwave details
      if (!paymentDetails || (!paymentDetails.tx_ref && !paymentDetails.flw_tx_id)) {
        // If we don't have the details, we need to initialize the payment
        // For now, we'll create a placeholder and expect the client to provide details later
        orderData.tx_ref = `talkcart-product-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        orderData.status = 'initialized';
      } else {
        // We have the payment details, mark as completed
        orderData.tx_ref = paymentDetails.tx_ref;
        orderData.status = 'completed';
      }
    } 
    // Special handling for Stripe
    else if (paymentMethod === 'stripe') {
      if (paymentDetails && paymentDetails.paymentIntentId) {
        orderData.paymentDetails.paymentIntentId = paymentDetails.paymentIntentId;
        orderData.status = 'completed';
      }
    }
    // Special handling for Crypto
    else if (paymentMethod === 'crypto') {
      orderData.status = 'completed';
    }
    // Special handling for NFT
    else if (paymentMethod === 'nft') {
      orderData.status = 'completed';
    }

    // Create the order
    const order = new Order(orderData);
    await order.save();

    // Update product stock
    if (!product.isNFT) {
      product.stock -= 1;
      product.sales += 1;
      await product.save();
    }

    // Populate the product vendor data
    await order.populate({
      path: 'items.productId',
      select: 'name images category vendorId'
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        product,
        payment: {
          status: order.status
        }
      },
      message: 'Purchase successful'
    });

  } catch (error) {
    console.error('Buy product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process purchase',
      message: error.message
    });
  }
});

// @route   POST /api/marketplace/products/:id/buy
// @desc    Purchase a product. For NFTs, returns on-chain transfer instructions. For non-NFTs, requires real payment proof (Stripe or crypto).
// @access  Private (strict)
router.post('/products/:id/buy', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.userId;

    // Validate ObjectId early to avoid CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const product = await Product.findById(id).populate('vendorId', 'username displayName avatar isVerified walletAddress role');

    // Allow purchasing products from any vendor as long as the product is active
    if (!product || !product.vendorId || !product.isActive) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    if (!product || product.isActive === false) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Prevent vendor from buying own product
    if (product.vendorId && product.vendorId._id.toString() === buyerId) {
      return res.status(400).json({ success: false, error: 'Cannot buy your own product' });
    }

    // Basic stock handling
    if (typeof product.stock === 'number' && product.stock <= 0) {
      return res.status(400).json({ success: false, error: 'Out of stock' });
    }

    const { User } = require('../models');
    const buyer = await User.findById(buyerId).lean();

    // Only require wallet addresses for NFT purchases
    if (product.isNFT) {
      if (!buyer?.walletAddress) {
        return res.status(400).json({ success: false, error: 'Buyer wallet not connected. Please connect your wallet to purchase NFTs.' });
      }
      if (!product.vendorId?.walletAddress) {
        return res.status(400).json({ success: false, error: 'Vendor wallet not connected' });
      }
    }

    let paymentResult = { status: 'success', txId: `tx_${Date.now()}`, networkId: 1 };

    if (product.isNFT) {
      // NFT transfer path: require contractAddress + tokenId, transfer from vendor to buyer
      const { contractAddress, tokenId, networkId = 1 } = product;
      if (!contractAddress || typeof tokenId === 'undefined') {
        return res.status(400).json({ success: false, error: 'NFT details missing (contractAddress/tokenId)' });
      }

      try {
        const web3Service = require('../services/web3Service');

        // Try to verify the vendor currently owns the token
        const owns = await web3Service.verifyNFTOwnership(product.vendorId.walletAddress, tokenId, contractAddress, networkId);
        if (!owns) {
          console.warn(`NFT ownership verification failed for product ${id}. Proceeding with purchase.`);
        }
      } catch (web3Error) {
        // If web3 service is not available, continue with purchase
        console.warn(`Web3 verification unavailable for product ${id}:`, web3Error.message);
      }

      // Note: For a real transfer, vendor must sign the tx in client. Here we only validate and return instructions.
      paymentResult = {
        status: 'requires_client_signature',
        instructions: {
          type: 'erc721_transfer',
          contractAddress,
          tokenId,
          from: product.vendorId.walletAddress,
          to: buyer.walletAddress,
          networkId,
        },
        transactionId: `nft_tx_${Date.now()}`,
        amount: product.price,
        currency: product.currency
      };
    } else {
      // Non-NFT: require real payment proof
      const { paymentMethod, paymentDetails } = req.body || {};

      if (paymentMethod === 'stripe') {
        if (!stripe) {
          return res.status(400).json({ success: false, error: 'Stripe not configured' });
        }
        const paymentIntentId = paymentDetails?.paymentIntentId;
        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
          return res.status(400).json({ success: false, error: 'Missing Stripe paymentIntentId' });
        }
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!intent || intent.status !== 'succeeded') {
          return res.status(400).json({ success: false, error: 'Payment not completed' });
        }
        paymentResult = {
          status: 'completed',
          provider: 'stripe',
          transactionId: intent.id,
          amount: (intent.amount || 0) / 100,
          currency: String(intent.currency || '').toUpperCase() || product.currency
        };
      } else if (paymentMethod === 'flutterwave') {
        const tx_ref = paymentDetails?.tx_ref;
        const flw_tx_id = paymentDetails?.flw_tx_id || paymentDetails?.transaction_id || paymentDetails?.id;
        if (!tx_ref || !flw_tx_id) {
          return res.status(400).json({ success: false, error: 'Missing Flutterwave payment details (tx_ref/flw_tx_id)' });
        }
        // Verify with Flutterwave API
        const verify = await verifyFlutterwaveTransaction(flw_tx_id, tx_ref, product.price, product.currency);
        if (!verify.ok) {
          return res.status(400).json({ success: false, error: 'Payment not completed' });
        }
        paymentResult = {
          status: 'completed',
          provider: 'flutterwave',
          transactionId: String(verify.data.id || flw_tx_id),
          amount: Number(verify.data.amount || product.price),
          currency: String(verify.data.currency || product.currency).toUpperCase(),
          tx_ref,
          flw_tx_id: String(verify.data.id || flw_tx_id)
        };
      } else if (paymentMethod === 'crypto') {
        // Basic crypto proof check (txHash + walletAddress), optionally extend with chain verification
        const txHash = paymentDetails?.txHash;
        const from = paymentDetails?.from;
        if (!txHash || !from) {
          return res.status(400).json({ success: false, error: 'Missing crypto payment details (txHash/from)' });
        }
        // Basic format validation for Ethereum tx hash and address
        if (!/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
          return res.status(400).json({ success: false, error: 'Invalid txHash format' });
        }
        try {
          const { ethers } = require('ethers');
          if (!ethers.isAddress(from)) {
            return res.status(400).json({ success: false, error: 'Invalid sender address' });
          }
        } catch { }
        paymentResult = {
          status: 'completed',
          provider: 'crypto',
          transactionId: txHash,
          from,
          amount: product.price,
          currency: product.currency
        };
      } else {
        return res.status(400).json({ success: false, error: 'Unsupported or missing paymentMethod' });
      }
    }

    // Update counters atomically after payment proof is validated
    // For NFTs, do not increment sales until off-chain confirmation is implemented.
    const update = { $inc: {} };
    if (!product.isNFT) {
      update.$inc.sales = 1;
      if (typeof product.stock === 'number') {
        update.$inc.stock = -1;
      }
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true })
      .populate('vendorId', 'username displayName avatar isVerified walletAddress')
      .lean();

    const responseData = {
      ...updated,
      id: updated._id,
      vendor: {
        id: updated.vendorId._id,
        username: updated.vendorId.username,
        displayName: updated.vendorId.displayName,
        avatar: updated.vendorId.avatar,
        isVerified: updated.vendorId.isVerified,
        walletAddress: updated.vendorId.walletAddress
      }
    };

    // Broadcast sale event via socket if available
    if (req.app.get('socketService')) {
      req.app.get('socketService').broadcastProductSale(updated, {
        userId: req.user.userId,
        username: req.user.username
      });
    }

    // Create order record
    const orderData = {
      userId: buyerId,
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        currency: product.currency,
        isNFT: product.isNFT,
        vendorId: product.vendorId._id // Add vendorId directly to item for easier processing
      }],
      totalAmount: product.price,
      currency: product.currency,
      paymentMethod: req.body.paymentMethod || 'unknown',
      paymentDetails: req.body.paymentDetails || {},
      status: 'completed',
      completedAt: new Date()
    };

    // Add payment transaction details if available
    if (paymentResult.transactionId) {
      orderData.tx_ref = paymentResult.transactionId;
    }

    const order = new Order(orderData);
    await order.save();

    // For non-NFT products, calculate and prepare vendor payout
    if (!product.isNFT) {
      try {
        // Calculate vendor payout after commission
        const payoutCalculation = await vendorPayoutService.calculatePayout(
          product.price, 
          product.currency
        );
        
        // Store payout information in order metadata for later processing
        if (!order.metadata) order.metadata = {};
        order.metadata.vendorPayout = {
          vendorId: product.vendorId._id,
          vendorAmount: payoutCalculation.vendorAmount,
          commissionAmount: payoutCalculation.commissionAmount,
          commissionRate: payoutCalculation.commissionRate,
          currency: payoutCalculation.currency,
          status: 'pending'
        };
        await order.save();
      } catch (payoutError) {
        console.error('Error calculating vendor payout:', payoutError);
        // Continue with the purchase even if payout calculation fails
      }
    }

    return res.json({ 
      success: true, 
      data: { 
        product: responseData, 
        payment: paymentResult,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        }
      } 
    });
  } catch (error) {
    console.error('Buy product error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process purchase', message: error.message });
  }
});



// @route   GET /api/marketplace/stats
// @desc    Get marketplace statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const [totalProducts, activeProducts, nftCount, featuredCount] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isNFT: true, isActive: true }),
      Product.countDocuments({ featured: true, isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        nftCount,
        featuredCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace stats',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/products/random
// @desc    Get random products for trending display
// @access  Public
router.get('/products/random', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get random products using MongoDB aggregation
    const randomProducts = await Product.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: parseInt(limit) } },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          id: '$_id',
          name: 1,
          description: 1,
          price: 1,
          currency: 1,
          images: 1,
          category: 1,
          isNFT: 1,
          featured: 1,
          tags: 1,
          stock: 1,
          rating: 1,
          reviewCount: 1,
          sales: 1,
          views: 1,
          createdAt: 1,
          vendor: {
            id: '$vendor._id',
            username: '$vendor.username',
            displayName: '$vendor.displayName',
            avatar: '$vendor.avatar',
            isVerified: '$vendor.isVerified',
            walletAddress: '$vendor.walletAddress'
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        products: randomProducts
      }
    });
  } catch (error) {
    console.error('Get random products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get random products',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/products/trending
// @desc    Get trending products based on views, sales, and ratings
// @access  Public
router.get('/products/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get trending products based on engagement metrics
    const trendingProducts = await Product.find({ isActive: true })
      .populate('vendorId', 'username displayName avatar isVerified walletAddress')
      .sort({ 
        views: -1, 
        sales: -1, 
        rating: -1, 
        createdAt: -1 
      })
      .limit(parseInt(limit))
      .lean();

    // Transform data for frontend compatibility
    const transformedProducts = trendingProducts.map(product => ({
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress
      }
    }));

    res.json({
      success: true,
      data: {
        products: transformedProducts
      }
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending products',
      message: error.message
    });
  }
});

// @route   GET /api/marketplace/recommendations/:userId
// @desc    Get product recommendations for user
// @access  Private
router.get('/recommendations/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  // Get user's order history to understand preferences
  const userOrders = await Order.find({ userId })
    .populate('items.productId', 'category tags vendorId')
    .limit(50)
    .sort({ createdAt: -1 });

  // Extract preferred categories and vendors
  const categoryPreferences = {};
  const vendorPreferences = {};
  const tagPreferences = {};

  userOrders.forEach(order => {
    order.items.forEach(item => {
      if (item.productId) {
        // Count category preferences
        const category = item.productId.category;
        categoryPreferences[category] = (categoryPreferences[category] || 0) + item.quantity;

        // Count vendor preferences
        const vendorId = item.productId.vendorId;
        vendorPreferences[vendorId] = (vendorPreferences[vendorId] || 0) + item.quantity;

        // Count tag preferences
        item.productId.tags?.forEach(tag => {
          tagPreferences[tag] = (tagPreferences[tag] || 0) + 1;
        });
      }
    });
  });

  // Get top categories and vendors
  const topCategories = Object.entries(categoryPreferences)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  const topVendors = Object.entries(vendorPreferences)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([vendorId]) => vendorId);

  const topTags = Object.entries(tagPreferences)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);

  // Build recommendation query
  let recommendationQuery = {
    isActive: true,
    $or: []
  };

  // Add category-based recommendations
  if (topCategories.length > 0) {
    recommendationQuery.$or.push({ category: { $in: topCategories } });
  }

  // Add vendor-based recommendations
  if (topVendors.length > 0) {
    recommendationQuery.$or.push({ vendorId: { $in: topVendors } });
  }

  // Add tag-based recommendations
  if (topTags.length > 0) {
    recommendationQuery.$or.push({ tags: { $in: topTags } });
  }

  // Fallback to trending products if no preferences
  if (recommendationQuery.$or.length === 0) {
    recommendationQuery = {
      isActive: true,
      featured: true
    };
  }

  const recommendations = await Product.find(recommendationQuery)
    .populate('vendorId', 'username displayName avatar')
    .sort({ sales: -1, rating: -1, createdAt: -1 })
    .limit(parseInt(limit));

  sendSuccess(res, {
    recommendations,
    preferences: {
      categories: topCategories,
      vendors: topVendors.length,
      tags: topTags.slice(0, 5)
    }
  }, 'Recommendations generated successfully');
}));

// @route   GET /api/marketplace/wishlist
// @desc    Get user's wishlist
// @access  Private
router.get('/wishlist', authenticateTokenStrict, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page = 1, limit = 20 } = req.query;

  const user = await User.findById(userId).populate({
    path: 'wishlist',
    populate: {
      path: 'vendorId',
      select: 'username displayName avatar'
    },
    options: {
      sort: { createdAt: -1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit)
    }
  });

  const total = user.wishlist?.length || 0;

  sendSuccess(res, {
    wishlist: user.wishlist || [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// @route   POST /api/marketplace/wishlist/:productId
// @desc    Add product to wishlist
// @access  Private
router.post('/wishlist/:productId', authenticateTokenStrict, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendError(res, 'Invalid product ID', 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  const user = await User.findById(userId);
  
  // Initialize wishlist if it doesn't exist
  if (!user.wishlist) {
    user.wishlist = [];
  }

  // Check if already in wishlist
  if (user.wishlist.includes(productId)) {
    return sendError(res, 'Product already in wishlist', 409);
  }

  user.wishlist.push(productId);
  await user.save();

  sendSuccess(res, { productId }, 'Product added to wishlist');
}));

// @route   DELETE /api/marketplace/wishlist/:productId
// @desc    Remove product from wishlist
// @access  Private
router.delete('/wishlist/:productId', authenticateTokenStrict, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendError(res, 'Invalid product ID', 400);
  }

  const user = await User.findById(userId);
  
  if (!user.wishlist || !user.wishlist.includes(productId)) {
    return sendError(res, 'Product not in wishlist', 404);
  }

  user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
  await user.save();

  sendSuccess(res, { productId }, 'Product removed from wishlist');
}));

// @route   GET /api/marketplace/recently-viewed
// @desc    Get recently viewed products
// @access  Private
router.get('/recently-viewed', authenticateTokenStrict, asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { limit = 10 } = req.query;

  const user = await User.findById(userId).populate({
    path: 'recentlyViewed',
    populate: {
      path: 'vendorId',
      select: 'username displayName avatar'
    },
    options: {
      limit: parseInt(limit)
    }
  });

  sendSuccess(res, {
    recentlyViewed: user.recentlyViewed || []
  });
}));

// @route   POST /api/marketplace/reviews/:productId
// @desc    Add product review
// @access  Private
router.post('/reviews/:productId', authenticateTokenStrict, validate('createReview'), asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  const { rating, comment, title } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return sendError(res, 'Invalid product ID', 400);
  }

  const product = await Product.findById(productId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  // Check if user has purchased this product
  const hasPurchased = await Order.findOne({
    userId,
    'items.productId': productId,
    status: 'completed'
  });

  if (!hasPurchased) {
    return sendError(res, 'You can only review products you have purchased', 403);
  }

  // Check if user has already reviewed this product
  const existingReview = await ProductReview.findOne({
    userId,
    productId
  });

  if (existingReview) {
    return sendError(res, 'You have already reviewed this product', 409);
  }

  const review = new ProductReview({
    userId,
    productId,
    rating,
    comment,
    title
  });

  await review.save();

  // Update product rating
  const reviews = await ProductReview.find({ productId });
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  product.rating = averageRating;
  product.reviewCount = reviews.length;
  await product.save();

  await review.populate('userId', 'username displayName avatar');

  sendSuccess(res, review, 'Review added successfully', 201);
}));



// @route   GET /api/marketplace/vendors/:vendorId/products
// @desc    Get products by vendor
// @access  Public
router.get('/vendors/:vendorId/products', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, error: 'Invalid vendor ID' });
    }

    // Check if vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    // Build query for vendor's products
    const query = { 
      vendorId: vendorId,
      isActive: true 
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get vendor's products
    const products = await Product.find(query)
      .populate('vendorId', 'username displayName avatar isVerified walletAddress')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Product.countDocuments(query);

    // Transform data for compatibility
    const transformedProducts = products.map(product => ({
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress
      },
      // Include new fields for enhanced marketplace experience
      discount: product.discount || 0,
      freeShipping: product.freeShipping || false,
      fastDelivery: product.fastDelivery || false,
      prime: product.prime || false,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock > 0 || product.isNFT)
    }));

    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor products',
      message: error.message,
    });
  }
});

// @route   GET /api/marketplace/vendors/:vendorId
// @desc    Get vendor information
// @access  Public
router.get('/vendors/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Validate vendorId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, error: 'Invalid vendor ID' });
    }

    // Get vendor information
    const vendor = await User.findById(vendorId, 'username displayName avatar isVerified walletAddress bio location website socialLinks followerCount followingCount createdAt');
    
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    // Get vendor's product count
    const productCount = await Product.countDocuments({ 
      vendorId: vendorId,
      isActive: true 
    });

    const vendorData = {
      id: vendor._id,
      username: vendor.username,
      displayName: vendor.displayName,
      avatar: vendor.avatar,
      isVerified: vendor.isVerified,
      walletAddress: vendor.walletAddress,
      bio: vendor.bio,
      location: vendor.location,
      website: vendor.website,
      socialLinks: vendor.socialLinks,
      followerCount: vendor.followerCount,
      followingCount: vendor.followingCount,
      productCount,
      createdAt: vendor.createdAt
    };

    res.json({
      success: true,
      data: { vendor: vendorData }
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendor information',
      message: error.message,
    });
  }
});

// @route   GET /api/marketplace/vendors
// @desc    Get all vendors
// @access  Public
router.get('/vendors', async (req, res) => {
  try {
    const { limit = 20, page = 1, search } = req.query;

    // Build query for vendors who have active products
    let vendorQuery = {};
    
    // Find vendors with active products
    const productVendors = await Product.distinct('vendorId', { isActive: true });
    
    if (productVendors.length === 0) {
      return res.json({
        success: true,
        data: {
          vendors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    }
    
    vendorQuery._id = { $in: productVendors };
    
    // Add search filter if provided
    if (search) {
      vendorQuery.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get vendors
    const vendors = await User.find(vendorQuery, 'username displayName avatar isVerified walletAddress followerCount followingCount')
      .sort({ followerCount: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await User.countDocuments(vendorQuery);

    // Add product count for each vendor
    const vendorsWithCounts = await Promise.all(vendors.map(async (vendor) => {
      const productCount = await Product.countDocuments({ 
        vendorId: vendor._id,
        isActive: true 
      });
      
      return {
        ...vendor,
        id: vendor._id,
        productCount
      };
    }));

    res.json({
      success: true,
      data: {
        vendors: vendorsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vendors',
      message: error.message,
    });
  }
});

// @route   GET /api/marketplace/my/products
// @desc    Get current user's products
// @access  Private
router.get('/my/products', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, page = 1 } = req.query;

    // Build query for user's products
    const query = { vendorId: userId };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's products
    const products = await Product.find(query)
      .populate('vendorId', 'username displayName avatar isVerified walletAddress')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Product.countDocuments(query);

    // Transform data for compatibility
    const transformedProducts = products.map(product => ({
      ...product,
      id: product._id,
      vendor: {
        id: product.vendorId._id,
        username: product.vendorId.username,
        displayName: product.vendorId.displayName,
        avatar: product.vendorId.avatar,
        isVerified: product.vendorId.isVerified,
        walletAddress: product.vendorId.walletAddress
      },
      // Include new fields for enhanced marketplace experience
      discount: product.discount || 0,
      freeShipping: product.freeShipping || false,
      fastDelivery: product.fastDelivery || false,
      prime: product.prime || false,
      inStock: product.inStock !== undefined ? product.inStock : (product.stock > 0 || product.isNFT)
    }));

    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get your products',
      message: error.message,
    });
  }
});

// @route   GET /api/marketplace/vendors/:vendorId/payment-preferences
// @desc    Get vendor payment preferences (public endpoint)
// @access  Public
router.get('/vendors/:vendorId/payment-preferences', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vendor ID'
      });
    }

    const preferences = await VendorPaymentPreferences.findOne({ vendorId });
    
    if (!preferences) {
      return res.json({
        success: true,
        data: {
          mobileMoney: { enabled: false },
          bankAccount: { enabled: false },
          paypal: { enabled: false },
          cryptoWallet: { enabled: false },
          defaultPaymentMethod: 'mobileMoney'
        }
      });
    }

    // Only return enabled payment methods for public access
    const publicPreferences = {
      mobileMoney: {
        enabled: preferences.mobileMoney.enabled,
        ...(preferences.mobileMoney.enabled && {
          provider: preferences.mobileMoney.provider,
          country: preferences.mobileMoney.country
        })
      },
      bankAccount: {
        enabled: preferences.bankAccount.enabled,
        ...(preferences.bankAccount.enabled && {
          bankName: preferences.bankAccount.bankName,
          country: preferences.bankAccount.country
        })
      },
      paypal: {
        enabled: preferences.paypal.enabled
      },
      cryptoWallet: {
        enabled: preferences.cryptoWallet.enabled,
        ...(preferences.cryptoWallet.enabled && {
          network: preferences.cryptoWallet.network
        })
      },
      defaultPaymentMethod: preferences.defaultPaymentMethod
    };

    res.json({
      success: true,
      data: publicPreferences
    });
  } catch (error) {
    console.error('Get vendor payment preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment preferences'
    });
  }
});

// @route   GET /api/marketplace/vendors/me/payment-preferences
// @desc    Get my payment preferences (vendor only)
// @access  Private - Vendor only
router.get('/vendors/me/payment-preferences', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    console.log('=== GET /vendors/me/payment-preferences ===');
    console.log('Vendor ID from token:', vendorId);
    console.log('Full user object:', req.user);
    
    if (!vendorId) {
      console.log('ERROR: No vendorId in request');
      return res.status(400).json({
        success: false,
        error: 'Vendor ID is required'
      });
    }
    
    const preferences = await VendorPaymentPreferences.findOne({ vendorId });
    
    console.log('Preferences query result:', preferences ? 'FOUND' : 'NOT FOUND');
    
    if (!preferences) {
      console.log('No payment preferences found, returning defaults for vendor:', vendorId);
      return res.json({
        success: true,
        data: {
          mobileMoney: { enabled: false },
          bankAccount: { enabled: false },
          paypal: { enabled: false },
          cryptoWallet: { enabled: false },
          defaultPaymentMethod: 'mobileMoney',
          withdrawalPreferences: {
            minimumAmount: 10,
            frequency: 'weekly'
          }
        }
      });
    }

    console.log('Returning payment preferences for vendor:', vendorId);
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get my payment preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment preferences',
      message: error.message
    });
  }
});

// @route   PUT /api/marketplace/vendors/me/payment-preferences
// @desc    Update my payment preferences (vendor only)
// @access  Private - Vendor only
router.put('/vendors/me/payment-preferences', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const updateData = req.body;

    // Validate that at least one payment method is enabled
    const hasEnabledMethod = 
      updateData.mobileMoney?.enabled || 
      updateData.bankAccount?.enabled || 
      updateData.paypal?.enabled || 
      updateData.cryptoWallet?.enabled;

    if (!hasEnabledMethod) {
      return res.status(400).json({
        success: false,
        error: 'At least one payment method must be enabled'
      });
    }

    // Validate default payment method is enabled
    const defaultMethod = updateData.defaultPaymentMethod || 'mobileMoney';
    const isDefaultEnabled = updateData[defaultMethod]?.enabled;
    
    if (!isDefaultEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Default payment method must be enabled'
      });
    }

    // Additional validation for each payment method
    if (updateData.mobileMoney?.enabled) {
      if (!updateData.mobileMoney.provider) {
        return res.status(400).json({
          success: false,
          error: 'Mobile money provider is required'
        });
      }
      if (!updateData.mobileMoney.phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Mobile money phone number is required'
        });
      }
      if (!updateData.mobileMoney.country) {
        return res.status(400).json({
          success: false,
          error: 'Mobile money country is required'
        });
      }
    }

    if (updateData.bankAccount?.enabled) {
      if (!updateData.bankAccount.accountHolderName) {
        return res.status(400).json({
          success: false,
          error: 'Bank account holder name is required'
        });
      }
      if (!updateData.bankAccount.accountNumber) {
        return res.status(400).json({
          success: false,
          error: 'Bank account number is required'
        });
      }
      if (!updateData.bankAccount.bankName) {
        return res.status(400).json({
          success: false,
          error: 'Bank name is required'
        });
      }
      if (!updateData.bankAccount.country) {
        return res.status(400).json({
          success: false,
          error: 'Bank country is required'
        });
      }
    }

    if (updateData.paypal?.enabled) {
      if (!updateData.paypal.email) {
        return res.status(400).json({
          success: false,
          error: 'PayPal email is required'
        });
      }
    }

    if (updateData.cryptoWallet?.enabled) {
      if (!updateData.cryptoWallet.walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Crypto wallet address is required'
        });
      }
      if (!updateData.cryptoWallet.network) {
        return res.status(400).json({
          success: false,
          error: 'Crypto network is required'
        });
      }
    }

    // Validate withdrawal preferences
    if (updateData.withdrawalPreferences) {
      const { minimumAmount, frequency } = updateData.withdrawalPreferences;
      if (minimumAmount !== undefined && (typeof minimumAmount !== 'number' || minimumAmount < 1)) {
        return res.status(400).json({
          success: false,
          error: 'Minimum withdrawal amount must be a number greater than 0'
        });
      }
      if (frequency && !['daily', 'weekly', 'monthly', 'manual'].includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid withdrawal frequency'
        });
      }
    }

    // Create or update preferences
    const preferences = await VendorPaymentPreferences.findOneAndUpdate(
      { vendorId },
      { 
        vendorId,
        ...updateData
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true
      }
    );

    if (!preferences) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment preferences'
      });
    }

    res.json({
      success: true,
      data: preferences,
      message: 'Payment preferences updated successfully'
    });
  } catch (error) {
    console.error('Update payment preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment preferences'
    });
  }
});

// @route   GET /api/marketplace/vendors/me/store
// @desc    Get my vendor store information
// @access  Private - Vendor only
router.get('/vendors/me/store', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    const store = await VendorStore.findOne({ vendorId });
    
    if (!store) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: store
    });
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store information'
    });
  }
});

// @route   POST /api/marketplace/vendors/me/store
// @desc    Create vendor store registration
// @access  Private - Authenticated users only
router.post('/vendors/me/store', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const storeData = req.body;
    
    // Check if store already exists
    const existingStore = await VendorStore.findOne({ vendorId });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        error: 'Vendor store already exists'
      });
    }
    
    // Validate required fields
    if (!storeData.storeName) {
      return res.status(400).json({
        success: false,
        error: 'Store name is required'
      });
    }
    
    // Create store
    const newStore = new VendorStore({
      vendorId,
      ...storeData
    });
    
    await newStore.save();
    
    // Update user role to vendor
    const user = await User.findById(vendorId);
    if (user && user.role !== 'vendor') {
      user.role = 'vendor';
      await user.save();
    }
    
    res.status(201).json({
      success: true,
      data: newStore,
      message: 'Vendor store registered successfully'
    });
  } catch (error) {
    console.error('Create store error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to register vendor store'
    });
  }
});

// @route   PUT /api/marketplace/vendors/me/store
// @desc    Update my vendor store information
// @access  Private - Vendor only
router.put('/vendors/me/store', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const updateData = req.body;
    
    // Find and update store
    const store = await VendorStore.findOneAndUpdate(
      { vendorId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Vendor store not found'
      });
    }
    
    res.json({
      success: true,
      data: store,
      message: 'Vendor store updated successfully'
    });
  } catch (error) {
    console.error('Update store error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update vendor store'
    });
  }
});

// @route   DELETE /api/marketplace/vendors/me/store
// @desc    Delete my vendor store
// @access  Private - Vendor only
router.delete('/vendors/me/store', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    const store = await VendorStore.findOne({ vendorId });

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Vendor store not found'
      });
    }

    await VendorStore.findOneAndDelete({ vendorId });

    // Update user role back to 'user'
    const user = await User.findById(vendorId);
    if (user && user.role === 'vendor') {
      user.role = 'user';
      await user.save();
    }

    res.json({
      success: true,
      message: 'Vendor store deleted successfully'
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vendor store'
    });
  }
});

// @route   GET /api/marketplace/vendors/:vendorId/store
// @desc    Get vendor store information (public endpoint)
// @access  Public
router.get('/vendors/:vendorId/store', async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vendor ID'
      });
    }
    
    const store = await VendorStore.findOne({ vendorId, isActive: true });
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Vendor store not found'
      });
    }
    
    // Get vendor information
    const vendor = await User.findById(vendorId, 'username displayName avatar isVerified walletAddress bio followerCount followingCount createdAt');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    const storeData = {
      id: store._id,
      storeName: store.storeName,
      description: store.description,
      logo: store.logo,
      coverImage: store.coverImage,
      location: store.location,
      website: store.website,
      socialLinks: store.socialLinks,
      storePolicy: store.storePolicy,
      returnPolicy: store.returnPolicy,
      shippingPolicy: store.shippingPolicy,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      vendor: {
        id: vendor._id,
        username: vendor.username,
        displayName: vendor.displayName,
        avatar: vendor.avatar,
        isVerified: vendor.isVerified,
        bio: vendor.bio,
        followerCount: vendor.followerCount,
        followingCount: vendor.followingCount,
        createdAt: vendor.createdAt
      }
    };

    res.json({
      success: true,
      data: storeData
    });
  } catch (error) {
    console.error('Get vendor store error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store information'
    });
  }
});

// @route   GET /api/marketplace/vendors/me/store
// @desc    Get my vendor store information (private endpoint for store owner only)
// @access  Private - Vendor only
router.get('/vendors/me/store', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    // Check if the authenticated user is a vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Vendor access required.'
      });
    }
    
    const store = await VendorStore.findOne({ vendorId });
    
    if (!store) {
      return res.json({
        success: true,
        data: null
      });
    }

    // Return full store information for the owner
    const storeData = {
      id: store._id,
      storeName: store.storeName,
      description: store.description,
      logo: store.logo,
      coverImage: store.coverImage,
      location: store.location,
      website: store.website,
      contactEmail: store.contactEmail,
      contactPhone: store.contactPhone,
      socialLinks: store.socialLinks,
      storePolicy: store.storePolicy,
      returnPolicy: store.returnPolicy,
      shippingPolicy: store.shippingPolicy,
      isActive: store.isActive,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      vendor: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        bio: user.bio,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
        walletAddress: user.walletAddress
      }
    };

    res.json({
      success: true,
      data: storeData
    });
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch store information'
    });
  }
});

// @route   GET /api/marketplace/vendors/me/payout-history
// @desc    Get my payout history
// @access  Private - Vendor only
router.get('/vendors/me/payout-history', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { limit = 50, status } = req.query;
    
    console.log('=== GET /vendors/me/payout-history ===');
    console.log('Vendor ID from token:', vendorId);
    console.log('Query parameters:', { limit, status });
    console.log('Full user object:', req.user);
    
    if (!vendorId) {
      console.log('ERROR: No vendorId in request');
      return res.status(400).json({
        success: false,
        error: 'Vendor ID is required'
      });
    }
    
    // Validate limit parameter
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      console.log('Invalid limit parameter:', limit);
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter. Must be between 1 and 100.'
      });
    }
    
    console.log('Fetching payout history for vendor:', vendorId, { limit: parsedLimit, status });
    
    const history = await vendorPayoutService.getVendorPayoutHistory(vendorId, {
      limit: parsedLimit,
      status
    });
    
    console.log('Payout history fetched successfully for vendor:', vendorId, { historyLength: history.length });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payout history',
      message: error.message
    });
  }
});

module.exports = router;

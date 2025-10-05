const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Product, User, Order, ProductReview } = require('../models');
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
// @desc    Upload product images (Admin only)
// @access  Private - Admin only
router.post('/products/upload-images', authenticateTokenStrict, upload.array('images', 5), async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can upload product images.'
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

    // Restrict to admin-posted products
    const adminIds = await User.find({ role: 'admin' }).distinct('_id');

    if (query.vendorId) {
      // If a vendorId is provided and it's not an admin, return empty set
      const isAdminVendor = adminIds.some(id => String(id) === String(query.vendorId));
      if (!isAdminVendor) {
        return res.json({
          success: true,
          data: {
            products: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0,
            },
          },
        });
      }
    } else {
      query.vendorId = { $in: adminIds };
    }

    // Get products from database (admin-only)
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
// @desc    Create a new product (Admin only)
// @access  Private (strict) - Admin only
router.post('/products', authenticateTokenStrict, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can create products.'
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

    // Restrict detail view to admin-posted products
    if (!product.vendorId || String(product.vendorId.role) !== 'admin') {
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
// @desc    Update product (Admin only)
// @access  Private (strict) - Admin only
router.put('/products/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can update products.'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if user owns the product (admin check already passed)
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
// @desc    Delete product (Admin only)
// @access  Private (strict) - Admin only
router.delete('/products/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can delete products.'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if user owns the product (admin check already passed)
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

    // Enforce admin-only vendor products can be purchased
    if (!product || !product.vendorId || String(product.vendorId.role) !== 'admin') {
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

    return res.json({ success: true, data: { product: responseData, payment: paymentResult } });
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



module.exports = router;

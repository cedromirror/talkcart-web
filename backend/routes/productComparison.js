const express = require('express');
const router = express.Router();
const { Product } = require('../models');
const { authenticateToken } = require('./auth');

// @route   POST /api/products/compare
// @desc    Compare multiple products by their IDs
// @access  Public
router.post('/compare', async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product IDs are required'
      });
    }

    if (productIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Cannot compare more than 10 products at once'
      });
    }

    // Fetch products by IDs
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    })
    .populate('vendorId', 'username displayName avatar isVerified')
    .select('name description price currency images category vendorId rating reviewCount sales views isNFT featured tags stock availability createdAt updatedAt');

    // Create a map for easy lookup
    const productMap = {};
    products.forEach(product => {
      productMap[product._id.toString()] = product;
    });

    // Maintain the order of requested IDs
    const orderedProducts = productIds
      .map(id => productMap[id])
      .filter(product => product !== undefined);

    // Extract comparison attributes
    const comparisonData = {
      products: orderedProducts,
      attributes: extractComparisonAttributes(orderedProducts),
      categories: [...new Set(orderedProducts.map(p => p.category))],
      priceRange: {
        min: Math.min(...orderedProducts.map(p => p.price)),
        max: Math.max(...orderedProducts.map(p => p.price))
      }
    };

    res.json({
      success: true,
      data: comparisonData
    });

  } catch (error) {
    console.error('Product comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare products',
      message: error.message
    });
  }
});

// Helper function to extract common attributes for comparison
function extractComparisonAttributes(products) {
  if (products.length === 0) return {};

  // Get all unique attributes across products
  const allAttributes = new Set();
  products.forEach(product => {
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach(tag => allAttributes.add(tag));
    }
  });

  // Create comparison matrix
  const attributes = {};
  
  // Basic attributes
  attributes.name = products.map(p => p.name);
  attributes.price = products.map(p => `${p.price} ${p.currency}`);
  attributes.category = products.map(p => p.category);
  attributes.rating = products.map(p => p.rating || 0);
  attributes.reviewCount = products.map(p => p.reviewCount || 0);
  attributes.sales = products.map(p => p.sales || 0);
  attributes.isNFT = products.map(p => p.isNFT || false);
  attributes.featured = products.map(p => p.featured || false);
  attributes.stock = products.map(p => p.stock || 0);
  
  // Add tags as boolean matrix
  const allTags = [...allAttributes];
  const tagMatrix = {};
  allTags.forEach(tag => {
    tagMatrix[tag] = products.map(p => 
      p.tags && Array.isArray(p.tags) ? p.tags.includes(tag) : false
    );
  });
  
  return {
    basic: {
      name: attributes.name,
      price: attributes.price,
      category: attributes.category,
      rating: attributes.rating,
      reviewCount: attributes.reviewCount,
      sales: attributes.sales,
      isNFT: attributes.isNFT,
      featured: attributes.featured,
      stock: attributes.stock
    },
    tags: tagMatrix,
    tagList: allTags
  };
}

module.exports = router;
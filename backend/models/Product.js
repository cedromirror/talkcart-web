const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['ETH', 'BTC', 'USD', 'USDC', 'USDT'],
    default: 'ETH'
  },
  images: [{
    public_id: String,
    secure_url: String,
    url: String
  }],
  category: {
    type: String,
    required: true,
    enum: ['Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 'Books', 'Collectibles', 'Education', 'Accessories', 'Food & Beverages', 'Fitness', 'Other']
  },
  tags: [String],
  stock: {
    type: Number,
    default: 1,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  isNFT: {
    type: Boolean,
    default: false
  },
  contractAddress: String, // For NFTs
  tokenId: String, // For NFTs
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  sales: {
    type: Number,
    default: 0,
    min: 0
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  availability: {
    type: String,
    enum: ['available', 'sold', 'unavailable', 'limited'],
    default: 'available'
  },
  // New fields for enhanced marketplace experience
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 99
  },
  freeShipping: {
    type: Boolean,
    default: false
  },
  fastDelivery: {
    type: Boolean,
    default: false
  },
  prime: {
    type: Boolean,
    default: false
  },
  inStock: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ vendorId: 1 });
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: true // Allow _id for cart items
});

const paymentRecordSchema = new mongoose.Schema({
  provider: { type: String, enum: ['stripe', 'flutterwave'], required: true },
  currency: { type: String, required: true }, // Uppercase e.g., USD, RWF, KES
  amountCents: { type: Number, required: true },
  // Stripe-specific fields
  paymentIntentId: { type: String },
  // Flutterwave-specific fields
  tx_ref: { type: String },
  flw_tx_id: { type: String },
  // Provider-specific status (e.g., Stripe: 'succeeded', Flutterwave: 'successful')
  status: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One cart per user
  },
  items: [cartItemSchema],
  payments: { type: [paymentRecordSchema], default: [] },
  totalAmount: {
    type: Number,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update totals before saving
cartSchema.pre('save', function (next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.lastUpdated = new Date();
  next();
});

// Instance method to add item to cart
cartSchema.methods.addItem = function (productId, product, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex >= 0) {
    // Update existing item (for NFTs, don't increase quantity)
    if (product.isNFT) {
      // NFTs are unique, don't increase quantity
      return false; // Item already exists
    } else {
      this.items[existingItemIndex].quantity += quantity;
    }
  } else {
    // Add new item
    this.items.push({
      productId,
      quantity: product.isNFT ? 1 : quantity, // NFTs always quantity 1
      price: product.price,
      currency: product.currency || 'USD'
    });
  }
  return true;
};

// Instance method to remove item from cart
cartSchema.methods.removeItem = function (itemId) {
  this.items = this.items.filter(item => item._id.toString() !== itemId.toString());
};

// Instance method to update item quantity
cartSchema.methods.updateItemQuantity = function (itemId, quantity) {
  const item = this.items.find(item => item._id.toString() === itemId.toString());
  if (item && quantity > 0) {
    item.quantity = quantity;
    return true;
  }
  return false;
};

// Instance method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.totalAmount = 0;
  this.totalItems = 0;
};

// Instance method to get cart summary
cartSchema.methods.getSummary = function () {
  const summary = {
    totalItems: this.totalItems,
    totalAmount: this.totalAmount,
    itemCount: this.items.length,
    hasNFTs: this.items.some(item => item.productId?.isNFT),
    currencies: [...new Set(this.items.map(item => item.currency))]
  };

  return summary;
};

module.exports = mongoose.model('Cart', cartSchema);
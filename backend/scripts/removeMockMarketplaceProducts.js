#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../models');

const MOCK_PRODUCT_NAMES = [
  'Blockchain Programming Book',
  'Wireless Gaming Headset',
  'Digital Art Collection #42',
  'Rare Collectible Card #007',
  'Exclusive Music Album NFT',
  'Crypto Streetwear T-Shirt',
  'Designer Hoodie',
  'Vintage Gaming Console',
];

async function removeMockProducts() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Missing MONGODB_URI in environment');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await Product.find({ name: { $in: MOCK_PRODUCT_NAMES } }).select('name _id').lean();
    if (existing.length === 0) {
      console.log('✅ No mock products found. Nothing to delete.');
      return;
    }

    console.log(`🧹 Found ${existing.length} mock products to delete:`);
    existing.forEach(p => console.log(` - ${p.name} (${p._id})`));

    const result = await Product.deleteMany({ name: { $in: MOCK_PRODUCT_NAMES } });
    console.log(`🗑️  Deleted ${result.deletedCount} mock product(s).`);
  } catch (err) {
    console.error('❌ Error removing mock products:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('👋 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  removeMockProducts().catch(console.error);
}

module.exports = removeMockProducts;
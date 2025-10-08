require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Load models
  const Product = require('./models/Product');
  const User = require('./models/User');
  
  // Find all products and populate vendor info
  const products = await Product.find({}).populate('vendorId', 'username');
  
  console.log('Total products found:', products.length);
  console.log('Products:');
  products.forEach(p => {
    console.log(`- ID: ${p._id}, Name: ${p.name}, Vendor: ${p.vendorId?.username}, Active: ${p.isActive}`);
  });
  
  mongoose.connection.close();
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
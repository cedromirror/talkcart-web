const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // Adjust path as needed
const { User, Product, Order } = require('../models');

describe('Chatbot Search API', () => {
  let vendorToken, customerToken, vendorId, customerId, productId;
  
  beforeAll(async () => {
    // Create test users
    const vendor = new User({
      username: 'testvendor',
      email: 'vendor@test.com',
      password: 'password123',
      role: 'vendor',
      displayName: 'Test Vendor'
    });
    
    const customer = new User({
      username: 'testcustomer',
      email: 'customer@test.com',
      password: 'password123',
      role: 'user',
      displayName: 'Test Customer'
    });
    
    await vendor.save();
    await customer.save();
    
    vendorId = vendor._id;
    customerId = customer._id;
    
    // Create test product
    const product = new Product({
      vendorId,
      name: 'Test Product',
      description: 'Test product for chatbot search',
      price: 100,
      currency: 'USD',
      isActive: true
    });
    
    await product.save();
    productId = product._id;
    
    // Create test order for customer
    const order = new Order({
      customerId,
      items: [{
        productId,
        quantity: 1,
        price: 100
      }],
      totalAmount: 100,
      status: 'completed'
    });
    
    await order.save();
    
    // Get auth tokens
    let res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'vendor@test.com',
        password: 'password123'
      });
    vendorToken = res.body.token;
    
    res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'customer@test.com',
        password: 'password123'
      });
    customerToken = res.body.token;
  });
  
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({
      email: { $in: ['vendor@test.com', 'customer@test.com'] }
    });
    
    await Product.deleteMany({
      vendorId
    });
    
    await Order.deleteMany({
      customerId
    });
    
    await mongoose.connection.close();
  });
  
  describe('GET /api/chatbot/search/vendors', () => {
    it('should search vendors successfully as a vendor', async () => {
      const res = await request(app)
        .get('/api/chatbot/search/vendors?search=test')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
        
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendors).toBeDefined();
      expect(Array.isArray(res.body.data.vendors)).toBe(true);
    });
    
    it('should return 403 when customer tries to search vendors', async () => {
      const res = await request(app)
        .get('/api/chatbot/search/vendors')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
        
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('GET /api/chatbot/search/customers', () => {
    it('should search customers successfully as a vendor', async () => {
      const res = await request(app)
        .get('/api/chatbot/search/customers?search=test')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
        
      expect(res.body.success).toBe(true);
      expect(res.body.data.customers).toBeDefined();
      expect(Array.isArray(res.body.data.customers)).toBe(true);
    });
    
    it('should return 403 when customer tries to search customers', async () => {
      const res = await request(app)
        .get('/api/chatbot/search/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
        
      expect(res.body.success).toBe(false);
    });
  });
});
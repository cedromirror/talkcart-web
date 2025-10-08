const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const { User, Product, ChatbotConversation, ChatbotMessage } = require('../models');

describe('Chatbot Message Actions API', () => {
  let vendorToken, customerToken, vendorId, customerId, conversationId, messageId;
  
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
      description: 'Test product for chatbot',
      price: 100,
      currency: 'USD',
      isActive: true
    });
    
    await product.save();
    
    // Create test conversation
    const conversation = new ChatbotConversation({
      customerId,
      vendorId,
      productId: product._id,
      productName: 'Test Product'
    });
    
    await conversation.save();
    conversationId = conversation._id;
    
    // Create test message
    const message = new ChatbotMessage({
      conversationId,
      senderId: customerId,
      content: 'Hello, I have a question about this product'
    });
    
    await message.save();
    messageId = message._id;
    
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
    
    await ChatbotConversation.deleteMany({
      _id: conversationId
    });
    
    await ChatbotMessage.deleteMany({
      conversationId
    });
    
    await mongoose.connection.close();
  });
  
  describe('PUT /api/chatbot/conversations/:id/messages/:messageId', () => {
    it('should edit a message successfully as the message sender', async () => {
      const res = await request(app)
        .put(`/api/chatbot/conversations/${conversationId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          content: 'Updated question about this product'
        })
        .expect(200);
        
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Updated question about this product');
      expect(res.body.data.message.isEdited).toBe(true);
    });
    
    it('should return 403 when trying to edit another user\'s message', async () => {
      const res = await request(app)
        .put(`/api/chatbot/conversations/${conversationId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          content: 'Unauthorized edit'
        })
        .expect(404); // Should return 404 as the message is not found for this user
        
      expect(res.body.success).toBe(false);
    });
    
    it('should return 400 when content is missing', async () => {
      const res = await request(app)
        .put(`/api/chatbot/conversations/${conversationId}/messages/${messageId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);
        
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Message content is required');
    });
  });
  
  describe('DELETE /api/chatbot/conversations/:id/messages/:messageId', () => {
    it('should delete a message successfully as the message sender', async () => {
      // Create a new message to delete
      const messageToDelete = new ChatbotMessage({
        conversationId,
        senderId: customerId,
        content: 'Message to delete'
      });
      
      await messageToDelete.save();
      
      const res = await request(app)
        .delete(`/api/chatbot/conversations/${conversationId}/messages/${messageToDelete._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
        
      expect(res.body.success).toBe(true);
      
      // Verify the message is soft deleted
      const deletedMessage = await ChatbotMessage.findById(messageToDelete._id);
      expect(deletedMessage.isDeleted).toBe(true);
      expect(deletedMessage.content).toBe('[Message deleted]');
    });
    
    it('should return 404 when trying to delete another user\'s message', async () => {
      // Create a new message as customer
      const messageToDelete = new ChatbotMessage({
        conversationId,
        senderId: customerId,
        content: 'Message to delete'
      });
      
      await messageToDelete.save();
      
      const res = await request(app)
        .delete(`/api/chatbot/conversations/${conversationId}/messages/${messageToDelete._id}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(404);
        
      expect(res.body.success).toBe(false);
      
      // Clean up
      await ChatbotMessage.findByIdAndDelete(messageToDelete._id);
    });
  });
  
  describe('POST /api/chatbot/conversations/:id/messages/:messageId/reply', () => {
    it('should reply to a message successfully as a conversation participant', async () => {
      const res = await request(app)
        .post(`/api/chatbot/conversations/${conversationId}/messages/${messageId}/reply`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          content: 'Thanks for your question!'
        })
        .expect(200);
        
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Thanks for your question!');
      expect(res.body.data.message.metadata.replyTo).toBe(messageId.toString());
    });
    
    it('should return 404 when replying to a non-existent message', async () => {
      const fakeMessageId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post(`/api/chatbot/conversations/${conversationId}/messages/${fakeMessageId}/reply`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          content: 'Reply to non-existent message'
        })
        .expect(404);
        
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Original message not found');
    });
    
    it('should return 400 when content is missing', async () => {
      const res = await request(app)
        .post(`/api/chatbot/conversations/${conversationId}/messages/${messageId}/reply`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({})
        .expect(400);
        
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Message content is required');
    });
  });
});
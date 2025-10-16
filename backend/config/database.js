const mongoose = require('mongoose');
const config = require('./config');

// Simple mock database for testing when MongoDB is not available
const createMockDatabase = () => {
  console.log('🔧 Using mock database for testing (MongoDB not available)');
  
  // Mock connection object
  const mockConnection = {
    readyState: 1,
    host: 'mock',
    port: 27017,
    name: 'talkcart_test',
    on: () => {},
    close: () => Promise.resolve()
  };
  
  // Mock data storage
  const mockData = {
    posts: [],
    users: [],
    comments: []
  };
  
  // Create a simple mock model factory
  const createMockModel = (name) => {
    const collection = mockData[name.toLowerCase()] || [];
    
    const MockModel = function(data) {
      Object.assign(this, data);
      this._id = this._id || Date.now().toString();
      this.id = this._id;
    };
    
    // Add methods to the constructor
    MockModel.find = (query = {}) => {
      let results = [...collection];
      
      // Simple query filtering
      if (query.author) {
        results = results.filter(item => item.author === query.author);
      }
      if (query.privacy) {
        results = results.filter(item => item.privacy === query.privacy);
      }
      if (query._id) {
        results = results.filter(item => item._id === query._id);
      }
      
      return {
        sort: (sortObj) => ({
          limit: (limit) => ({
            skip: (skip) => ({
              populate: (populate) => ({
                exec: () => Promise.resolve(results.slice(skip, skip + limit))
              }),
              exec: () => Promise.resolve(results.slice(skip, skip + limit))
            }),
            exec: () => Promise.resolve(results.slice(0, limit))
          }),
          exec: () => Promise.resolve(results)
        }),
        populate: (populate) => ({
          sort: (sortObj) => ({
            limit: (limit) => ({
              skip: (skip) => ({
                exec: () => Promise.resolve(results.slice(skip, skip + limit))
              }),
              exec: () => Promise.resolve(results.slice(0, limit))
            }),
            exec: () => Promise.resolve(results)
          }),
          exec: () => Promise.resolve(results)
        }),
        exec: () => Promise.resolve(results)
      };
    };
    
    MockModel.findById = (id) => {
      const result = collection.find(item => item._id === id);
      return {
        populate: (populate) => ({
          exec: () => Promise.resolve(result)
        }),
        exec: () => Promise.resolve(result)
      };
    };
    
    MockModel.findOne = (query) => {
      const result = collection.find(item => {
        return Object.keys(query).every(key => item[key] === query[key]);
      });
      return {
        populate: (populate) => ({
          exec: () => Promise.resolve(result)
        }),
        exec: () => Promise.resolve(result)
      };
    };
    
    MockModel.findByIdAndUpdate = (id, update, options) => {
      const index = collection.findIndex(item => item._id === id);
      if (index !== -1) {
        Object.assign(collection[index], update);
        return Promise.resolve(collection[index]);
      }
      return Promise.resolve(null);
    };
    
    MockModel.findByIdAndDelete = (id) => {
      const index = collection.findIndex(item => item._id === id);
      if (index !== -1) {
        const deleted = collection.splice(index, 1)[0];
        return Promise.resolve(deleted);
      }
      return Promise.resolve(null);
    };
    
    MockModel.countDocuments = (query = {}) => {
      let count = collection.length;
      if (query.author) {
        count = collection.filter(item => item.author === query.author).length;
      }
      return Promise.resolve(count);
    };
    
    MockModel.aggregate = () => ({
      exec: () => Promise.resolve([])
    });
    
    // Add instance methods
    MockModel.prototype.save = function() {
      if (!this._id) {
        this._id = Date.now().toString();
        this.id = this._id;
      }
      collection.push(this);
      return Promise.resolve(this);
    };
    
    MockModel.prototype.toObject = function() {
      return { ...this };
    };
    
    MockModel.prototype.toJSON = function() {
      return { ...this };
    };
    
    return MockModel;
  };
  
  // Override mongoose.model to return our mock models
  const originalModel = mongoose.model;
  mongoose.model = function(name, schema) {
    return createMockModel(name);
  };
  
  return mockConnection;
};

const connectDB = async () => {
  try {
    // Check if we're in test mode or MongoDB is not available
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true';
    
    if (isTestMode) {
      return createMockDatabase();
    }
    
    const conn = await mongoose.connect(config.database.uri, config.database.options);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected - attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        process.exit(0);
      } catch (err) {
        console.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.log('🔧 Falling back to mock database for testing...');
    return createMockDatabase();
  }
};

module.exports = connectDB;

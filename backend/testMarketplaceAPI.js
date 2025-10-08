const express = require('express');
const axios = require('axios');

// Create a simple Express app to test the marketplace API
const app = express();
app.use(express.json());

// Test the marketplace products endpoint
app.get('/test-marketplace', async (req, res) => {
  try {
    // Make a request to the marketplace products endpoint
    const response = await axios.get('http://localhost:5000/api/marketplace/products');
    console.log('Marketplace API Response:', response.data);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error calling marketplace API:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test-marketplace to test the marketplace API`);
});
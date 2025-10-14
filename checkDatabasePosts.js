const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });

// Import the Post model
const Post = require('./backend/models/Post');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function() {
  console.log('Connected to MongoDB');
  
  try {
    // Get all posts with media
    const posts = await Post.find({ 'media.0': { $exists: true } })
      .populate('author', 'username displayName')
      .limit(10)
      .lean();
    
    console.log(`Found ${posts.length} posts with media:`);
    
    posts.forEach((post, index) => {
      console.log(`\n--- Post ${index + 1} ---`);
      console.log(`ID: ${post._id}`);
      console.log(`Author: ${post.author?.displayName || post.author?.username}`);
      console.log(`Content: ${post.content?.substring(0, 100)}${post.content?.length > 100 ? '...' : ''}`);
      console.log(`Media count: ${post.media?.length || 0}`);
      
      if (post.media && post.media.length > 0) {
        post.media.forEach((media, mediaIndex) => {
          console.log(`  Media ${mediaIndex + 1}:`);
          console.log(`    Type: ${media.resource_type}`);
          console.log(`    Public ID: ${media.public_id}`);
          console.log(`    Secure URL: ${media.secure_url}`);
          console.log(`    URL: ${media.url}`);
          console.log(`    Format: ${media.format}`);
        });
      }
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fetching posts:', error);
    mongoose.connection.close();
  }
});
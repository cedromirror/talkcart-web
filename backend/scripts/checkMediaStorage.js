const mongoose = require('mongoose');
const { Post } = require('../models');

async function checkMediaStorage() {
  try {
    console.log('🔍 Checking Media Storage...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Find posts with media
    console.log('Finding posts with media...');
    const postsWithMedia = await Post.find({
      'media.0': { $exists: true }
    }).lean();

    console.log(`Found ${postsWithMedia.length} posts with media\n`);

    // Analyze media storage
    for (const [index, post] of postsWithMedia.entries()) {
      console.log(`--- Post ${index + 1} ---`);
      console.log(`ID: ${post._id}`);
      console.log(`Content: ${post.content.substring(0, 50)}${post.content.length > 50 ? '...' : ''}`);
      console.log(`Author: ${post.author}`);
      console.log(`Media items: ${post.media.length}`);
      
      // Check media details
      post.media.forEach((media, mediaIndex) => {
        console.log(`  Media ${mediaIndex + 1}:`);
        console.log(`    Resource type: ${media.resource_type}`);
        console.log(`    Secure URL: ${media.secure_url}`);
        console.log(`    URL: ${media.url}`);
        console.log(`    Public ID: ${media.public_id}`);
        console.log(`    Format: ${media.format}`);
        console.log(`    Bytes: ${media.bytes}`);
        console.log(`    Created at: ${media.created_at}`);
      });
      
      console.log(''); // Empty line for readability
    }

    // Check if files exist on disk
    console.log('Checking file existence on disk...');
    const fs = require('fs');
    const path = require('path');
    
    let filesFound = 0;
    let filesMissing = 0;
    
    for (const post of postsWithMedia) {
      for (const media of post.media) {
        // Extract filename from URL
        let filename = null;
        if (media.secure_url) {
          filename = media.secure_url.split('/').pop();
        } else if (media.url) {
          filename = media.url.split('/').pop();
        } else if (media.public_id) {
          filename = media.public_id.split('/').pop();
        }
        
        if (filename) {
          const filePath = path.join(__dirname, '..', 'uploads', 'talkcart', filename);
          if (fs.existsSync(filePath)) {
            console.log(`✅ File exists: ${filename}`);
            filesFound++;
          } else {
            console.log(`❌ File missing: ${filename}`);
            filesMissing++;
          }
        }
      }
    }
    
    console.log(`\n📁 File Status:`);
    console.log(`   Found: ${filesFound}`);
    console.log(`   Missing: ${filesMissing}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkMediaStorage();
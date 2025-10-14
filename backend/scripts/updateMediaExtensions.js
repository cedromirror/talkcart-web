const mongoose = require('mongoose');
const { Post } = require('../models');

async function updateMediaExtensions() {
  try {
    console.log('🔍 Updating Media URLs with Proper Extensions...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    // Find posts with media
    console.log('Finding posts with media...');
    const postsWithMedia = await Post.find({
      'media.0': { $exists: true }
    }).lean();

    console.log(`Found ${postsWithMedia.length} posts with media\n`);

    let updatedCount = 0;

    // Process each post
    for (const post of postsWithMedia) {
      console.log(`Processing post ${post._id}...`);
      
      let needsUpdate = false;
      const updatedMedia = post.media.map(media => {
        // Add extensions based on resource_type
        if (media.resource_type === 'video' && media.secure_url && !media.secure_url.endsWith('.mp4')) {
          const updatedUrl = media.secure_url + '.mp4';
          console.log(`  Adding .mp4 extension: ${media.secure_url} -> ${updatedUrl}`);
          needsUpdate = true;
          return {
            ...media,
            secure_url: updatedUrl,
            url: updatedUrl
          };
        }
        
        if (media.resource_type === 'image' && media.secure_url && !media.secure_url.endsWith('.jpg')) {
          const updatedUrl = media.secure_url + '.jpg';
          console.log(`  Adding .jpg extension: ${media.secure_url} -> ${updatedUrl}`);
          needsUpdate = true;
          return {
            ...media,
            secure_url: updatedUrl,
            url: updatedUrl
          };
        }
        
        return media;
      });
      
      if (needsUpdate) {
        // Update the post
        await Post.updateOne(
          { _id: post._id },
          { $set: { media: updatedMedia } }
        );
        console.log(`  ✅ Updated post ${post._id}\n`);
        updatedCount++;
      } else {
        console.log(`  ℹ️  No changes needed for post ${post._id}\n`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} posts with proper media extensions`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateMediaExtensions();
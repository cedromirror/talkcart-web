const mongoose = require('mongoose');

async function findCorruptedPosts() {
  try {
    console.log('🔍 Finding Corrupted Posts...\n');

    await mongoose.connect('mongodb://localhost:27017/talkcart');
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('posts');

    // Check for posts where createdAt is an array
    console.log('Checking for posts with array createdAt...');
    const arrayCreatedAt = await collection.find({ createdAt: { $type: 'array' } }).toArray();
    console.log(`Found ${arrayCreatedAt.length} posts with array createdAt`);

    // Check for posts where views is an array
    console.log('Checking for posts with array views...');
    const arrayViews = await collection.find({ views: { $type: 'array' } }).toArray();
    console.log(`Found ${arrayViews.length} posts with array views`);

    // Check for posts where author is an array
    console.log('Checking for posts with array author...');
    const arrayAuthor = await collection.find({ author: { $type: 'array' } }).toArray();
    console.log(`Found ${arrayAuthor.length} posts with array author`);

    // Check for posts where privacy is an array
    console.log('Checking for posts with array privacy...');
    const arrayPrivacy = await collection.find({ privacy: { $type: 'array' } }).toArray();
    console.log(`Found ${arrayPrivacy.length} posts with array privacy`);

    // Check for posts where isActive is an array
    console.log('Checking for posts with array isActive...');
    const arrayIsActive = await collection.find({ isActive: { $type: 'array' } }).toArray();
    console.log(`Found ${arrayIsActive.length} posts with array isActive`);

    // Find posts with any unexpected array fields
    console.log('\nChecking for posts with unexpected array fields...');
    const allPosts = await collection.find().limit(50).toArray();
    
    let corruptedPosts = [];
    
    allPosts.forEach((post, index) => {
      const issues = [];
      
      // Check each field that should NOT be an array
      const scalarFields = ['createdAt', 'updatedAt', 'views', 'author', 'privacy', 'isActive', 'content', 'type'];
      
      scalarFields.forEach(field => {
        if (post[field] && Array.isArray(post[field])) {
          issues.push(`${field} is array`);
        }
      });
      
      if (issues.length > 0) {
        corruptedPosts.push({
          _id: post._id,
          issues: issues
        });
        console.log(`Post ${post._id}: ${issues.join(', ')}`);
      }
    });

    if (corruptedPosts.length > 0) {
      console.log(`\n❌ Found ${corruptedPosts.length} corrupted posts`);
      
      // Fix the corrupted posts
      console.log('\n🔧 Attempting to fix corrupted posts...');
      
      for (const corruptedPost of corruptedPosts) {
        console.log(`Fixing post ${corruptedPost._id}...`);
        
        const post = await collection.findOne({ _id: corruptedPost._id });
        const updates = {};
        
        // Fix array fields that should be scalars
        if (Array.isArray(post.createdAt)) {
          updates.createdAt = post.createdAt[0] || new Date();
        }
        if (Array.isArray(post.views)) {
          updates.views = post.views[0] || 0;
        }
        if (Array.isArray(post.author)) {
          updates.author = post.author[0];
        }
        if (Array.isArray(post.privacy)) {
          updates.privacy = post.privacy[0] || 'public';
        }
        if (Array.isArray(post.isActive)) {
          updates.isActive = post.isActive[0] || true;
        }
        
        if (Object.keys(updates).length > 0) {
          await collection.updateOne({ _id: corruptedPost._id }, { $set: updates });
          console.log(`✅ Fixed post ${corruptedPost._id}`);
        }
      }
    } else {
      console.log('\n✅ No corrupted posts found');
    }

    // Test the query again
    console.log('\n🧪 Testing query after fixes...');
    const testPosts = await collection.find({ isActive: true, privacy: 'public' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`✅ Test query returned ${testPosts.length} posts`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findCorruptedPosts();
const mongoose = require('mongoose');
const { User } = require('../models');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talkcart', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Add wallet address to test user
const addTestWalletAddress = async () => {
  try {
    // Find the first user (or create one if none exists)
    let user = await User.findOne({});
    
    if (!user) {
      console.log('No users found. Creating a test user...');
      user = new User({
        username: 'sample_user_' + Math.random().toString(36).substr(2, 9),
        email: 'sample_' + Math.random().toString(36).substr(2, 9) + '@example.com',
        password: 'password123',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
        bio: 'Test user for wallet address privacy testing',
        settings: {
          privacy: {
            showWallet: true, // Enable wallet visibility for testing
            profileVisibility: 'public',
            activityVisibility: 'public',
            profilePublic: false,
            showActivity: true,
            showOnlineStatus: true,
            showLastSeen: false,
            allowTagging: true,
            allowDirectMessages: true,
            allowGroupInvites: true,
            allowMentions: true,
            messageRequestsFromFollowers: true,
            dataSharing: 'minimal',
            analyticsOptOut: false,
            personalizedAds: false,
            locationTracking: false,
            activityTracking: false,
            searchableByEmail: false,
            searchableByPhone: false,
            suggestToContacts: false,
            showInDirectory: false,
            downloadableContent: false,
            contentIndexing: false,
            shareAnalytics: false,
          }
        }
      });
      
      await user.save();
      console.log('Test user created successfully');
    } else {
      // Update existing user with wallet address
      if (!user.walletAddress) {
        user.walletAddress = '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4';
        
        // Ensure privacy settings exist
        if (!user.settings) {
          user.settings = {};
        }
        if (!user.settings.privacy) {
          user.settings.privacy = {};
        }
        
        // Set wallet visibility to true for testing
        user.settings.privacy.showWallet = true;
        
        await user.save();
        console.log('Wallet address added to existing user');
      } else {
        console.log('User already has a wallet address:', user.walletAddress);

        // Check current settings structure
        console.log('Current settings structure:', JSON.stringify(user.settings, null, 2));

        // Ensure privacy settings are properly set
        if (!user.settings) {
          user.settings = {};
        }

        // Handle legacy privacy setting (string) vs new privacy settings (object)
        if (typeof user.settings.privacy === 'string') {
          const oldPrivacyLevel = user.settings.privacy;

          // Use MongoDB update operation to replace the privacy setting
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                'settings.privacy': {
                  profileVisibility: oldPrivacyLevel,
                  activityVisibility: oldPrivacyLevel,
                  profilePublic: oldPrivacyLevel === 'public',
                  showWallet: true, // Enable for testing
                  showActivity: true,
                  showOnlineStatus: true,
                  showLastSeen: false,
                  allowTagging: true,
                  allowDirectMessages: true,
                  allowGroupInvites: true,
                  allowMentions: true,
                  messageRequestsFromFollowers: true,
                  dataSharing: 'minimal',
                  analyticsOptOut: false,
                  personalizedAds: false,
                  locationTracking: false,
                  activityTracking: false,
                  searchableByEmail: false,
                  searchableByPhone: false,
                  suggestToContacts: false,
                  showInDirectory: false,
                  downloadableContent: false,
                  contentIndexing: false,
                  shareAnalytics: false,
                }
              }
            }
          );
          console.log('Migrated legacy privacy settings and enabled wallet visibility');
        } else if (!user.settings.privacy) {
          await User.updateOne(
            { _id: user._id },
            { $set: { 'settings.privacy': {} } }
          );
        }

        // Refresh user data to get the updated privacy settings
        const updatedUser = await User.findById(user._id);
        if (typeof updatedUser.settings.privacy === 'object' && updatedUser.settings.privacy.showWallet === undefined) {
          await User.updateOne(
            { _id: user._id },
            { $set: { 'settings.privacy.showWallet': true } }
          );
          console.log('Updated showWallet setting to true');
        }
      }
    }
    
    // Get final user state
    const finalUser = await User.findById(user._id);

    console.log('User details:');
    console.log('- Username:', finalUser.username);
    console.log('- Email:', finalUser.email);
    console.log('- Wallet Address:', finalUser.walletAddress);
    console.log('- Privacy Settings Type:', typeof finalUser.settings?.privacy);
    console.log('- Show Wallet Setting:', finalUser.settings?.privacy?.showWallet);

    if (typeof finalUser.settings?.privacy === 'object') {
      console.log('✅ Privacy settings successfully migrated to object format');
    } else {
      console.log('❌ Privacy settings still in legacy string format');
    }
    
  } catch (error) {
    console.error('Error adding wallet address:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await addTestWalletAddress();
  
  console.log('\nTest wallet address setup complete!');
  console.log('You can now test the wallet privacy functionality in the frontend.');
  
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
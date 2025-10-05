// Simple validation test for marketplace cleanup
const fs = require('fs');
const path = require('path');

describe('Marketplace Cleanup Validation', () => {
  it('should have removed redundant components', () => {
    // These files should have been removed
    const removedFiles = [
      'frontend/src/components/marketplace/DebugCurrency.tsx',
      'frontend/src/components/marketplace/ProductComparison.tsx',
      'frontend/src/components/marketplace/ProductComparisonSelector.tsx'
    ];
    
    // Check that removed files don't exist
    removedFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', '..', file);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });
  
  it('should still have core marketplace components', () => {
    // These files should still exist
    const existingFiles = [
      'frontend/src/components/marketplace/ProductCard.tsx',
      'frontend/src/components/marketplace/MarketplaceGrid.tsx',
      'frontend/src/components/marketplace/BuyModal.tsx',
      'frontend/src/components/marketplace/FlutterwaveProductCheckout.tsx'
    ];
    
    // Check that core files still exist
    existingFiles.forEach(file => {
      const fullPath = path.join(__dirname, '..', '..', file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
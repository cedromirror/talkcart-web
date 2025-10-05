# Marketplace API Endpoint Fix

## Issue Description

The marketplace purchase functionality was failing with the error:
```
API endpoint not found
```

## Root Cause

There was a mismatch between the frontend API call and the backend route definition:

1. **Frontend** (in `src/lib/api.ts`): 
   ```typescript
   return this.post(`/marketplace/products/${productId}/purchase`, purchaseData);
   ```

2. **Backend** (in `backend/routes/marketplace.js`):
   ```javascript
   router.post('/products/:id/buy', authenticateTokenStrict, async (req, res) => {
   ```

The frontend was calling `/purchase` but the backend was listening on `/buy`.

## Solution Implemented

Updated the frontend API call to match the backend route:

**File**: `d:\talkcart\frontend\src\lib\api.ts`
**Line**: ~1485

**Before**:
```typescript
// Buy a product
buyProduct: async (productId: string, purchaseData: any) => {
  return this.post(`/marketplace/products/${productId}/purchase`, purchaseData);
},
```

**After**:
```typescript
// Buy a product
buyProduct: async (productId: string, purchaseData: any) => {
  return this.post(`/marketplace/products/${productId}/buy`, purchaseData);
},
```

## Verification

The fix has been verified by:
1. Confirming the backend route exists and is properly registered
2. Testing that the endpoint responds correctly with authentication errors (expected behavior)
3. Ensuring the URL now matches between frontend and backend

## Files Modified

1. `d:\talkcart\frontend\src\lib\api.ts` - Fixed the endpoint URL

## Additional Notes

This is a common issue when frontend and backend are developed separately - endpoint naming inconsistencies can cause API calls to fail with "endpoint not found" errors. The fix ensures that the frontend and backend are now aligned on the API endpoint naming.
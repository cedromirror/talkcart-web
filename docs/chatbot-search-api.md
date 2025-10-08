# Chatbot Search API Documentation

## Overview
The Chatbot Search API allows vendors to search for other vendors and customers within the TalkCart platform. This functionality is separate from the main messaging system and is designed specifically for the chatbot communication system.

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Search Endpoints

### Search Vendors
Search for other vendors on the platform.

**Endpoint:** `GET /api/chatbot/search/vendors`

**Access:** Private (Vendors only)

**Query Parameters:**
- `search` (optional): Search term to filter vendors by username or display name
- `limit` (optional, default: 20): Number of results per page
- `page` (optional, default: 1): Page number for pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "vendor_id",
        "username": "vendor_username",
        "displayName": "Vendor Display Name",
        "avatar": "avatar_url",
        "isVerified": true,
        "walletAddress": "wallet_address",
        "followerCount": 1250,
        "followingCount": 300,
        "productCount": 25
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Search Customers
Search for customers who have made purchases on the platform.

**Endpoint:** `GET /api/chatbot/search/customers`

**Access:** Private (Vendors only)

**Query Parameters:**
- `search` (optional): Search term to filter customers by username or display name
- `limit` (optional, default: 20): Number of results per page
- `page` (optional, default: 1): Page number for pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "customer_id",
        "username": "customer_username",
        "displayName": "Customer Display Name",
        "avatar": "avatar_url",
        "isVerified": false,
        "createdAt": "2023-01-15T10:30:00.000Z",
        "orderCount": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  }
}
```

## Error Responses
All endpoints may return the following error responses:

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Access denied. Vendor access required."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to search vendors/customers",
  "details": "Error message"
}
```

## Frontend Integration

### Vendor Messaging Dashboard
A vendor messaging dashboard component is available at `pages/marketplace/vendor-messaging.tsx` that provides a UI for:
- Searching vendors
- Searching customers
- Viewing search results with pagination
- Navigating to user profiles

### API Service
The frontend API service at `src/services/chatbotApi.ts` provides TypeScript-typed functions for:
- `searchVendors(options)`: Search for vendors
- `searchCustomers(options)`: Search for customers

## Implementation Details

### Vendor Search Logic
1. Only vendors can search for other users
2. Results are filtered to only include vendors with active products
3. The current vendor is excluded from search results
4. Results are sorted by follower count (descending)
5. Search filters apply to username and display name (case-insensitive)

### Customer Search Logic
1. Only vendors can search for customers
2. Results are filtered to only include customers who have placed orders
3. Results are sorted by creation date (newest first)
4. Search filters apply to username and display name (case-insensitive)

## Usage Examples

### Search for Vendors
```javascript
import { searchVendors } from '../src/services/chatbotApi';

// Search for vendors with "tech" in their name
const vendors = await searchVendors({
  search: 'tech',
  limit: 10,
  page: 1
});
```

### Search for Customers
```javascript
import { searchCustomers } from '../src/services/chatbotApi';

// Search for customers with "john" in their name
const customers = await searchCustomers({
  search: 'john',
  limit: 10,
  page: 1
});
```
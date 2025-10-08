# Chatbot API Documentation

## Overview
The Chatbot API provides a separate messaging system for customer-vendor communication that is distinct from the main messaging system. This system allows customers to initiate conversations with vendors about specific products, while vendors can respond through a simplified interface.

## Base URL
```
/api/chatbot
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Core Endpoints

### Conversations

#### Create Conversation
Create a new chatbot conversation between a customer and vendor for a specific product.

**Endpoint:** `POST /conversations`

**Access:** Private (Customers only)

**Request Body:**
```json
{
  "vendorId": "vendor_id",
  "productId": "product_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "_id": "conversation_id",
      "customerId": "customer_id",
      "vendorId": "vendor_id",
      "productId": "product_id",
      "productName": "Product Name",
      "lastActivity": "2023-01-15T10:30:00.000Z",
      "isActive": true,
      "isResolved": false,
      "botEnabled": true,
      "botPersonality": "helpful"
    },
    "isNew": true
  },
  "message": "Chatbot conversation created successfully"
}
```

#### Get User Conversations
Retrieve a list of conversations for the authenticated user.

**Endpoint:** `GET /conversations`

**Access:** Private

**Query Parameters:**
- `limit` (optional, default: 20): Number of results per page
- `page` (optional, default: 1): Page number for pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "_id": "conversation_id",
        "customerId": "customer_id",
        "vendorId": "vendor_id",
        "productId": "product_id",
        "productName": "Product Name",
        "lastActivity": "2023-01-15T10:30:00.000Z",
        "isActive": true,
        "isResolved": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalConversations": 1,
      "hasMore": false
    }
  }
}
```

#### Get Specific Conversation
Retrieve details of a specific conversation.

**Endpoint:** `GET /conversations/:id`

**Access:** Private (Participants only)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "_id": "conversation_id",
      "customerId": "customer_id",
      "vendorId": "vendor_id",
      "productId": "product_id",
      "productName": "Product Name",
      "lastActivity": "2023-01-15T10:30:00.000Z",
      "isActive": true,
      "isResolved": false
    }
  }
}
```

#### Mark Conversation as Resolved
Mark a conversation as resolved (vendor only).

**Endpoint:** `PUT /conversations/:id/resolve`

**Access:** Private (Vendors only)

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "_id": "conversation_id",
      "customerId": "customer_id",
      "vendorId": "vendor_id",
      "productId": "product_id",
      "productName": "Product Name",
      "lastActivity": "2023-01-15T10:30:00.000Z",
      "isActive": true,
      "isResolved": true
    }
  },
  "message": "Conversation marked as resolved"
}
```

#### Close Conversation
Close/Archive a conversation.

**Endpoint:** `DELETE /conversations/:id`

**Access:** Private (Participants only)

**Response:**
```json
{
  "success": true,
  "message": "Conversation closed successfully"
}
```

### Messages

#### Get Conversation Messages
Retrieve messages in a conversation.

**Endpoint:** `GET /conversations/:id/messages`

**Access:** Private (Participants only)

**Query Parameters:**
- `limit` (optional, default: 50): Number of results per page
- `page` (optional, default: 1): Page number for pagination
- `before` (optional): Get messages before this timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "message_id",
        "conversationId": "conversation_id",
        "senderId": "sender_id",
        "content": "Hello, I have a question about this product",
        "type": "text",
        "isBotMessage": false,
        "isEdited": false,
        "isDeleted": false,
        "createdAt": "2023-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalMessages": 1,
      "hasMore": false
    }
  }
}
```

#### Send Message
Send a message in a conversation.

**Endpoint:** `POST /conversations/:id/messages`

**Access:** Private (Participants only)

**Request Body:**
```json
{
  "content": "Your message content here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "message_id",
      "conversationId": "conversation_id",
      "senderId": "sender_id",
      "content": "Your message content here",
      "type": "text",
      "isBotMessage": false,
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2023-01-15T10:30:00.000Z"
    }
  },
  "message": "Message sent successfully"
}
```

#### Edit Message
Edit an existing message.

**Endpoint:** `PUT /conversations/:id/messages/:messageId`

**Access:** Private (Message sender only)

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "message_id",
      "conversationId": "conversation_id",
      "senderId": "sender_id",
      "content": "Updated message content",
      "type": "text",
      "isBotMessage": false,
      "isEdited": true,
      "isDeleted": false,
      "createdAt": "2023-01-15T10:30:00.000Z",
      "updatedAt": "2023-01-15T11:00:00.000Z"
    }
  },
  "message": "Message updated successfully"
}
```

#### Delete Message
Delete a message (soft delete).

**Endpoint:** `DELETE /conversations/:id/messages/:messageId`

**Access:** Private (Message sender only)

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

#### Reply to Message
Reply to a specific message.

**Endpoint:** `POST /conversations/:id/messages/:messageId/reply`

**Access:** Private (Conversation participants only)

**Request Body:**
```json
{
  "content": "Your reply content here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "reply_message_id",
      "conversationId": "conversation_id",
      "senderId": "sender_id",
      "content": "Your reply content here",
      "type": "text",
      "isBotMessage": false,
      "isEdited": false,
      "isDeleted": false,
      "metadata": {
        "replyTo": "original_message_id"
      },
      "createdAt": "2023-01-15T11:30:00.000Z"
    }
  },
  "message": "Reply sent successfully"
}
```

## Search Endpoints
For documentation on search endpoints, see [Chatbot Search API](chatbot-search-api.md).

## Error Responses
All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Access denied. Authentication required."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Access denied. Insufficient permissions."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error.",
  "details": "Error details"
}
```

## Implementation Details

### Security
- All endpoints are protected by JWT authentication
- Role-based access control ensures only authorized users can perform actions
- Vendors can only resolve conversations they are part of
- Users can only access conversations they are participants in
- Users can only edit/delete their own messages
- System messages cannot be edited or deleted

### Data Models

#### ChatbotConversation
- `customerId`: Reference to the customer user
- `vendorId`: Reference to the vendor user
- `productId`: Reference to the product
- `productName`: Name of the product at time of conversation creation
- `lastMessage`: Reference to the last message in the conversation
- `lastActivity`: Timestamp of last activity
- `isActive`: Whether the conversation is active
- `isResolved`: Whether the conversation is resolved
- `botEnabled`: Whether bot responses are enabled
- `botPersonality`: Personality setting for bot responses

#### ChatbotMessage
- `conversationId`: Reference to the conversation
- `senderId`: Reference to the sender user
- `content`: Message content
- `type`: Type of message (text, system, suggestion)
- `isBotMessage`: Whether the message was sent by a bot
- `botConfidence`: Confidence level of bot response (0-1)
- `suggestedResponses`: Array of suggested responses
- `responseTime`: Time taken to generate response (ms)
- `userSatisfaction`: User satisfaction rating (0-1)
- `isEdited`: Whether the message has been edited
- `isDeleted`: Whether the message has been deleted
- `metadata`: Additional metadata (e.g., replyTo reference)

## Frontend Integration

### API Service
The frontend API service at `src/services/chatbotApi.ts` provides TypeScript-typed functions for all endpoints:
- `getConversations(options)`: Get user conversations
- `createConversation(data)`: Create new conversation
- `getConversation(conversationId)`: Get specific conversation
- `getMessages(conversationId, options)`: Get conversation messages
- `sendMessage(conversationId, data)`: Send message
- `editMessage(conversationId, messageId, data)`: Edit message
- `deleteMessage(conversationId, messageId)`: Delete message
- `replyToMessage(conversationId, messageId, data)`: Reply to message
- `resolveConversation(conversationId)`: Mark conversation as resolved
- `closeConversation(conversationId)`: Close conversation

### Components
- `ChatbotButton`: Button component to initiate conversations from product pages
- `ChatbotTestPage`: Full chat interface with message actions
- `VendorMessagingDashboard`: Dashboard for vendors to search and message users

## Usage Examples

### Initialize a Conversation
```javascript
import { createConversation } from '../src/services/chatbotApi';

// Create a conversation with a vendor about a product
const conversation = await createConversation({
  vendorId: 'vendor_id',
  productId: 'product_id'
});
```

### Send a Message
```javascript
import { sendMessage } from '../src/services/chatbotApi';

// Send a message in a conversation
const message = await sendMessage('conversation_id', {
  content: 'Hello, I have a question about this product'
});
```

### Edit a Message
```javascript
import { editMessage } from '../src/services/chatbotApi';

// Edit a message
const updatedMessage = await editMessage('conversation_id', 'message_id', {
  content: 'Updated question about this product'
});
```

### Delete a Message
```javascript
import { deleteMessage } from '../src/services/chatbotApi';

// Delete a message
await deleteMessage('conversation_id', 'message_id');
```

### Reply to a Message
```javascript
import { replyToMessage } from '../src/services/chatbotApi';

// Reply to a message
const reply = await replyToMessage('conversation_id', 'original_message_id', {
  content: 'Thanks for your question!'
});
```
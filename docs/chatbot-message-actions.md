# Chatbot Message Actions Implementation

## Overview
This document describes the implementation of message actions (edit, delete, reply) for the TalkCart chatbot system. These features enhance the chatbot functionality by allowing users to modify their messages after sending them, providing a more flexible and user-friendly communication experience.

## Features Implemented

### 1. Edit Messages
Users can edit their own messages after they've been sent:
- Only the message sender can edit their messages
- System messages cannot be edited
- Edited messages are marked with an "edited" indicator
- Full edit history is maintained through the `isEdited` flag

### 2. Delete Messages
Users can delete their own messages:
- Only the message sender can delete their messages
- System messages cannot be deleted
- Messages are soft-deleted (content is replaced with "[Message deleted]")
- The message record is preserved for conversation context

### 3. Reply to Messages
Users can reply directly to specific messages:
- Replies maintain context by referencing the original message
- Reply metadata is stored in the message document
- All conversation participants can reply to messages

## Backend Implementation

### New API Endpoints

#### Edit Message
- **Endpoint:** `PUT /api/chatbot/conversations/:id/messages/:messageId`
- **Access:** Private (Message sender only)
- **Functionality:** Updates message content and marks as edited

#### Delete Message
- **Endpoint:** `DELETE /api/chatbot/conversations/:id/messages/:messageId`
- **Access:** Private (Message sender only)
- **Functionality:** Soft deletes message by replacing content

#### Reply to Message
- **Endpoint:** `POST /api/chatbot/conversations/:id/messages/:messageId/reply`
- **Access:** Private (Conversation participants only)
- **Functionality:** Creates new message with reference to original

### Data Model Updates

#### ChatbotMessage Model
Added `metadata` field to store reply references:
```javascript
metadata: {
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotMessage'
  }
}
```

### Security Measures
1. **Authorization Checks:**
   - Only message senders can edit/delete their messages
   - Only conversation participants can reply to messages
   - System messages are protected from edits/deletes

2. **Validation:**
   - Message content validation
   - Conversation participation validation
   - Message ownership validation

3. **Soft Delete Implementation:**
   - Messages are not permanently removed
   - Content is replaced with "[Message deleted]" placeholder
   - `isDeleted` flag is set to true

## Frontend Implementation

### Updated Components

#### ChatbotTestPage
Enhanced with full message action capabilities:
- Context menu for message actions (edit, delete, reply)
- Edit dialog with content editing
- Reply dialog for responding to messages
- Visual indicators for edited messages
- Error handling and user feedback

### New API Functions

#### chatbotApi Service
Added new functions to the TypeScript API service:
- `editMessage(conversationId, messageId, data)`
- `deleteMessage(conversationId, messageId)`
- `replyToMessage(conversationId, messageId, data)`

### User Interface Features

1. **Message Context Menu:**
   - Three-dot menu on user's own messages
   - Action options based on message type and ownership
   - Visual feedback for available actions

2. **Edit Dialog:**
   - Modal interface for message editing
   - Content validation
   - Loading states during API calls

3. **Reply Dialog:**
   - Dedicated interface for replying to messages
   - Clear indication of reply context
   - Content validation

4. **Visual Indicators:**
   - "(edited)" tag for modified messages
   - "[Message deleted]" for deleted content
   - User-friendly error messages

## Testing

### Backend Tests
Created comprehensive tests for all new endpoints:
- Edit message functionality
- Delete message functionality
- Reply to message functionality
- Authorization and validation checks

### Frontend Tests
Created component tests for the enhanced chat interface:
- Message action menu functionality
- Edit dialog interactions
- Reply dialog interactions
- Visual indicator rendering

## Usage Instructions

### For End Users
1. **Editing Messages:**
   - Click the three-dot menu on your message
   - Select "Edit"
   - Modify the content in the dialog
   - Click "Save" to update

2. **Deleting Messages:**
   - Click the three-dot menu on your message
   - Select "Delete"
   - Confirm deletion (irreversible action)

3. **Replying to Messages:**
   - Click the three-dot menu on any message
   - Select "Reply"
   - Enter your response in the dialog
   - Click "Send Reply"

### For Developers
1. **API Integration:**
   - Use `editMessage()`, `deleteMessage()`, and `replyToMessage()` functions
   - Handle errors appropriately
   - Update UI based on response data

2. **Component Customization:**
   - Extend message action menu with additional options
   - Customize dialog appearance
   - Add analytics tracking for message actions

## Security Considerations

1. **Access Control:**
   - Strict validation of message ownership
   - Conversation participation verification
   - Role-based permissions for system messages

2. **Data Integrity:**
   - Immutable message history through edit flags
   - Soft delete to preserve conversation context
   - Validation of all input data

3. **Privacy:**
   - No exposure of deleted message content
   - Protection of system message integrity
   - Secure handling of authentication tokens

## Future Enhancements

1. **Advanced Reply Features:**
   - Quoting original message content
   - Threaded conversation views
   - Reply notifications

2. **Enhanced Edit History:**
   - Full version history tracking
   - Undo functionality for recent edits
   - Edit reason tracking

3. **Bulk Message Actions:**
   - Select multiple messages for bulk operations
   - Conversation cleanup tools
   - Export options for message history

## Conclusion

The message actions implementation provides users with greater control over their chatbot conversations while maintaining security and data integrity. The features are designed to be intuitive and user-friendly, with appropriate safeguards to prevent abuse.
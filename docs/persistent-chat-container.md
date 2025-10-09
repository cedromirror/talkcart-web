# Persistent Chat Container Documentation

This document explains the implementation of the persistent chat container for the vendor dashboard, which maintains conversation history across page reloads.

## Overview

The persistent chat container is a floating chat interface that remains accessible from any page in the vendor dashboard. It provides the following features:

1. Persistent conversation history using localStorage
2. Ability to restore previous conversations
3. Modern UI with chat history panel
4. Real-time messaging with admin support

## Implementation Details

### Component Structure

The `PersistentChatContainer` component is located at:
```
frontend/src/components/chatbot/PersistentChatContainer.tsx
```

### Key Features

#### 1. LocalStorage Persistence
- Chat history is stored in localStorage using the user ID as a key
- History includes conversation titles, last messages, and timestamps
- Data is automatically loaded when the component mounts
- Data is automatically saved whenever the chat history changes

#### 2. Chat History Management
- Users can view previous conversations in a dedicated history panel
- Each conversation shows the title, last message, and timestamp
- Users can delete conversation history items
- Badge indicators show unread message counts

#### 3. Conversation Restoration
- Users can click on any previous conversation to restore it
- Messages are loaded from the backend when restoring conversations
- The chat interface updates to show the selected conversation

#### 4. Floating Interface
- The chat container appears as a floating button when minimized
- Clicking the button opens the full chat interface
- The interface can be closed to return to the minimized state

### Integration with Vendor Dashboard

The persistent chat container is integrated into the vendor dashboard by:

1. Importing the component:
```typescript
import PersistentChatContainer from '@/components/chatbot/PersistentChatContainer';
```

2. Adding state to manage visibility:
```typescript
const [isChatOpen, setIsChatOpen] = useState(false);
```

3. Including the component in the JSX:
```jsx
<PersistentChatContainer 
  isOpen={isChatOpen} 
  onToggle={() => setIsChatOpen(!isChatOpen)} 
/>
```

### Data Models

#### ChatHistoryItem Interface
```typescript
interface ChatHistoryItem {
  id: string;
  conversationId: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}
```

### API Integration

The component integrates with the existing chatbot API:

- `getConversations()` - Fetch user conversations
- `getConversation(conversationId)` - Fetch a specific conversation
- `getMessages(conversationId)` - Fetch messages for a conversation
- `sendMessage(conversationId, content)` - Send a new message
- `createConversation()` - Create a new vendor-admin conversation

### Styling

The component uses Material-UI styled components for consistent styling:

- Modern chat bubbles with distinct user/admin styling
- Responsive design that works on different screen sizes
- Smooth animations for opening/closing the chat
- Proper z-index management to ensure visibility

## Usage

### Opening the Chat
Click the floating chat button in the bottom-right corner of the vendor dashboard.

### Viewing Chat History
Click the history icon in the chat header to open the chat history panel.

### Restoring Conversations
Click on any conversation in the history panel to restore it.

### Closing the Chat
Click the close icon in the chat header to minimize the chat to a floating button.

## Technical Considerations

### Performance
- Chat history is only loaded once per session
- Messages are paginated (50 per request) to prevent performance issues
- LocalStorage operations are asynchronous to prevent UI blocking

### Security
- All API calls use authenticated requests with Bearer tokens
- User-specific data isolation using user ID in localStorage keys
- Input validation for all user-provided data

### Error Handling
- Network errors are displayed to the user
- Failed API calls are retried automatically
- Graceful degradation when backend services are unavailable

## Future Enhancements

### Planned Features
1. Real-time message updates using WebSockets
2. File attachment support
3. Message search functionality
4. Conversation tagging and categorization
5. Rich media message support (images, videos)
6. Message reactions and emoji support

### Potential Improvements
1. Offline message queuing
2. Advanced notification settings
3. Conversation export functionality
4. Integration with external communication platforms
5. AI-powered chat suggestions
6. Multi-language support

## Testing

### Unit Tests
The component includes comprehensive unit tests covering:

- LocalStorage integration
- API error handling
- UI state management
- Conversation restoration
- Message sending/receiving

### Integration Tests
End-to-end tests verify:

- Chat persistence across page reloads
- Conversation history management
- Message delivery and display
- Error scenarios and recovery

## Troubleshooting

### Common Issues

#### Chat History Not Loading
- Verify localStorage is enabled in the browser
- Check browser console for JavaScript errors
- Ensure user is properly authenticated

#### Messages Not Sending
- Check network connectivity
- Verify API endpoint availability
- Confirm authentication token validity

#### UI Display Issues
- Clear browser cache and reload
- Check browser compatibility
- Verify Material-UI dependencies are up to date

### Debugging Tips
- Use browser developer tools to inspect localStorage contents
- Monitor network requests in the developer console
- Check browser console for error messages
- Verify user authentication state

## Conclusion

The persistent chat container provides vendors with a seamless communication experience while maintaining conversation history across sessions. Its implementation follows modern React best practices and integrates smoothly with the existing chatbot infrastructure.
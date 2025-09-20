# TalkCart Call System - Complete Feature Documentation

## Overview
The TalkCart call system provides comprehensive audio and video calling capabilities with WebRTC technology, including advanced features like call recording, screen sharing, call quality reporting, and missed call management.

## Features Implemented

### 1. Core Call Functionality
- **Audio Calls**: High-quality voice calls between users
- **Video Calls**: HD video calls with camera controls
- **Call Initiation**: Start calls from conversations
- **Call Acceptance/Decline**: Handle incoming calls
- **Call Termination**: End calls gracefully

### 2. WebRTC Integration
- **Peer-to-Peer Connection**: Direct connection between users
- **ICE Candidate Exchange**: NAT traversal support
- **Offer/Answer Protocol**: SDP negotiation
- **Media Stream Management**: Audio/video stream handling
- **Connection State Monitoring**: Real-time connection status

### 3. Advanced Call Features

#### Screen Sharing
- **Start/Stop Screen Share**: Share desktop or application windows
- **Screen Share Detection**: Automatic handling of screen share end
- **Multi-participant Support**: Share screen with multiple users

#### Call Recording
- **Start/Stop Recording**: Record calls for later playback
- **Recording Metadata**: Track recording duration and participants
- **Recording Permissions**: Only call participants can record
- **Recording Status**: Visual indicators during recording

#### Call Quality Management
- **Quality Metrics**: Audio, video, and connection quality tracking
- **Post-call Rating**: Rate call experience after ending
- **Feedback Collection**: Optional feedback for call improvements
- **Quality Reporting**: Submit quality reports to backend

### 4. Call History & Management

#### Call History
- **Conversation History**: View all calls for a conversation
- **Call Details**: Duration, participants, call type, status
- **Call Status Indicators**: Missed, declined, completed calls
- **Pagination Support**: Load call history in pages

#### Missed Calls
- **Missed Call Detection**: Track unanswered calls
- **Missed Call Notifications**: Visual indicators for missed calls
- **Mark as Seen**: Clear missed call notifications
- **Callback Functionality**: Quick callback from missed calls

#### Active Calls
- **Active Call Monitoring**: Track ongoing calls
- **Multi-call Support**: Handle multiple simultaneous calls
- **Call Switching**: Switch between active calls

### 5. User Interface Components

#### CallInterface
- **Full-screen Call UI**: Immersive call experience
- **Minimizable Window**: Picture-in-picture mode
- **Control Buttons**: Mute, video toggle, screen share, record, end call
- **Participant Display**: Show all call participants
- **Call Duration**: Real-time call timer

#### IncomingCallModal
- **Call Notification**: Modal for incoming calls
- **Caller Information**: Display caller details and avatar
- **Accept/Decline Actions**: Quick response buttons
- **Call Type Indication**: Audio/video call icons

#### CallQualityDialog
- **Rating System**: 5-star rating for call aspects
- **Quality Categories**: Audio, video, connection quality
- **Feedback Input**: Optional text feedback
- **Submission Handling**: Send quality reports

#### MissedCallsDialog
- **Missed Call List**: Show all missed calls
- **Call Details**: Caller info, time, call type
- **Bulk Actions**: Mark multiple calls as seen
- **Callback Options**: Audio/video callback buttons

#### CallHistoryDialog
- **History Display**: Chronological call list
- **Call Status Icons**: Visual indicators for call outcomes
- **Participant Info**: Show other call participants
- **Quick Actions**: Callback buttons for each entry

#### CallManager
- **Centralized Management**: Single component for all call features
- **Floating Action Buttons**: Quick access to call functions
- **State Management**: Handle all call-related state
- **Event Coordination**: Coordinate between different call components

### 6. Backend API Endpoints

#### Call Management
- `POST /api/calls/initiate` - Start a new call
- `POST /api/calls/:callId/join` - Join an existing call
- `POST /api/calls/:callId/leave` - Leave a call
- `POST /api/calls/:callId/decline` - Decline an incoming call

#### Call Information
- `GET /api/calls/active` - Get user's active calls
- `GET /api/calls/missed` - Get user's missed calls
- `GET /api/calls/conversation/:conversationId/history` - Get call history

#### Call Quality
- `POST /api/calls/:callId/quality` - Report call quality
- `POST /api/calls/missed/mark-seen` - Mark missed calls as seen

#### Call Recording
- `POST /api/calls/:callId/recording/start` - Start call recording
- `POST /api/calls/:callId/recording/stop` - Stop call recording
- `GET /api/calls/:callId/recordings` - Get call recordings

### 7. Socket Events

#### WebRTC Signaling
- `call:offer` - Send/receive WebRTC offers
- `call:answer` - Send/receive WebRTC answers
- `call:ice-candidate` - Exchange ICE candidates
- `call:status` - Call status updates

#### Screen Sharing
- `call:screen-share-start` - Start screen sharing
- `call:screen-share-stop` - Stop screen sharing

#### Call Events
- `call:initiated` - Call started
- `call:joined` - User joined call
- `call:left` - User left call
- `call:ended` - Call ended

### 8. Database Models

#### Call Model
```javascript
{
  callId: String,           // Unique call identifier
  conversationId: ObjectId, // Associated conversation
  initiator: ObjectId,      // User who started the call
  participants: [{          // Call participants
    userId: ObjectId,
    joinedAt: Date,
    leftAt: Date,
    status: String          // invited, joined, declined, missed, left, seen
  }],
  type: String,            // audio, video
  status: String,          // initiated, ringing, active, ended, missed, declined
  startedAt: Date,         // Call start time
  endedAt: Date,           // Call end time
  duration: Number,        // Call duration in seconds
  quality: {               // Call quality metrics
    audioQuality: Number,
    videoQuality: Number,
    connectionQuality: Number,
    feedback: String
  },
  recording: {             // Recording information
    isRecording: Boolean,
    recordingId: String,
    startedBy: ObjectId,
    stoppedBy: ObjectId,
    startedAt: Date,
    stoppedAt: Date,
    duration: Number,
    fileUrl: String,
    fileSize: Number
  }
}
```

### 9. State Management

#### useCall Hook
Centralized state management for all call functionality:
- Call state (current, incoming, active)
- Media streams (local, remote)
- Connection states
- Call history and missed calls
- Loading and error states
- All call actions and handlers

### 10. Security Features
- **Authentication Required**: All call endpoints require valid JWT
- **Participant Validation**: Only conversation participants can join calls
- **Recording Permissions**: Only call participants can start/stop recording
- **Quality Report Validation**: Only call participants can report quality

### 11. Performance Optimizations
- **Efficient State Updates**: Optimized React state management
- **Stream Management**: Proper cleanup of media streams
- **Connection Monitoring**: Real-time connection state tracking
- **Lazy Loading**: Components loaded only when needed

### 12. Error Handling
- **Network Errors**: Graceful handling of connection issues
- **Permission Errors**: Handle camera/microphone permission denials
- **WebRTC Errors**: Comprehensive WebRTC error handling
- **API Errors**: Proper error messages and user feedback

### 13. Responsive Design
- **Mobile Support**: Optimized for mobile devices
- **Adaptive UI**: Interface adapts to screen size
- **Touch Controls**: Touch-friendly control buttons
- **Orientation Support**: Handle device rotation

### 14. Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast**: Support for high contrast themes
- **Focus Management**: Proper focus handling during calls

## Usage Examples

### Starting a Call
```typescript
const { initiateCall } = useCall();
await initiateCall(conversationId, 'video');
```

### Handling Incoming Calls
```typescript
const { acceptCall, declineCall } = useCall();
await acceptCall(callId);
// or
await declineCall(callId);
```

### Managing Call Quality
```typescript
const { reportCallQuality } = useCall();
await reportCallQuality(callId, {
  audioQuality: 5,
  videoQuality: 4,
  connectionQuality: 5,
  feedback: "Great call quality!"
});
```

### Recording Calls
```typescript
const { startRecording, stopRecording } = useCall();
await startRecording();
// ... during call
await stopRecording();
```

## Integration

### In a Chat Component
```tsx
import CallManager from '@/components/calls/CallManager';

function ChatComponent({ conversationId }) {
  return (
    <div>
      {/* Your chat UI */}
      <CallManager conversationId={conversationId} />
    </div>
  );
}
```

### Standalone Call Interface
```tsx
import { useCall } from '@/hooks/useCall';
import CallInterface from '@/components/calls/CallInterface';

function MyCallComponent() {
  const { 
    currentCall, 
    localStream, 
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isRecording,
    endCall,
    toggleAudio,
    toggleVideo,
    startRecording,
    stopRecording,
    reportCallQuality
  } = useCall();

  return (
    <CallInterface
      call={currentCall}
      localStream={localStream}
      remoteStreams={remoteStreams}
      isAudioEnabled={isAudioEnabled}
      isVideoEnabled={isVideoEnabled}
      isRecording={isRecording}
      onEndCall={endCall}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onReportQuality={reportCallQuality}
    />
  );
}
```

## Future Enhancements
- **Group Calls**: Support for multi-participant calls
- **Call Transfer**: Transfer calls between users
- **Call Waiting**: Handle multiple incoming calls
- **Voicemail**: Leave voice messages when calls are missed
- **Call Analytics**: Detailed call statistics and analytics
- **Call Scheduling**: Schedule calls for future times
- **International Calling**: Support for international numbers
- **Call Encryption**: End-to-end encryption for calls

## Technical Requirements
- **WebRTC Support**: Modern browser with WebRTC capabilities
- **Camera/Microphone**: Required for video/audio calls
- **Network**: Stable internet connection
- **Permissions**: Camera and microphone permissions
- **HTTPS**: Secure connection required for WebRTC

This comprehensive call system provides a complete solution for real-time communication within the TalkCart application, with professional-grade features and user experience.
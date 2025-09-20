# 🎤 Enhanced Voice Message Component

A modern, feature-rich voice message component with waveform visualization, advanced playback controls, and beautiful UI design.

## ✨ Features

### 🌊 Interactive Waveform Visualization
- **Animated Waveform Bars**: Dynamic bars that respond to playback progress
- **Clickable Seeking**: Click anywhere on the waveform to jump to that position
- **Visual Feedback**: Bars light up and animate during playback
- **Responsive Design**: Adapts to different container sizes

### ⚡ Advanced Playback Controls
- **Play/Pause**: Large, accessible play button with loading states
- **Skip Controls**: Skip forward/backward 10 seconds with visual feedback
- **Variable Speed**: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x playback speeds
- **Mute/Unmute**: Volume control with visual indicators
- **Progress Tracking**: Real-time progress updates and seeking

### 🎨 Modern Design
- **Glassmorphism Effects**: Translucent backgrounds with blur effects
- **Smooth Animations**: Fluid transitions and hover effects
- **Message Ownership**: Different styling for sent vs received messages
- **Mobile Optimized**: Touch-friendly controls and responsive layout

### 📱 User Experience
- **Context Menu**: Download, forward, delete, and speed control options
- **File Information**: Display file size, duration, and timestamp
- **Loading States**: Visual feedback during audio loading
- **Accessibility**: Keyboard navigation and screen reader support

## 🚀 Quick Start

### Installation

1. Copy the component files to your project:
```bash
# Copy the voice message component
cp VoiceMessageBubble.tsx src/components/messaging/

# Copy the enhanced message bubble (optional)
cp EnhancedMessageBubbleV2.tsx src/components/messaging/
```

2. Install required dependencies (if not already installed):
```bash
npm install @mui/material @mui/icons-material lucide-react date-fns
```

### Basic Usage

```tsx
import VoiceMessageBubble from './components/messaging/VoiceMessageBubble';

function MyMessageComponent({ message }) {
  return (
    <VoiceMessageBubble
      audioUrl={message.media[0].url}
      filename={message.media[0].filename}
      isOwn={message.isOwn}
      timestamp="2:34 PM"
      onDownload={() => window.open(message.media[0].url, '_blank')}
      onForward={() => handleForward(message)}
      onDelete={message.isOwn ? () => handleDelete(message.id) : undefined}
    />
  );
}
```

### Integration with Existing Message Components

```tsx
// In your EnhancedMessageBubble component
import VoiceMessageBubble from './VoiceMessageBubble';

// Replace the existing audio rendering with:
case 'audio':
  return (
    <VoiceMessageBubble
      audioUrl={media.url}
      filename={media.filename}
      isOwn={message.isOwn}
      timestamp={getMessageTime()}
      onDownload={() => window.open(media.url, '_blank')}
      onForward={onForward}
      onDelete={message.isOwn ? handleDelete : undefined}
    />
  );
```

## 📋 Component API

### VoiceMessageBubble Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `audioUrl` | `string` | ✅ | URL of the audio file |
| `filename` | `string` | ✅ | Display name of the audio file |
| `isOwn` | `boolean` | ✅ | Whether the message is from the current user |
| `timestamp` | `string` | ✅ | Display timestamp for the message |
| `duration` | `number` | ❌ | Audio duration in seconds (auto-detected if not provided) |
| `fileSize` | `number` | ❌ | File size in bytes for display |
| `onDownload` | `() => void` | ❌ | Callback when download is requested |
| `onForward` | `() => void` | ❌ | Callback when forward is requested |
| `onDelete` | `() => void` | ❌ | Callback when delete is requested |

### EnhancedMessageBubbleV2 Props

Extends the original `EnhancedMessageBubble` props with enhanced voice message support:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `message` | `Message` | ✅ | Message object with media array |
| `showAvatar` | `boolean` | ❌ | Show sender avatar (default: true) |
| `onReply` | `() => void` | ❌ | Reply callback |
| `onEdit` | `(id: string, content: string) => Promise<boolean>` | ❌ | Edit callback |
| `onDelete` | `(id: string) => Promise<boolean>` | ❌ | Delete callback |
| `onReaction` | `(id: string, emoji: string) => Promise<boolean>` | ❌ | Reaction callback |
| `onForward` | `() => void` | ❌ | Forward callback |

## 🎨 Customization

### Theme Integration

The component uses Material-UI's theme system. Customize colors by updating your theme:

```tsx
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea', // Primary color for controls
    },
    secondary: {
      main: '#764ba2', // Secondary accent color
    },
  },
});
```

### Custom Styling

Override component styles using the `sx` prop or styled components:

```tsx
<VoiceMessageBubble
  // ... other props
  sx={{
    '& .voice-message-container': {
      backgroundColor: 'custom-color',
      borderRadius: 4,
    }
  }}
/>
```

### Waveform Customization

Modify the waveform generation in the component:

```tsx
// In VoiceMessageBubble.tsx
useEffect(() => {
  const generateWaveform = () => {
    const bars = 40; // Number of bars
    const data = Array.from({ length: bars }, () => 
      Math.random() * 0.8 + 0.2 // Height variation
    );
    setWaveformData(data);
  };
  generateWaveform();
}, []);
```

## 🔧 Advanced Features

### Real Waveform Data

For production use, replace the mock waveform with real audio analysis:

```tsx
// Example using Web Audio API
const generateRealWaveform = async (audioUrl: string) => {
  const audioContext = new AudioContext();
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const channelData = audioBuffer.getChannelData(0);
  const samples = 40;
  const blockSize = Math.floor(channelData.length / samples);
  const waveformData = [];
  
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[i * blockSize + j]);
    }
    waveformData.push(sum / blockSize);
  }
  
  return waveformData;
};
```

### Audio Optimization Integration

Use with the audio optimization endpoint:

```tsx
const handleAudioOptimization = async (originalUrl: string) => {
  try {
    const response = await fetch('/api/media/audio/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicId: extractPublicId(originalUrl),
        format: 'mp3',
        quality: 'auto'
      })
    });
    
    const result = await response.json();
    return result.data.optimized_url;
  } catch (error) {
    console.error('Audio optimization failed:', error);
    return originalUrl; // Fallback to original
  }
};
```

## 📱 Mobile Considerations

### Touch Interactions
- Large touch targets (minimum 44px)
- Swipe gestures for seeking
- Haptic feedback on supported devices

### Performance
- Lazy loading of audio files
- Efficient waveform rendering
- Memory management for multiple audio instances

### Accessibility
- Screen reader support
- Keyboard navigation
- High contrast mode support

## 🧪 Testing

### Demo Page
Visit the demo page to see the component in action:
```
http://localhost:4000/voice-message-demo.html
```

### Unit Tests
```tsx
// Example test
import { render, fireEvent } from '@testing-library/react';
import VoiceMessageBubble from './VoiceMessageBubble';

test('plays audio when play button is clicked', () => {
  const { getByRole } = render(
    <VoiceMessageBubble
      audioUrl="test-audio.mp3"
      filename="test.mp3"
      isOwn={true}
      timestamp="2:34 PM"
    />
  );
  
  const playButton = getByRole('button', { name: /play/i });
  fireEvent.click(playButton);
  
  // Assert audio is playing
});
```

## 🚀 Performance Optimization

### Best Practices
1. **Lazy Loading**: Load audio files only when needed
2. **Caching**: Cache waveform data and audio metadata
3. **Memory Management**: Cleanup audio elements on unmount
4. **Debouncing**: Debounce seek operations for smooth performance

### Bundle Size
- Component size: ~15KB (minified + gzipped)
- Dependencies: Material-UI, Lucide React, date-fns
- No additional audio libraries required

## 🔄 Migration Guide

### From Basic Audio Messages
1. Replace `<audio>` elements with `<VoiceMessageBubble>`
2. Update message type detection to use the new component
3. Add required props (audioUrl, filename, isOwn, timestamp)
4. Test playback functionality

### From EnhancedMessageBubble
1. Import `EnhancedMessageBubbleV2`
2. Replace the existing component
3. Update any custom styling
4. Test voice message rendering

## 📚 Examples

### Basic Voice Message
```tsx
<VoiceMessageBubble
  audioUrl="https://example.com/voice-message.mp3"
  filename="Voice Message.mp3"
  isOwn={true}
  timestamp="2:34 PM"
/>
```

### With All Features
```tsx
<VoiceMessageBubble
  audioUrl="https://example.com/voice-message.mp3"
  filename="Voice Message.mp3"
  duration={165} // 2:45
  fileSize={2048000} // 2MB
  isOwn={false}
  timestamp="2:34 PM"
  onDownload={() => downloadFile(audioUrl)}
  onForward={() => forwardMessage(messageId)}
  onDelete={() => deleteMessage(messageId)}
/>
```

### In Message List
```tsx
{messages.map(message => (
  message.type === 'audio' ? (
    <VoiceMessageBubble
      key={message.id}
      audioUrl={message.media[0].url}
      filename={message.media[0].filename}
      isOwn={message.isOwn}
      timestamp={formatTime(message.createdAt)}
      onDownload={() => handleDownload(message)}
      onForward={() => handleForward(message)}
      onDelete={message.isOwn ? () => handleDelete(message.id) : undefined}
    />
  ) : (
    <RegularMessageBubble key={message.id} message={message} />
  )
))}
```

## 🐛 Troubleshooting

### Common Issues

**Audio not playing**
- Check CORS headers for audio files
- Verify audio format support
- Test with different browsers

**Waveform not displaying**
- Ensure component is properly mounted
- Check for JavaScript errors
- Verify waveform data generation

**Performance issues**
- Limit concurrent audio playback
- Implement proper cleanup
- Use audio optimization endpoints

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 📄 License

This component is part of the TalkCart project and follows the same licensing terms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the demo page for examples
- Review the API documentation

---

**Happy coding! 🎉**
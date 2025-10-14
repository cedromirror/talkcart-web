# PostCard Component Documentation

## Overview
The PostCard component is a core UI element in the TalkCart social feed that displays user posts with media, engagement metrics, and interactive controls.

## Component Structure

### Main Container
- Full-height card with proper aspect ratio
- Responsive design for all screen sizes
- Smooth transitions and animations

### Media Display
- Video player with play/pause overlay
- Image display with proper scaling
- Error handling for broken media

### User Information
- Avatar with verification badge
- Username and display name
- Follow/unfollow functionality

### Engagement Metrics
- Like count with interactive button
- Comment count with navigation
- Share count with sharing options
- Bookmark functionality

### Action Controls
- Vertical action button layout (TikTok-style)
- Tooltips for all actions
- Keyboard navigation support

## Props

### PostCardProps
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `post` | `Post` | Yes | The post data to display |
| `onBookmark` | `(postId: string) => void` | No | Callback when bookmark button is clicked |
| `onLike` | `(postId: string) => void` | No | Callback when like button is clicked |
| `onShare` | `(postId: string) => void` | No | Callback when share button is clicked |
| `onComment` | `(postId: string) => void` | No | Callback when comment button is clicked |

### Post Interface
```typescript
interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
  };
  createdAt: string;
  media?: PostMedia[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount?: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  isShared?: boolean;
  privacy?: 'public' | 'followers' | 'private';
  hashtags?: string[];
  mentions?: string[];
  type?: 'text' | 'image' | 'video';
  views?: number;
}
```

## Features

### Media Handling
- **Video Support**: HTML5 video player with custom controls
- **Image Support**: Responsive image display with optimization
- **Error Handling**: Graceful fallback for broken media
- **Loading States**: Skeleton loaders during media loading

### Interactivity
- **Like Button**: Toggle like status with animation
- **Comment Button**: Navigate to comment section
- **Share Button**: Open sharing options
- **Bookmark Button**: Save posts for later
- **Follow Button**: Follow/unfollow post author

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Reduced Motion**: Respects user preferences

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Touch Targets**: Adequate sizing for touch interaction
- **Adaptive Layout**: Adjusts to different screen sizes
- **Performance**: Optimized rendering and animations

## Styling

### Color Scheme
- Dark theme optimized for media consumption
- High contrast for text overlays
- Brand colors for interactive elements
- Transparent backgrounds for UI elements

### Responsive Design
- Flexible container that adapts to screen size
- Properly sized touch targets
- Adaptive text sizing
- Mobile-first approach

### Animations
- Smooth hover effects
- Transition animations
- Loading skeletons
- Interactive feedback

## Usage Examples

### Basic Usage
```tsx
import { PostCard } from '@/components/social/PostCard';

const MyComponent = () => {
  const post = {
    id: '1',
    content: 'Hello World!',
    author: {
      id: 'user1',
      username: 'john_doe',
      displayName: 'John Doe',
      isVerified: true
    },
    createdAt: '2023-01-01T00:00:00Z',
    likeCount: 10,
    commentCount: 5,
    shareCount: 2,
    isLiked: false,
    type: 'text'
  };

  return (
    <PostCard 
      post={post}
      onLike={(postId) => console.log('Liked post:', postId)}
      onComment={(postId) => console.log('Comment on post:', postId)}
    />
  );
};
```

### With Media
```tsx
const postWithMedia = {
  ...post,
  media: [
    {
      id: 'media1',
      resource_type: 'image',
      secure_url: 'https://example.com/image.jpg',
      format: 'jpg',
      width: 1080,
      height: 1920
    }
  ],
  type: 'image'
};

<PostCard post={postWithMedia} />
```

## Error Handling

### Media Loading Errors
- Displays placeholder when images fail to load
- Shows error message for videos that can't play
- Graceful degradation for missing media

### Network Errors
- Handles API errors gracefully
- Displays user-friendly error messages
- Provides retry mechanisms

## Performance Optimizations

### Rendering
- Virtualized lists for feed performance
- Lazy loading for media content
- Memoization of expensive calculations
- Efficient re-rendering

### Memory Management
- Cleanup of event listeners
- Proper disposal of video elements
- Memory leak prevention

## Testing

### Unit Tests
- Test rendering with different post types
- Test interaction handlers
- Test error states
- Test accessibility features

### Integration Tests
- Test with real API data
- Test media loading scenarios
- Test user interactions

## Future Enhancements

Potential future enhancements could include:
- Poll support
- GIF support
- Live streaming integration
- Enhanced analytics
- Dark mode support
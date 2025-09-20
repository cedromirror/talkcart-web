# Complete Profile Editing System

This document describes the comprehensive profile editing system implemented for TalkCart, including profile picture and cover photo upload functionality.

## 🚀 Features

### Profile Editing Dialog
- **Complete form validation** with real-time error feedback
- **Responsive design** that works on mobile and desktop
- **Unsaved changes warning** to prevent accidental data loss
- **Loading states** and proper error handling
- **Character counters** for text fields
- **URL validation** for website field

### Profile Picture Upload
- **Drag & drop support** for easy file selection
- **Image cropping** with adjustable crop area
- **Zoom and rotation** controls for perfect positioning
- **Real-time preview** of changes
- **File size validation** (max 15MB)
- **Format validation** (images only)
- **Remove picture** functionality
- **Error boundary** for graceful error handling

### Cover Photo Upload
- **Aspect ratio enforcement** (5:1 for cover photos)
- **Advanced cropping tools** with zoom and rotation
- **Visual editing controls** with sliders and buttons
- **Larger file size support** (max 20MB)
- **Remove cover** functionality
- **Overlay controls** positioned on the cover area

### Profile Display
- **Modern card-based layout** with cover photo and avatar
- **Responsive design** that adapts to screen size
- **Social stats display** (followers, following, posts)
- **Profile information** (bio, location, website, join date)
- **Action buttons** (follow, message, edit profile)
- **Share profile** functionality
- **Tabbed content** (posts, media, videos, liked, saved)

## 📁 File Structure

```
src/components/profile/
├── EditProfileDialog.tsx          # Main profile editing dialog
├── ProfilePictureUpload.tsx       # Profile picture upload component
├── CoverPhotoUpload.tsx          # Cover photo upload component
├── ProfileHeader.tsx             # Profile header display component
├── ProfilePage.tsx               # Complete profile page component
└── UserCard.tsx                  # Existing user card component

src/components/posts/
└── PostGrid.tsx                  # Grid display for user posts

src/components/media/
└── MediaGrid.tsx                 # Grid display for user media

src/pages/profile/
├── [username].tsx                # Dynamic user profile page
└── index.tsx                     # Current user profile page

src/pages/
└── test-profile-edit.tsx         # Test page for profile editing
```

## 🔧 API Integration

### Backend Endpoints Used
- `PUT /api/auth/profile` - Update user profile
- `POST /api/media/upload/profile-picture` - Upload profile picture
- `POST /api/media/upload/single` - Upload cover photo
- `DELETE /api/auth/profile/cover` - Remove cover photo
- `GET /api/users/profile/:username` - Get user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user

### Frontend API Methods
```typescript
// Profile management
api.auth.updateProfile(data)
api.users.getByUsername(username)
api.users.follow(userId)
api.users.unfollow(userId)

// Media upload
api.media.upload(file, type)
api.media.getUserMedia(userId, params)

// Posts and content
api.posts.getUserPosts(userId, params)
api.posts.getLikedPosts(page)
api.posts.getSavedPosts(page)
```

## 🎨 UI Components

### EditProfileDialog
```typescript
interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdated: (updatedUser: User) => void;
}
```

**Features:**
- Form validation with error states
- Character limits and counters
- URL validation for website field
- Unsaved changes warning
- Loading states during submission
- Success/error feedback

### ProfilePictureUpload
```typescript
interface ProfilePictureUploadProps {
  user: User | null;
  onUploadSuccess: (avatarUrl: string) => void;
  size?: number;
  showUploadButton?: boolean;
  allowRemove?: boolean;
  disabled?: boolean;
}
```

**Features:**
- Drag & drop file selection
- Image cropping with ReactCrop
- Zoom and rotation controls
- File validation (type, size)
- Error boundary protection
- Remove functionality

### CoverPhotoUpload
```typescript
interface CoverPhotoUploadProps {
  user: User | null;
  onUploadSuccess: (coverUrl: string) => void;
  height?: number;
  disabled?: boolean;
  allowRemove?: boolean;
}
```

**Features:**
- 5:1 aspect ratio enforcement
- Advanced cropping tools
- Visual editing controls
- Overlay positioning
- Remove functionality

### ProfileHeader
```typescript
interface ProfileHeaderProps {
  user: User;
  currentUser?: User | null;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onMessage?: () => void;
  onProfileUpdated?: (updatedUser: User) => void;
  loading?: boolean;
}
```

**Features:**
- Responsive layout
- Social actions (follow, message)
- Profile sharing
- Stats display
- Edit profile integration

## 🔒 Security & Validation

### Client-Side Validation
- **File type validation** - Only images allowed
- **File size limits** - 15MB for avatars, 20MB for covers
- **Form field validation** - Required fields, character limits
- **URL validation** - Proper website URL format
- **Username validation** - Length, character restrictions

### Server-Side Integration
- **Authentication required** for all profile operations
- **File upload security** through Cloudinary
- **Profile ownership verification**
- **Rate limiting** on upload endpoints

## 📱 Responsive Design

### Mobile Optimizations
- **Full-screen dialogs** on mobile devices
- **Touch-friendly controls** for cropping
- **Optimized image sizes** for mobile
- **Simplified layouts** for small screens
- **Gesture support** for image manipulation

### Desktop Features
- **Modal dialogs** with backdrop
- **Hover effects** and tooltips
- **Keyboard navigation** support
- **Drag & drop** file selection
- **Advanced cropping tools**

## 🚀 Usage Examples

### Basic Profile Editing
```typescript
import EditProfileDialog from '@/components/profile/EditProfileDialog';

const MyComponent = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user, updateUser } = useAuth();

  const handleProfileUpdated = (updatedUser: User) => {
    updateUser(updatedUser);
    setDialogOpen(false);
  };

  return (
    <EditProfileDialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      user={user}
      onProfileUpdated={handleProfileUpdated}
    />
  );
};
```

### Profile Picture Upload
```typescript
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';

const ProfileComponent = () => {
  const { user, updateUser } = useAuth();

  const handleAvatarUpload = (avatarUrl: string) => {
    updateUser({ ...user, avatar: avatarUrl });
  };

  return (
    <ProfilePictureUpload
      user={user}
      onUploadSuccess={handleAvatarUpload}
      size={120}
      allowRemove={true}
    />
  );
};
```

### Complete Profile Page
```typescript
import ProfilePage from '@/components/profile/ProfilePage';

const UserProfile = () => {
  const router = useRouter();
  const { username } = router.query;

  return (
    <ProfilePage 
      username={username as string}
    />
  );
};
```

## 🧪 Testing

### Test Page
Visit `/test-profile-edit` to test the profile editing functionality with:
- Mock user data for non-logged-in users
- All profile editing features
- Error handling scenarios
- Responsive design testing

### Manual Testing Checklist
- [ ] Profile picture upload and cropping
- [ ] Cover photo upload and cropping
- [ ] Form validation for all fields
- [ ] Unsaved changes warning
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Loading states
- [ ] Success feedback

## 🔄 Future Enhancements

### Planned Features
- **Bulk media upload** for multiple files
- **Profile themes** and customization
- **Advanced privacy settings**
- **Profile verification badges**
- **Social media link integration**
- **Profile analytics** and insights

### Performance Optimizations
- **Image compression** before upload
- **Progressive loading** for large images
- **Caching strategies** for profile data
- **Lazy loading** for profile content
- **CDN optimization** for media delivery

## 📚 Dependencies

### Required Packages
```json
{
  "@mui/material": "^5.x.x",
  "@mui/icons-material": "^5.x.x",
  "react-image-crop": "^10.x.x",
  "react-hot-toast": "^2.x.x",
  "date-fns": "^2.x.x",
  "lucide-react": "^0.x.x"
}
```

### Peer Dependencies
- React 18+
- Next.js 13+
- TypeScript 4.9+

## 🐛 Troubleshooting

### Common Issues
1. **Upload fails** - Check file size and format
2. **Cropping not working** - Ensure image loads completely
3. **Form validation errors** - Check required fields
4. **Mobile layout issues** - Test on actual devices
5. **API errors** - Check network and authentication

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'profile:*');
```

This comprehensive profile editing system provides a complete solution for user profile management with modern UI/UX patterns, robust error handling, and mobile-first responsive design.
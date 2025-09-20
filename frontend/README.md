# TalkCart Frontend

A modern, scalable frontend application built with Next.js 14, TypeScript, and Material-UI v6.

## 🏗️ Architecture Overview

### Directory Structure

```
frontend/
├── pages/                    # Next.js Pages Router
│   ├── _app.tsx             # App wrapper with providers
│   ├── index.tsx            # Landing page
│   ├── auth/                # Authentication pages
│   └── social/              # Social media pages
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Basic UI components
│   │   ├── layout/          # Layout components
│   │   ├── auth/            # Authentication components
│   │   ├── social/          # Social media components
│   │   ├── marketplace/     # E-commerce components
│   │   ├── streaming/       # Live streaming components
│   │   ├── dao/             # DAO governance components
│   │   └── common/          # Shared components
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── ThemeContext.tsx # Theme and accessibility
│   ├── hooks/               # Custom React hooks
│   │   ├── useApi.ts        # API query hooks
│   │   └── useSafeAuth.ts   # Safe auth hook
│   ├── lib/                 # Core utilities
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Auth utilities
│   │   └── constants.ts     # App constants
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   │   ├── format.ts        # Formatting utilities
│   │   └── validation.ts    # Validation functions
│   └── services/            # External services
├── styles/
│   └── globals.css          # Global styles
└── public/                  # Static assets
```

## 🚀 Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **UI Library**: Material-UI v6
- **Styling**: Tailwind CSS v3 + Emotion
- **State Management**: React Query + Context API
- **Authentication**: JWT with refresh tokens
- **Icons**: Lucide React + Material Icons
- **Forms**: React Hook Form (when needed)
- **Date Handling**: date-fns
- **Animations**: Framer Motion

## 🔧 Key Features

### Modern Architecture
- **Feature-based organization**: Components grouped by domain
- **Custom hooks**: Reusable logic with React Query
- **Type safety**: Full TypeScript coverage
- **Error boundaries**: Graceful error handling
- **Loading states**: Consistent loading UX

### Backend Integration
- **Comprehensive API client**: All backend endpoints covered
- **Query caching**: Efficient data fetching with React Query
- **Optimistic updates**: Immediate UI feedback
- **Error handling**: Robust error management
- **File uploads**: Progress tracking and error recovery

### User Experience
- **Responsive design**: Mobile-first approach
- **Dark/light themes**: System preference detection
- **Accessibility**: WCAG 2.1 compliance
- **Performance**: Code splitting and optimization
- **PWA ready**: Service worker support

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend server running on port 8000

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm test` - Run tests

## 📁 Component Organization

### UI Components (`src/components/ui/`)
Basic, reusable UI components:
- `LoadingSpinner` - Loading indicators
- `ErrorMessage` - Error display
- `EmptyState` - Empty state handling

### Layout Components (`src/components/layout/`)
Page layout and structure:
- `AppLayout` - Main application layout
- `Navigation` - Navigation components
- `Sidebar` - Sidebar components

### Feature Components
Domain-specific components organized by feature:
- `auth/` - Login, register, profile
- `social/` - Posts, comments, feed
- `marketplace/` - Products, cart, orders
- `streaming/` - Live streams, chat
- `dao/` - Proposals, voting

## 🔌 API Integration

### Custom Hooks (`src/hooks/useApi.ts`)
Pre-built hooks for all backend endpoints:

```typescript
// Users
const { data: users } = useUsers();
const { data: user } = useUser(userId);
const followMutation = useFollowUser();

// Posts
const { data: posts } = usePosts();
const createPostMutation = useCreatePost();
const likeMutation = useLikePost();

// Comments
const { data: comments } = useComments(postId);
const createCommentMutation = useCreateComment();
```

### Query Key Management
Consistent cache invalidation with organized query keys:

```typescript
export const queryKeys = {
  users: {
    all: (params?: any) => ['users', 'all', params],
    byId: (id: string) => ['users', 'byId', id],
  },
  posts: {
    all: (params?: any) => ['posts', 'all', params],
    byId: (id: string) => ['posts', 'byId', id],
  },
};
```

## 🎨 Styling Approach

### Tailwind CSS for Layout
Use Tailwind for spacing, layout, and responsive design:
```tsx
<div className="flex flex-col gap-4 p-6 max-w-2xl mx-auto">
```

### Material-UI for Components
Use MUI components with theme integration:
```tsx
<Button variant="contained" color="primary">
  Submit
</Button>
```

### Custom Styled Components
For complex styling needs:
```tsx
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
}));
```

## 🔐 Authentication Flow

1. **Login/Register**: JWT tokens stored securely
2. **Auto-refresh**: Automatic token renewal
3. **Route protection**: Protected routes redirect to login
4. **Logout**: Clean token removal and redirect

## 🌙 Theme System

### Theme Modes
- Light mode
- Dark mode  
- System preference

### Accessibility Features
- High contrast mode
- Reduced motion support
- Font size scaling
- Keyboard navigation

## 📱 Responsive Design

### Breakpoints
- Mobile: 0-767px
- Tablet: 768-1023px
- Desktop: 1024px+

### Mobile-First Approach
All components designed for mobile first, then enhanced for larger screens.

## 🚀 Performance Optimizations

- **Code splitting**: Automatic route-based splitting
- **Image optimization**: Next.js Image component
- **Bundle analysis**: Webpack bundle analyzer
- **Caching**: React Query caching strategy
- **Lazy loading**: Component lazy loading

## 🧪 Testing Strategy

- **Unit tests**: Component testing with Jest
- **Integration tests**: API integration testing
- **E2E tests**: User flow testing
- **Accessibility tests**: WCAG compliance testing

## 📦 Deployment

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.talkcart.app
NEXT_PUBLIC_APP_URL=https://talkcart.app
```

### Build Optimization
- Static generation where possible
- API route optimization
- Asset optimization
- Bundle size monitoring

## 🤝 Contributing

1. Follow the established directory structure
2. Use TypeScript for all new code
3. Add proper error handling
4. Include loading states
5. Write tests for new features
6. Follow accessibility guidelines

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/)
- [React Query Documentation](https://tanstack.com/query)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
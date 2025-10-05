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
- `npm run fix-permissions` - Fix Windows EPERM errors
- `npm run dev:clean` - Clean build and start development server

### Windows EPERM Error Fix

If you encounter the following error on Windows:
```
uncaughtException [Error: EPERM: operation not permitted, open 'D:\talkcart\frontend\.next\trace']
```

Run the permission fix script:
```bash
npm run fix-permissions
```

This will clean the .next directory and fix file permission issues.

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
- `marketplace/` - Products, orders
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
```

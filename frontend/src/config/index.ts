// API Configuration
// Use proxy in browser for same-origin requests, direct URL for server-side
export const API_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');

// Authentication Configuration
export const AUTH_TOKEN_KEY = 'token';
export const AUTH_REFRESH_TOKEN_KEY = 'refreshToken';
export const AUTH_USER_KEY = 'user';

// Avatar Configuration
export const DEFAULT_AVATAR_URL = '/images/default-avatar.png';

// Socket Configuration
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

// WebRTC Configuration
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  // Add TURN servers for production (requires credentials)
  // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
];

// Feature Flags
export const FEATURES = {
  MESSAGING: true,
  SOCIAL: true,
  MARKETPLACE: true, // ✅ Fully functional marketplace with crypto & fiat payments
  STREAMING: true, // ✅ Fully functional with WebRTC P2P
  DAO: false,
  NFT: false,
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'TalkCart',
  DESCRIPTION: 'Web3 Social Platform',
  VERSION: '1.0.0',
  THEME_KEY: 'theme',
  DEFAULT_THEME: 'light',
};

// Network Configuration
export const NETWORK_CONFIG = {
  CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '1',
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.infura.io/v3/your-infura-key',
  BLOCK_EXPLORER: process.env.NEXT_PUBLIC_BLOCK_EXPLORER || 'https://etherscan.io',
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MESSAGES_LIMIT: 50,
  POSTS_LIMIT: 10,
};

// Timeout Configuration
export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  AUTH_REQUEST: 15000, // 15 seconds
  UPLOAD: 120000, // 2 minutes
  WEBSOCKET_CONNECT: 10000, // 10 seconds
};

// Media Configuration
export const MEDIA_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  REGISTER: 'Account created successfully!',
  PROFILE_UPDATE: 'Profile updated successfully!',
  PASSWORD_RESET: 'Password reset successfully!',
  MESSAGE_SENT: 'Message sent successfully!',
};

// Additional Timeouts
export const UI_TIMEOUTS = {
  TOAST: 5000,
  TYPING_INDICATOR: 3000,
  DEBOUNCE: 300,
  SESSION: 60 * 60 * 1000, // 1 hour
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  MESSAGES: '/messages',
  SOCIAL: '/social',
  MARKETPLACE: '/marketplace',
  STREAMS: '/streams',
  DAO: '/dao',
  NFTS: '/nfts',
};
import { io } from 'socket.io-client';
import config from '@/config';

const initializeSocket = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token available for socket connection');
    return null;
  }
  
  // Try different authentication methods to ensure compatibility with server
  const socket = io(config.api.socketUrl, {
    // Method 1: Auth object
    auth: {
      token: token
    },
    // Method 2: Query parameters
    query: {
      token: token
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    // Add extra headers for authentication
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
  
  socket.on('connect', () => {
    console.log('Socket connected successfully');
    
    // Authenticate immediately after connection if needed
    socket.emit('authenticate', { token: token }, (response) => {
      if (response.success) {
        console.log('Socket authenticated successfully');
      } else {
        console.error('Socket authentication failed:', response.message);
      }
    });
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      // Try to refresh the token
      refreshAuthToken().then(newToken => {
        if (newToken) {
          console.log('Token refreshed, reconnecting socket...');
          socket.disconnect();
          // Reconnect will use the new token from localStorage
          socket.connect();
        }
      });
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    
    if (reason === 'io server disconnect') {
      socket.connect();
    }
  });
  
  return socket;
};

// Helper function to refresh the authentication token
const refreshAuthToken = async () => {
  try {
    // Import dynamically to avoid circular dependencies
    const api = (await import('@/lib/api')).default;
    
    const response = await api.auth.refreshToken();
    if (response && response.success && response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
      return response.data.token;
    }
    return null;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
};

export default initializeSocket;
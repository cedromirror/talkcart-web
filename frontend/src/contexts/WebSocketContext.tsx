import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '@/config';
import toast from 'react-hot-toast';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  // Stream functionality removed
  offModerationAction: (callback: (data: ModerationActionData) => void) => void;
  // Post functionality
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  onPostLikeUpdate: (callback: (data: PostLikeUpdateData) => void) => () => void;
  onPostShareUpdate: (callback: (data: PostShareUpdateData) => void) => () => void;
  onPostUpdate: (callback: (data: PostUpdateData) => void) => () => void;
  // Marketplace functionality
  joinMarketplace: () => void;
  leaveMarketplace: () => void;
  joinProduct: (productId: string) => void;
  leaveProduct: (productId: string) => void;
  onProductUpdate: (callback: (data: any) => void) => () => void;
  onProductSale: (callback: (data: any) => void) => () => void;
  onProductViewUpdate: (callback: (data: any) => void) => () => void;
  onNewProduct: (callback: (data: any) => void) => () => void;
}

interface ChatMessageData {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  message: string;
  timestamp: string;
  type: 'message' | 'gift' | 'follow' | 'subscription' | 'system';
  isStreamer?: boolean;
  isModerator?: boolean;
  isVerified?: boolean;
  giftData?: {
    giftType: string;
    emoji: string;
    value: number;
  };
}

interface ViewerUpdateData {
  streamId: string;
  viewerCount: number;
  peakViewerCount: number;
  viewers: Array<{
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    joinedAt: string;
  }>;
}

interface StreamUpdateData {
  streamId: string;
  isLive: boolean;
  title?: string;
  category?: string;
  health?: {
    status: string;
    bitrate: number;
    fps: number;
    quality: string;
    latency: number;
    droppedFrames: number;
  };
}

interface ModeratorAction {
  type: 'ban' | 'timeout' | 'delete_message' | 'pin_message' | 'slow_mode' | 'followers_only';
  targetUserId?: string;
  messageId?: string;
  duration?: number;
  reason?: string;
  enabled?: boolean;
}

interface ModerationActionData {
  streamId: string;
  action: ModeratorAction;
  moderatorId: string;
  moderatorUsername: string;
  timestamp: string;
}

interface PostLikeUpdateData {
  postId: string;
  likeCount: number;
  isLiked: boolean;
  userId: string;
}

interface PostShareUpdateData {
  postId: string;
  shareCount: number;
  userId: string;
}

interface PostUpdateData {
  postId: string;
  type: 'like' | 'share' | 'comment' | 'view';
  data: any;
}

interface PostLikeUpdateData {
  postId: string;
  type: 'like_update';
  action: 'like' | 'unlike';
  likeCount: number;
  isLiked: boolean;
  userId: string;
  timestamp: string;
}

interface PostShareUpdateData {
  postId: string;
  type: 'share_update';
  action: 'share';
  shareCount: number;
  userId: string;
  platform: string;
  timestamp: string;
}

interface PostUpdateData {
  postId: string;
  type: string;
  likeCount?: number;
  shareCount?: number;
  timestamp: string;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const joinedPostsRef = useRef<Set<string>>(new Set());

  const initializeSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    console.log('🔍 WebSocket initialization - Token check:', token ? 'Token found' : 'No token found');
    if (!token) {
      console.log('❌ WebSocket initialization aborted - No token in localStorage');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Authenticate socket connection
      const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id ||
        JSON.parse(localStorage.getItem('user') || '{}')?._id;
      if (userId) {
        newSocket.emit('authenticate', { userId });
      }

      // Rejoin all previously joined post rooms
      joinedPostsRef.current.forEach(postId => {
        newSocket.emit('join-post', { postId });
      });

      toast.success('Connected to live updates', { duration: 2000 });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        handleReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('Error details:', error.message);
      setIsConnected(false);
      handleReconnect();
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error occurred');
    });

    setSocket(newSocket);

    return newSocket;
  }, []);

  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      toast.error('Failed to connect to live updates');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      initializeSocket();
    }, delay);
  }, [initializeSocket]);

  useEffect(() => {
    initializeSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initializeSocket]);

  const joinStream = useCallback((streamId: string) => {
    if (socket && isConnected) {
      socket.emit('join-stream', streamId);
      console.log('Joined stream:', streamId);
    }
  }, [socket, isConnected]);

  const leaveStream = useCallback((streamId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-stream', streamId);
      console.log('Left stream:', streamId);
    }
  }, [socket, isConnected]);

  const sendChatMessage = useCallback((streamId: string, message: string) => {
    if (socket && isConnected) {
      // Prefer server's 'stream-chat' event; keep legacy for compatibility
      socket.emit('stream-chat', { streamId, message });
      socket.emit('chat_message', { streamId, message });
    }
  }, [socket, isConnected]);

  const sendModeratorAction = useCallback((streamId: string, action: ModeratorAction) => {
    if (socket && isConnected) {
      socket.emit('moderator_action', { streamId, action });
    }
  }, [socket, isConnected]);

  const onChatMessage = useCallback((callback: (data: ChatMessageData) => void) => {
    if (!socket) return;
    // Support multiple server event names
    const handlerLegacy = (data: any) => callback(data as ChatMessageData);
    const handlerNew = (data: any) => callback(data as ChatMessageData);
    const handlerStream = (data: any) => callback(data as ChatMessageData);
    socket.on('chat_message', handlerLegacy);
    socket.on('chat:new-message', handlerNew);
    socket.on('stream-chat', handlerStream);
  }, [socket]);

  const onViewerUpdate = useCallback((callback: (data: ViewerUpdateData) => void) => {
    if (!socket) return;
    // Primary event
    socket.on('viewer_update', callback);
    // Compatibility with legacy event name emitted by server
    socket.on('stream-viewers-update', (data: any) => {
      callback({
        streamId: data.streamId,
        viewerCount: data.viewerCount,
        peakViewerCount: data.peakViewerCount,
        viewers: [],
      } as ViewerUpdateData);
    });
  }, [socket]);

  const onStreamUpdate = useCallback((callback: (data: StreamUpdateData) => void) => {
    if (!socket) return;
    // Primary generic update channel
    socket.on('stream_update', callback);
    // Map specific server events into the unified stream update callback
    socket.on('stream-stopped', (data: any) => {
      callback({ streamId: data.streamId, isLive: false } as StreamUpdateData);
    });
    socket.on('stream-started', (data: any) => {
      callback({ streamId: data.streamId, isLive: true } as StreamUpdateData);
    });
    socket.on('stream-health', (data: any) => {
      callback({ streamId: data.streamId, isLive: true, health: data.health } as any);
    });
    socket.on('stream-data', (data: any) => {
      callback({ streamId: data.streamId, isLive: !!data.isLive, health: data.health } as any);
    });
  }, [socket]);

  // Stream moderation events emitted by backend routes via broadcastToFeed
  const onModerationAction = useCallback((callback: (data: any) => void) => {
    if (!socket) return;
    const handlerBan = (data: any) => callback({ streamId: data.streamId, action: { type: 'ban' }, moderatorName: 'system', timestamp: new Date().toISOString(), ...data });
    const handlerUnban = (data: any) => callback({ streamId: data.streamId, action: { type: 'unban' as any }, moderatorName: 'system', timestamp: new Date().toISOString(), ...data });
    const handlerTimeout = (data: any) => callback({ streamId: data.streamId, action: { type: 'timeout' }, moderatorName: 'system', timestamp: new Date().toISOString(), ...data });
    socket.on('moderation:ban', handlerBan);
    socket.on('moderation:unban', handlerUnban);
    socket.on('moderation:timeout', handlerTimeout);
  }, [socket]);

  const offModerationAction = useCallback((callback: (data: any) => void) => {
    if (!socket) return;
    // We cannot reliably remove composed handlers provided above using 'callback'
    // Provide a global off for known events
    socket.off('moderation:ban');
    socket.off('moderation:unban');
    socket.off('moderation:timeout');
  }, [socket]);

  const offChatMessage = useCallback((callback: (data: ChatMessageData) => void) => {
    if (!socket) return;
    // Remove by event name; handlers are simple pass-throughs
    socket.off('chat_message');
    socket.off('chat:new-message');
    socket.off('stream-chat');
  }, [socket]);

  const offViewerUpdate = useCallback((callback: (data: ViewerUpdateData) => void) => {
    if (!socket) return;
    socket.off('viewer_update', callback);
    // Remove any legacy event listeners we may have attached
    socket.off('stream-viewers-update');
  }, [socket]);

  const offStreamUpdate = useCallback((callback: (data: StreamUpdateData) => void) => {
    if (!socket) return;
    socket.off('stream_update', callback);
    // Also remove mapped event listeners
    socket.off('stream-stopped');
    socket.off('stream-started');
    socket.off('stream-health');
    socket.off('stream-data');
  }, [socket]);



  // Post functionality
  const joinPost = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('join-post', { postId });
      joinedPostsRef.current.add(postId);
      console.log('Joined post room:', postId);
    }
  }, [socket, isConnected]);

  const leavePost = useCallback((postId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-post', { postId });
      joinedPostsRef.current.delete(postId);
      console.log('Left post room:', postId);
    }
  }, [socket, isConnected]);

  const onPostLikeUpdate = useCallback((callback: (data: PostLikeUpdateData) => void) => {
    if (!socket) return () => { };

    const handler = (data: PostLikeUpdateData) => {
      console.log('Received post like update:', data);
      callback(data);
    };

    socket.on('post-like-updated', handler);

    return () => {
      socket.off('post-like-updated', handler);
    };
  }, [socket]);

  const onPostShareUpdate = useCallback((callback: (data: PostShareUpdateData) => void) => {
    if (!socket) return () => { };

    const handler = (data: PostShareUpdateData) => {
      console.log('Received post share update:', data);
      callback(data);
    };

    socket.on('post-share-updated', handler);

    return () => {
      socket.off('post-share-updated', handler);
    };
  }, [socket]);

  const onPostUpdate = useCallback((callback: (data: PostUpdateData) => void) => {
    if (!socket) return () => { };

    const handler = (data: PostUpdateData) => {
      console.log('Received post update:', data);
      callback(data);
    };

    socket.on('post-updated', handler);

    return () => {
      socket.off('post-updated', handler);
    };
  }, [socket]);

  // Marketplace functionality
  const joinMarketplace = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('join-marketplace');
      console.log('Joined marketplace for real-time updates');
    }
  }, [socket, isConnected]);

  const leaveMarketplace = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('leave-marketplace');
      console.log('Left marketplace');
    }
  }, [socket, isConnected]);

  const joinProduct = useCallback((productId: string) => {
    if (socket && isConnected) {
      socket.emit('join-product', { productId });
      console.log(`Joined product ${productId} for real-time updates`);
    }
  }, [socket, isConnected]);

  const leaveProduct = useCallback((productId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-product', { productId });
      console.log(`Left product ${productId}`);
    }
  }, [socket, isConnected]);

  const onProductUpdate = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('product:updated', callback);
    return () => socket.off('product:updated', callback);
  }, [socket]);

  const onProductSale = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('product:sold', callback);
    return () => socket.off('product:sold', callback);
  }, [socket]);

  const onProductViewUpdate = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('product:view-update', callback);
    return () => socket.off('product:view-update', callback);
  }, [socket]);

  const onNewProduct = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('product:new', callback);
    return () => socket.off('product:new', callback);
  }, [socket]);

  // Admin/refund helpers
  const joinAdmin = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('join-admin');
    }
  }, [socket, isConnected]);

  const onRefundSubmitted = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('refund:submitted', callback);
    return () => socket.off('refund:submitted', callback);
  }, [socket]);

  const onRefundFailed = useCallback((callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('refund:failed', callback);
    return () => socket.off('refund:failed', callback);
  }, [socket]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    // Stream functionality
    joinStream,
    leaveStream,
    sendChatMessage,
    sendModeratorAction,
    onChatMessage,
    onViewerUpdate,
    onStreamUpdate,
    onModerationAction,
    offModerationAction,
    offChatMessage,
    offViewerUpdate,
    offStreamUpdate,
    // Post functionality
    joinPost,
    leavePost,
    onPostLikeUpdate,
    onPostShareUpdate,
    onPostUpdate,
    // Marketplace functionality
    joinMarketplace,
    leaveMarketplace,
    joinProduct,
    leaveProduct,
    onProductUpdate,
    onProductSale,
    onProductViewUpdate,
    onNewProduct,
    // Expose admin/refund events (cast to any to avoid type expansion here)
    ...({ joinAdmin, onRefundSubmitted, onRefundFailed } as any),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
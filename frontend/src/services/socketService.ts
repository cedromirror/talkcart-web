import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Record<string, Function[]> = {};
  private userId: string | null = null;
  private activeConversationId: string | null = null;

  // Connect to socket server
  connect(token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId;

        this.socket = io(SOCKET_URL, {
          auth: {
            token
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('Socket connected');

          // Authenticate socket connection
          this.socket?.emit('authenticate', { userId });

          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });

        // Set up event listeners
        this.setupEventListeners();

      } catch (error) {
        console.error('Socket initialization error:', error);
        reject(error);
      }
    });
  }

  // Disconnect from socket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners = {};
    }
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Set up event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // New message received
    this.socket.on('message:new', (data) => {
      this.emit('message:new', data);
    });

    // Message updated
    this.socket.on('message:update', (data) => {
      this.emit('message:update', data);
    });

    // Message edited
    this.socket.on('message:edited', (data) => {
      this.emit('message:edited', data);
    });

    // Message deleted
    this.socket.on('message:delete', (data) => {
      this.emit('message:delete', data);
    });

    // Message reaction
    this.socket.on('message:reaction', (data) => {
      this.emit('message:reaction', data);
    });

    // Message read
    this.socket.on('message:read', (data) => {
      this.emit('message:read', data);
    });

    // Typing indicator
    this.socket.on('typing', (data) => {
      this.emit('typing', data);
    });

    // New conversation
    this.socket.on('conversation:new', (data) => {
      this.emit('conversation:new', data);
    });

    // Conversation updated
    this.socket.on('conversation:update', (data) => {
      this.emit('conversation:update', data);
    });

    // User online status
    this.socket.on('user:status', (data) => {
      this.emit('user:status', data);
    });
  }

  // Send a message
  sendMessage(conversationId: string, message: any): void {
    if (!this.socket) return;

    this.socket.emit('message:send', {
      conversationId,
      message
    });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket) return;

    this.socket.emit('typing', {
      conversationId,
      isTyping
    });

    console.log('Sent typing indicator:', { conversationId, isTyping });
  }

  // Mark message as read
  markMessageAsRead(messageId: string): void {
    if (!this.socket) return;

    this.socket.emit('message:read', {
      messageId
    });
  }

  // Join a conversation room
  joinConversation(conversationId: string): void {
    if (!this.socket) return;

    this.activeConversationId = conversationId;

    this.socket.emit('join-conversation', {
      conversationId
    });

    console.log('Joined conversation:', conversationId);
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    if (!this.socket) return;

    this.socket.emit('leave-conversation', {
      conversationId
    });

    if (this.activeConversationId === conversationId) {
      this.activeConversationId = null;
    }

    console.log('Left conversation:', conversationId);
  }

  // Add event listener
  on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  // Remove event listener
  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;

    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // Emit event to listeners
  private emit(event: string, data: any): void {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
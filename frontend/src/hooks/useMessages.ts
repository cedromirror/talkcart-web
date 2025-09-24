import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import messageService, {
  ConversationData,
  MessageData,
  ConversationSettings
} from '@/services/messageApi';
import { getConversations } from '@/services/conversationApi';
import { Message } from '@/types/message';
import toast from 'react-hot-toast';

export interface UseMessagesReturn {
  conversations: ConversationData[];
  activeConversation: ConversationData | null;
  messages: MessageData[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  hasMore: boolean;
  typingUsers: Record<string, string[]>;
  searchResults: MessageData[];
  searching: boolean;
  totalUnread: number;

  // Sound controls
  soundsEnabled: boolean;
  toggleSounds: () => void;
  soundVolume: number;
  setSoundVolume: (v: number) => void;

  // Conversation actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (conversationId: string) => Promise<ConversationData | null>;
  createConversation: (participantIds: string[], isGroup?: boolean, groupName?: string, groupDescription?: string) => Promise<ConversationData | null>;
  setActiveConversation: (conversation: ConversationData | null) => void;
  updateConversationSettings: (settings: ConversationSettings) => Promise<boolean>;
  addGroupMembers: (memberIds: string[]) => Promise<boolean>;
  removeGroupMember: (memberId: string) => Promise<boolean>;

  // Message actions
  fetchMessages: (loadMore?: boolean) => Promise<void>;
  sendMessage: (content: string, type?: string, media?: any, replyTo?: string) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  forwardMessage: (messageId: string, conversationIds: string[], message?: string) => Promise<boolean>;
  searchMessages: (query: string) => Promise<{ messages: MessageData[]; total: number }>;
  sendTypingIndicator: (isTyping?: boolean) => void;
}

export const useMessages = (): UseMessagesReturn => {
  const { isAuthenticated, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [searchResults, setSearchResults] = useState<MessageData[]>([]);
  const [searching, setSearching] = useState(false);

  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const messageSoundRef = useRef<HTMLAudioElement | null>(null);
  const soundInitRef = useRef(false);

  // Sound notification controls
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('messages:soundsEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.6;
    const saved = localStorage.getItem('messages:soundVolume');
    const v = saved ? Number(saved) : 0.6;
    return isNaN(v) ? 0.6 : Math.min(1, Math.max(0, v));
  });

  const initMessageSound = useCallback(() => {
    if (typeof window === 'undefined' || soundInitRef.current) return;
    try {
      const audio = new Audio('/sounds/ringtone.wav');
      audio.preload = 'auto';
      audio.volume = soundVolume;
      audio.muted = true; // start muted to satisfy autoplay policies
      messageSoundRef.current = audio;

      // Unlock audio on first user gesture
      const unlock = async () => {
        if (!messageSoundRef.current) return;
        try {
          await messageSoundRef.current.play();
        } catch {}
        messageSoundRef.current.pause();
        messageSoundRef.current.currentTime = 0;
        messageSoundRef.current.muted = false;
        soundInitRef.current = true;
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };

      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    } catch (e) {
      console.debug('Init message sound failed:', e);
    }
  }, [soundVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (messageSoundRef.current) messageSoundRef.current.volume = soundVolume;
    localStorage.setItem('messages:soundVolume', String(soundVolume));
  }, [soundVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('messages:soundsEnabled', String(soundsEnabled));
    if (soundsEnabled) initMessageSound();
  }, [soundsEnabled, initMessageSound]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    initMessageSound();
    return () => {
      // listeners are once:true, this is just a safety cleanup
      // no-op cleanup handlers
    };
  }, [initMessageSound]);

  const playMessageSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!soundsEnabled) return;
    const audio = messageSoundRef.current;
    if (!audio) {
      try {
        const a = new Audio('/sounds/ringtone.wav');
        a.volume = soundVolume;
        a.play().catch(() => {});
      } catch {}
      return;
    }
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }, [soundsEnabled, soundVolume]);

  const toggleSounds = useCallback(() => setSoundsEnabled(v => !v), []);

  // Calculate total unread messages
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getConversations();
      setConversations(response.data.conversations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';

      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        setError('Authentication required. Please log in again.');
        // Trigger logout to clear invalid tokens
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      } else {
        setError(errorMessage);
      }

      console.error('Fetch conversations error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch a specific conversation by ID
  const fetchConversation = useCallback(async (conversationId: string): Promise<ConversationData | null> => {
    if (!isAuthenticated) return null;

    try {
      setLoading(true);
      setError(null);

      const conversation = await messageService.getConversation(conversationId);

      // Update in conversations list if it exists
      setConversations(prev => {
        const exists = (prev || []).some(c => c.id === conversation.id);
        if (exists) {
          return (prev || []).map(c => c.id === conversation.id ? conversation : c);
        } else {
          return [conversation, ...(prev || [])];
        }
      });

      return conversation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversation';
      setError(errorMessage);
      console.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Create a new conversation
  const createConversation = useCallback(async (
    participantIds: string[],
    isGroup = false,
    groupName?: string,
    groupDescription?: string
  ): Promise<ConversationData | null> => {
    if (!isAuthenticated) return null;

    try {
      setLoading(true);
      setError(null);

      const conversation = await messageService.createConversation(
        participantIds,
        isGroup,
        groupName,
        groupDescription
      );

      // Add to conversations list
      setConversations(prev => [conversation, ...prev]);

      return conversation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (loadMore = false) => {
    if (!isAuthenticated || !activeConversation) return;

    try {
      setLoading(true);
      setError(null);

      const currentPage = loadMore ? page + 1 : 1;
      const response = await messageService.getMessages(
        activeConversation.id,
        { page: currentPage }
      );

      const { messages: newMessages, pagination } = response.data;

      if (loadMore) {
        setMessages(prev => [...(prev || []), ...newMessages]);
      } else {
        setMessages(newMessages);
      }

      setPage(currentPage);
      setHasMore(pagination?.hasMore || currentPage < (pagination?.totalPages || 1));

      // Mark messages as read
      for (const message of newMessages) {
        if (message.senderId !== user?.id && !message.readBy?.some(read => read.userId === user?.id)) {
          await messageService.markAsRead(message.id);
        }
      }

      // Update unread count in conversations list
      if (newMessages.length > 0) {
        setConversations(prev =>
          (prev || []).map(conv =>
            conv.id === activeConversation.id
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeConversation, page]);

  // Send a message
  const sendMessage = useCallback(async (
    content: string,
    type = 'text',
    media?: any,
    replyTo?: string
  ): Promise<boolean> => {
    if (!isAuthenticated || !activeConversation) return false;

    try {
      setSending(true);
      setError(null);

      // Send via API
      const response = await messageService.sendMessage(
        activeConversation.id,
        {
          content,
          type: type as 'text' | 'image' | 'video' | 'audio' | 'document' | 'media',
          media,
          replyTo
        }
      );
      const message = response.data;

      // Do not emit via socket here. The backend broadcasts 'message:new' after API success.
      // This avoids double-creating/sending messages and client-side duplication.

      // Add message to list optimistically only if it's not already present
      setMessages(prev => {
        const safeMessages = prev || [];
        if (safeMessages.some(m => m.id === message.id)) return safeMessages;
        return [...safeMessages, message];
      });

      // Update conversation's last message
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id
            ? {
              ...conv,
              lastMessage: {
                id: message.id,
                content: message.content,
                type: message.type,
                senderId: message.senderId,
                createdAt: message.createdAt
              },
              lastActivity: message.createdAt
            }
            : conv
        )
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setSending(false);
    }
  }, [isAuthenticated, activeConversation]);

  // Edit a message
  const editMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      setError(null);

      const response = await messageService.editMessage(messageId, { content });

      // Update message in list
      setMessages(prev =>
        (prev || []).map(msg =>
          msg.id === messageId ? response.data : msg
        )
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit message';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      setError(null);

      await messageService.deleteMessage(messageId);

      // Update message in list
      setMessages(prev =>
        (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
            : msg
        )
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    if (!isAuthenticated) return;

    try {
      // Send via API
      await messageService.markAsRead(messageId);

      // Send via socket for real-time updates
      import('@/services/socketService').then(({ default: socketService }) => {
        if (socketService.isConnected()) {
          socketService.markMessageAsRead(messageId);
        }
      });

      // Update message in list
      setMessages(prev =>
        (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, isRead: true }
            : msg
        )
      );
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [isAuthenticated]);

  // Mark all messages in active conversation as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !activeConversation) return;

    try {
      // Send via API
      await messageService.markAllAsRead(activeConversation.id);

      // No need to send via socket as the API will broadcast the event

      // Update all messages in list
      setMessages(prev =>
        (prev || []).map(msg =>
          !msg.isOwn ? { ...msg, isRead: true } : msg
        )
      );

      // Update unread count in conversations list
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to mark all messages as read:', err);
    }
  }, [isAuthenticated, activeConversation]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;

    try {
      setError(null);

      const response = await messageService.addReaction(messageId, { emoji });
      const { reactions } = response.data;

      // Update message in list
      setMessages(prev =>
        (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, reactions }
            : msg
        )
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add reaction';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [isAuthenticated, user]);

  // Forward message
  const forwardMessage = useCallback(async (
    messageId: string,
    conversationIds: string[],
    message?: string
  ): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      setError(null);

      await messageService.forwardMessage(messageId, { conversationIds, message });

      toast.success(`Message forwarded to ${conversationIds.length} conversation(s)`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to forward message';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [isAuthenticated]);

  // Search messages
  const searchMessages = useCallback(async (query: string): Promise<{ messages: MessageData[]; total: number }> => {
    if (!isAuthenticated || !activeConversation || !query.trim()) {
      setSearchResults([]);
      return { messages: [], total: 0 };
    }

    try {
      setSearching(true);
      setError(null);

      const result = await messageService.searchMessages(activeConversation.id, query);
      const { messages, totalResults } = result.data;
      const formattedMessages = (messages || []).map(msg => ({
        ...msg,
        isOwn: msg.senderId === user?.id,
        isRead: msg.readBy?.some(read => read.userId === user?.id) || msg.senderId === user?.id
      }));

      setSearchResults(formattedMessages);
      return { messages: formattedMessages, total: totalResults };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search messages';
      setError(errorMessage);
      console.error(errorMessage);
      return { messages: [], total: 0 };
    } finally {
      setSearching(false);
    }
  }, [isAuthenticated, activeConversation, user]);

  // Update conversation settings
  const updateConversationSettings = useCallback(async (settings: ConversationSettings): Promise<boolean> => {
    if (!isAuthenticated || !activeConversation) return false;

    try {
      setLoading(true);
      setError(null);

      const updatedConversation = await messageService.updateConversationSettings(
        activeConversation.id,
        settings
      );

      // Update conversation in list
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id ? updatedConversation : conv
        )
      );

      // Update active conversation
      setActiveConversation(updatedConversation);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update conversation settings';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeConversation]);

  // Add members to group
  const addGroupMembers = useCallback(async (memberIds: string[]): Promise<boolean> => {
    if (!isAuthenticated || !activeConversation || !activeConversation.isGroup) return false;

    try {
      setLoading(true);
      setError(null);

      const updatedConversation = await messageService.addGroupMembers(
        activeConversation.id,
        memberIds
      );

      // Update conversation in list
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id ? updatedConversation : conv
        )
      );

      // Update active conversation
      setActiveConversation(updatedConversation);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add group members';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeConversation]);

  // Remove member from group
  const removeGroupMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!isAuthenticated || !activeConversation || !activeConversation.isGroup) return false;

    try {
      setLoading(true);
      setError(null);

      const updatedConversation = await messageService.removeGroupMember(
        activeConversation.id,
        memberId
      );

      // Update conversation in list
      setConversations(prev =>
        (prev || []).map(conv =>
          conv.id === activeConversation.id ? updatedConversation : conv
        )
      );

      // Update active conversation
      setActiveConversation(updatedConversation);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove group member';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeConversation]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping = true) => {
    // Typing indicators are optional - fail silently if conditions aren't met
    if (!isAuthenticated || !activeConversation || !user) {
      // Silently skip typing indicator
      return;
    }

    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      // Silently skip typing indicator
      return;
    }

    // Validate conversation ID
    if (!activeConversation.id || activeConversation.id.trim() === '') {
      return;
    }

    try {
      // Send via API (with enhanced error handling in messageService)
      messageService.sendTypingIndicator(activeConversation.id, isTyping);

      // Send via socket for real-time updates
      import('@/services/socketService').then(({ default: socketService }) => {
        if (socketService.isConnected()) {
          socketService.sendTyping(activeConversation.id, isTyping);
        }
      });
    } catch (err) {
      // Silently handle typing indicator errors
      console.debug('Typing indicator failed (non-critical):', err);
    }
  }, [isAuthenticated, activeConversation, user]);

  // Handle typing indicator (simulated for demo)
  const handleTypingIndicator = useCallback((userId: string, conversationId: string, isTyping: boolean) => {
    if (userId === user?.id) return; // Ignore own typing indicators

    if (isTyping) {
      // Add user to typing users
      setTypingUsers(prev => {
        const conversationTypers = prev[conversationId] || [];
        if (!conversationTypers.includes(userId)) {
          return {
            ...prev,
            [conversationId]: [...conversationTypers, userId]
          };
        }
        return prev;
      });

      // Clear previous timeout if exists
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
      }

      // Set timeout to remove user from typing after 3 seconds
      typingTimeoutsRef.current[userId] = setTimeout(() => {
        setTypingUsers(prev => {
          const conversationTypers = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: conversationTypers.filter(id => id !== userId)
          };
        });
        delete typingTimeoutsRef.current[userId];
      }, 3000);
    } else {
      // Remove user from typing users
      setTypingUsers(prev => {
        const conversationTypers = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationTypers.filter(id => id !== userId)
        };
      });

      // Clear timeout
      if (typingTimeoutsRef.current[userId]) {
        clearTimeout(typingTimeoutsRef.current[userId]);
        delete typingTimeoutsRef.current[userId];
      }
    }
  }, [user]);

  // Fetch conversations on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setPage(1);
      setHasMore(true);
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  // Clean up typing timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Connect to socket
    const token = localStorage.getItem('token');
    if (token) {
      import('@/services/socketService').then(({ default: socketService }) => {
        socketService.connect(token, user.id).catch(err => {
          console.error('Failed to connect to socket:', err);
        });

        // Listen for new messages
        socketService.on('message:new', (data: any) => {
          const { message, conversationId } = data;

          // Update messages if active conversation, avoid duplicates by id
          if (activeConversation && activeConversation.id === conversationId) {
            const formattedMessage = {
              ...message,
              isOwn: message.senderId === user?.id,
              isRead: message.readBy?.some(read => read.userId === user?.id) || message.senderId === user?.id
            };
            setMessages(prev => (prev.some(m => m.id === formattedMessage.id) ? prev : [...prev, formattedMessage]));
          }

          // Update conversation list
          setConversations(prev => {
            const updatedConversations = [...prev];
            const index = updatedConversations.findIndex(c => c.id === conversationId);

            if (index !== -1) {
              const conversation = { ...updatedConversations[index] };
              conversation.lastMessage = {
                id: message.id,
                content: message.content,
                type: message.type,
                senderId: message.senderId,
                createdAt: message.createdAt
              };
              conversation.lastActivity = message.createdAt;

              // Increment unread count if not active conversation
              if (!activeConversation || activeConversation.id !== conversationId) {
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
              }

              // Move to top of list
              updatedConversations.splice(index, 1);
              updatedConversations.unshift(conversation);
            }

            return updatedConversations;
          });

          // Play notification sound for incoming messages
          if (typeof window !== 'undefined' && message.senderId !== user?.id) {
            playMessageSound();
          }
        });

        // Listen for message updates
        socketService.on('message:update', (data: any) => {
          const { message } = data;

          // Update message in list
          setMessages(prev =>
            (prev || []).map(msg =>
              msg.id === message.id ? message : msg
            )
          );
        });

        // Listen for message deletions
        socketService.on('message:delete', (data: any) => {
          const { messageId } = data;

          // Remove message from list
          setMessages(prev =>
            (prev || []).filter(msg => msg.id !== messageId)
          );
        });

        // Listen for message reactions
        socketService.on('message:reaction', (data: any) => {
          const { messageId, reactions } = data;

          // Update message reactions
          setMessages(prev =>
            (prev || []).map(msg =>
              msg.id === messageId
                ? { ...msg, reactions }
                : msg
            )
          );
        });

        // Listen for message read receipts
        socketService.on('message:read', (data: any) => {
          const { messageId, userId, readAt } = data;

          // Update message read receipts
          setMessages(prev =>
            (prev || []).map(msg => {
              if (msg.id === messageId) {
                const existingRead = msg.readBy?.find(read => read.userId === userId);
                if (!existingRead) {
                  return {
                    ...msg,
                    readBy: [...(msg.readBy || []), { userId, readAt }]
                  };
                }
              }
              return msg;
            })
          );
        });

        // Listen for typing indicators
        socketService.on('typing', (data: any) => {
          const { conversationId, userId, isTyping } = data;

          setTypingUsers(prev => {
            const conversationTypers = [...(prev[conversationId] || [])];

            if (isTyping && !conversationTypers.includes(userId)) {
              conversationTypers.push(userId);
            } else if (!isTyping) {
              const index = conversationTypers.indexOf(userId);
              if (index !== -1) {
                conversationTypers.splice(index, 1);
              }
            }

            return {
              ...prev,
              [conversationId]: conversationTypers
            };
          });
        });

        // Listen for new conversations
        socketService.on('conversation:new', (data: any) => {
          const { conversation } = data;

          // Add to conversations list
          setConversations(prev => [conversation, ...(prev || [])]);
        });

        // Listen for conversation updates
        socketService.on('conversation:update', (data: any) => {
          const { conversation } = data;

          // Update conversation in list
          setConversations(prev =>
            (prev || []).map(c =>
              c.id === conversation.id ? conversation : c
            )
          );

          // Update active conversation if needed
          if (activeConversation && activeConversation.id === conversation.id) {
            setActiveConversation(conversation);
          }
        });

        // Listen for user online status
        socketService.on('user:status', (data: any) => {
          const { userId, isOnline, lastSeen } = data;

          // Update user status in conversations
          setConversations(prev =>
            (prev || []).map(conv => ({
              ...conv,
              participants: (conv.participants || []).map(p =>
                p.id === userId
                  ? { ...p, isOnline, lastSeen }
                  : p
              )
            }))
          );
        });

        // Join conversation room if active conversation
        if (activeConversation) {
          socketService.joinConversation(activeConversation.id);
        }
      });
    }

    return () => {
      // Disconnect socket on cleanup
      import('@/services/socketService').then(({ default: socketService }) => {
        if (activeConversation) {
          socketService.leaveConversation(activeConversation.id);
        }
        socketService.disconnect();
      });
    };
  }, [isAuthenticated, activeConversation, user]);

  return {
    conversations,
    activeConversation,
    messages,
    loading,
    sending,
    error,
    hasMore,
    typingUsers,
    searchResults,
    searching,
    totalUnread,

    // Sound controls
    soundsEnabled,
    toggleSounds,
    soundVolume,
    setSoundVolume,

    fetchConversations,
    fetchConversation,
    createConversation,
    setActiveConversation,
    updateConversationSettings,
    addGroupMembers,
    removeGroupMember,

    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    markAllAsRead,
    addReaction,
    forwardMessage,
    searchMessages,
    sendTypingIndicator
  };
};

export default useMessages;
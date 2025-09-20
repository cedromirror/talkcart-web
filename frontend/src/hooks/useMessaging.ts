import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, Conversation } from '@/types/message';
import { useAuth } from '@/contexts/AuthContext';
import socketService from '@/services/socketService';
import {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    markMessageAsRead,
    sendTypingIndicator
} from '@/services/messageApi';
import { getConversations } from '@/services/conversationApi';

interface UseMessagingOptions {
    conversationId?: string;
    autoConnect?: boolean;
    pageSize?: number;
}

interface TypingUser {
    userId: string;
    displayName: string;
}

export const useMessaging = (options: UseMessagingOptions = {}) => {
    const { conversationId, autoConnect = true, pageSize = 50 } = options;
    const { user, token } = useAuth();

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const currentPage = useRef(1);

    // Initialize socket connection
    useEffect(() => {
        if (autoConnect && user && token && !connected) {
            initializeSocket();
        }

        return () => {
            // Cleanup typing timeouts
            Object.values(typingTimeoutRef.current).forEach(timeout => {
                clearTimeout(timeout);
            });
        };
    }, [user, token, autoConnect, connected]);

    // Load conversation when conversationId changes
    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId);
            loadMessages(conversationId);
        }
    }, [conversationId]);

    // Socket initialization
    const initializeSocket = async () => {
        if (!user || !token) return;

        try {
            await socketService.connect(token, user.id);
            setConnected(true);
            setupSocketListeners();
        } catch (error) {
            console.error('Failed to connect to socket:', error);
            setError('Failed to connect to real-time messaging');
        }
    };

    // Setup socket event listeners
    const setupSocketListeners = () => {
        // New message
        socketService.on('message:new', (data: { message: Message; conversationId: string }) => {
            if (data.conversationId === conversationId) {
                setMessages(prev => [...prev, data.message]);
            }

            // Update conversation's last message
            setConversations(prev => prev.map(conv =>
                conv.id === data.conversationId
                    ? { ...conv, lastMessage: data.message, lastActivity: new Date().toISOString() }
                    : conv
            ));
        });

        // Message edited
        socketService.on('message:edited', (data: { messageId: string; content: string; isEdited: boolean; editedAt: string }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, content: data.content, isEdited: data.isEdited, editedAt: data.editedAt }
                    : msg
            ));
        });

        // Message deleted
        socketService.on('message:delete', (data: { messageId: string }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, isDeleted: true, content: 'This message was deleted' }
                    : msg
            ));
        });

        // Message reaction
        socketService.on('message:reaction', (data: { messageId: string; reactions: any[] }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, reactions: data.reactions }
                    : msg
            ));
        });

        // Message read
        socketService.on('message:read', (data: { messageId: string; readBy: any[] }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId
                    ? { ...msg, readBy: data.readBy }
                    : msg
            ));
        });

        // Typing indicator
        socketService.on('typing', (data: { conversationId: string; userId: string; displayName: string; isTyping: boolean }) => {
            if (data.conversationId !== conversationId) return;

            setTypingUsers(prev => {
                if (data.isTyping) {
                    // Add user to typing list if not already there
                    if (!prev.find(u => u.userId === data.userId)) {
                        return [...prev, { userId: data.userId, displayName: data.displayName }];
                    }
                    return prev;
                } else {
                    // Remove user from typing list
                    return prev.filter(u => u.userId !== data.userId);
                }
            });

            // Clear typing indicator after timeout
            if (data.isTyping) {
                if (typingTimeoutRef.current[data.userId]) {
                    clearTimeout(typingTimeoutRef.current[data.userId]);
                }

                typingTimeoutRef.current[data.userId] = setTimeout(() => {
                    setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
                    delete typingTimeoutRef.current[data.userId];
                }, 3000);
            }
        });

        // Conversation updates
        socketService.on('conversation:update', (data: { conversation: Conversation }) => {
            setConversations(prev => prev.map(conv =>
                conv.id === data.conversation.id ? data.conversation : conv
            ));

            if (data.conversation.id === conversationId) {
                setCurrentConversation(data.conversation);
            }
        });
    };

    // Load conversations
    const loadConversations = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await getConversations({ limit: 50 });
            if (response.success) {
                setConversations(response.data.conversations);
            }
        } catch (error: any) {
            console.error('Error loading conversations:', error);
            setError(error.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    // Load specific conversation
    const loadConversation = (convId: string) => {
        const conversation = conversations.find(c => c.id === convId);
        if (conversation) {
            setCurrentConversation(conversation);

            // Join conversation room for real-time updates
            if (connected) {
                socketService.joinConversation(convId);
            }
        }
    };

    // Load messages for conversation
    const loadMessages = async (convId: string, page = 1, append = false) => {
        if (!append) setLoading(true);
        setError(null);

        try {
            const response = await getMessages(convId, {
                limit: pageSize,
                page
            });

            if (response.success) {
                const newMessages = response.data.messages;

                if (append) {
                    setMessages(prev => [...newMessages, ...prev]);
                } else {
                    setMessages(newMessages);
                }

                setHasMore(response.data.pagination.hasMore);
                currentPage.current = page;
            }
        } catch (error: any) {
            console.error('Error loading messages:', error);
            setError(error.message || 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    // Load more messages (pagination)
    const loadMoreMessages = useCallback(() => {
        if (conversationId && hasMore && !loading) {
            loadMessages(conversationId, currentPage.current + 1, true);
        }
    }, [conversationId, hasMore, loading]);

    // Send message
    const handleSendMessage = async (
        content: string,
        type?: string,
        media?: any[],
        replyToId?: string
    ): Promise<boolean> => {
        if (!conversationId) return false;

        setSending(true);
        setError(null);

        try {
            const response = await sendMessage(conversationId, {
                content,
                type: type as any,
                media,
                replyTo: replyToId
            });

            if (response.success) {
                // Message will be added via socket event
                return true;
            } else {
                setError('Failed to send message');
                return false;
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            setError(error.message || 'Failed to send message');
            return false;
        } finally {
            setSending(false);
        }
    };

    // Edit message
    const handleEditMessage = async (messageId: string, content: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await editMessage(messageId, { content });

            if (response.success) {
                // Message will be updated via socket event
                return true;
            } else {
                setError('Failed to edit message');
                return false;
            }
        } catch (error: any) {
            console.error('Error editing message:', error);
            setError(error.message || 'Failed to edit message');
            return false;
        }
    };

    // Delete message
    const handleDeleteMessage = async (messageId: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await deleteMessage(messageId);

            if (response.success) {
                // Message will be updated via socket event
                return true;
            } else {
                setError('Failed to delete message');
                return false;
            }
        } catch (error: any) {
            console.error('Error deleting message:', error);
            setError(error.message || 'Failed to delete message');
            return false;
        }
    };

    // Toggle reaction
    const handleReaction = async (messageId: string, emoji: string): Promise<boolean> => {
        setError(null);

        try {
            const response = await toggleReaction(messageId, { emoji });

            if (response.success) {
                // Reaction will be updated via socket event
                return true;
            } else {
                setError('Failed to add reaction');
                return false;
            }
        } catch (error: any) {
            console.error('Error adding reaction:', error);
            setError(error.message || 'Failed to add reaction');
            return false;
        }
    };

    // Send typing indicator
    const handleTyping = async (isTyping: boolean) => {
        if (!conversationId || !connected) return;

        try {
            await sendTypingIndicator(conversationId, isTyping);

            // Also emit via socket for immediate feedback
            socketService.sendTyping(conversationId, isTyping);
        } catch (error) {
            console.error('Error sending typing indicator:', error);
        }
    };

    // Mark messages as read
    const markAllAsRead = async () => {
        if (!conversationId || messages.length === 0) return;

        try {
            const unreadMessages = messages.filter(msg =>
                !msg.readBy?.some(read => read.userId === user?.id)
            );

            for (const message of unreadMessages) {
                await markMessageAsRead(message.id);
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    // Refresh data
    const refresh = () => {
        if (conversationId) {
            loadMessages(conversationId);
        }
        loadConversations();
    };

    return {
        // State
        conversations,
        currentConversation,
        messages,
        loading,
        sending,
        hasMore,
        typingUsers,
        connected,
        error,

        // Actions
        loadConversations,
        loadConversation,
        loadMessages,
        loadMoreMessages,
        sendMessage: handleSendMessage,
        editMessage: handleEditMessage,
        deleteMessage: handleDeleteMessage,
        toggleReaction: handleReaction,
        sendTyping: handleTyping,
        markAllAsRead,
        refresh,

        // Utils
        clearError: () => setError(null),
    };
};

export default useMessaging;
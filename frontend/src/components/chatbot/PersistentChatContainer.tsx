import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  TextField, 
  IconButton, 
  Paper, 
  CircularProgress, 
  Avatar,
  Button,
  Alert,
  Tooltip,
  styled,
  Divider,
  Badge
} from '@mui/material';
import { 
  Send as SendIcon,
  SupportAgent as SupportAgentIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import chatbotApiModule from '@/services/chatbotApi';
import { ChatbotMessage, ChatbotConversation } from '@/services/chatbotApi';

// Define types
interface ChatHistoryItem {
  id: string;
  conversationId: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

interface PersistentChatContainerProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Styled components
const ChatContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  right: 24,
  width: 350,
  height: 400,
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px 8px 0 0',
  boxShadow: theme.shadows[8],
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1300,
  border: `1px solid ${theme.palette.divider}`,
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '8px 8px 0 0',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

const MessageBubble = styled(Box)(({ theme }) => ({
  borderRadius: '18px',
  padding: theme.spacing(1, 1.5),
  margin: theme.spacing(0.5, 0),
  maxWidth: '80%',
  wordBreak: 'break-word',
}));

const UserMessage = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  marginLeft: 'auto',
  borderRadius: '18px 4px 18px 18px',
}));

const AdminMessage = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.grey[300],
  color: theme.palette.text.primary,
  marginRight: 'auto',
  borderRadius: '4px 18px 18px 18px',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const HistoryPanel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: theme.palette.background.paper,
  zIndex: 1400,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
}));

const PersistentChatContainer: React.FC<PersistentChatContainerProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatbotConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const loadChatHistory = () => {
      if (typeof window !== 'undefined' && user) {
        try {
          const savedHistory = localStorage.getItem(`chatHistory_${user.id}`);
          if (savedHistory) {
            const history = JSON.parse(savedHistory);
            setChatHistory(history);
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      }
    };

    loadChatHistory();
  }, [user]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && user && chatHistory.length > 0) {
      try {
        localStorage.setItem(`chatHistory_${user.id}`, JSON.stringify(chatHistory));
      } catch (err) {
        console.error('Failed to save chat history:', err);
      }
    }
  }, [chatHistory, user]);

  // Fetch or create conversation when component mounts or user changes
  useEffect(() => {
    if (isOpen && user) {
      fetchOrCreateConversation();
    }
  }, [isOpen, user]);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOrCreateConversation = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to find existing conversation between vendor and admin
      const response = await chatbotApiModule.getConversations({ 
        limit: 1 
      });
      
      if (response?.data?.conversations?.length > 0) {
        const conversation = response.data.conversations[0];
        setConversation(conversation);
        
        // Fetch messages for this conversation
        const messagesResponse = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
        if (messagesResponse?.data?.messages) {
          setMessages(messagesResponse.data.messages);
          
          // Update chat history
          updateChatHistory(conversation, messagesResponse.data.messages);
        }
      } else {
        // No existing conversation found
        setConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const updateChatHistory = (conv: ChatbotConversation, msgs: ChatbotMessage[]) => {
    if (!user) return;
    
    const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const historyItem: ChatHistoryItem = {
      id: conv._id,
      conversationId: conv._id,
      title: conv.productName || 'Vendor Support',
      lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
      timestamp: conv.lastActivity,
      unreadCount: 0 // In a real implementation, this would be tracked
    };
    
    // Update or add to chat history
    setChatHistory(prev => {
      const existingIndex = prev.findIndex(item => item.conversationId === conv._id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = historyItem;
        return updated;
      } else {
        return [historyItem, ...prev];
      }
    });
  };

  const createConversation = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Create new conversation between vendor and admin
      const response = await chatbotApiModule.createConversation({
        vendorId: user.id,
        productId: '' // Empty productId for general vendor-admin chat
      });
      
      if (response?.data?.conversation) {
        setConversation(response.data.conversation);
        setMessages([]);
        
        // Update chat history
        updateChatHistory(response.data.conversation, []);
      }
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      setError('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return;

    try {
      setSending(true);
      setError(null);
      
      const response = await chatbotApiModule.sendMessage(conversation._id, {
        content: newMessage
      });
      
      if (response?.data?.message) {
        const updatedMessages = [...messages, response.data.message];
        setMessages(updatedMessages);
        setNewMessage('');
        
        // Update chat history with new message
        updateChatHistory(conversation, updatedMessages);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    if (!conversation) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
      if (response?.data?.messages) {
        setMessages(response.data.messages);
        
        // Update chat history
        updateChatHistory(conversation, response.data.messages);
      }
    } catch (err: any) {
      console.error('Failed to refresh messages:', err);
      setError('Failed to refresh messages');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the selected conversation
      const response = await chatbotApiModule.getConversation(conversationId);
      if (response?.data?.conversation) {
        const conversation = response.data.conversation;
        setConversation(conversation);
        
        // Fetch messages for this conversation
        const messagesResponse = await chatbotApiModule.getMessages(conversationId, { limit: 50 });
        if (messagesResponse?.data?.messages) {
          setMessages(messagesResponse.data.messages);
        }
        
        // Close the history panel
        setShowHistory(false);
      }
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = (conversationId: string) => {
    setChatHistory(prev => prev.filter(item => item.conversationId !== conversationId));
  };

  if (!isOpen) {
    return (
      <Tooltip title="Chat with Admin Support">
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            zIndex: 1200,
          }}
        >
          <SupportAgentIcon />
          {chatHistory.some(item => item.unreadCount > 0) && (
            <Badge
              badgeContent={chatHistory.reduce((sum, item) => sum + item.unreadCount, 0)}
              color="error"
              sx={{
                position: 'absolute',
                top: -5,
                right: -5,
              }}
            />
          )}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <ChatContainer>
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}>
            <SupportAgentIcon sx={{ fontSize: 16 }} />
          </Avatar>
          <Typography variant="subtitle1">Admin Support</Typography>
        </Box>
        <Box>
          <Tooltip title="Chat History">
            <IconButton 
              size="small" 
              onClick={() => setShowHistory(true)}
              sx={{ color: 'inherit' }}
            >
              <HistoryIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={loading}
              sx={{ color: 'inherit' }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton 
              size="small" 
              onClick={onToggle}
              sx={{ color: 'inherit' }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </ChatHeader>

      {showHistory ? (
        <HistoryPanel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Chat History</Typography>
            <IconButton onClick={() => setShowHistory(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {chatHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No chat history yet</Typography>
            </Box>
          ) : (
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {chatHistory.map((item) => (
                <ListItem 
                  key={item.conversationId}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'grey.100' },
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => handleSelectConversation(item.conversationId)}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      noWrap
                      sx={{ maxWidth: 250 }}
                    >
                      {item.lastMessage}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {item.unreadCount > 0 && (
                      <Badge badgeContent={item.unreadCount} color="primary" sx={{ mr: 1 }} />
                    )}
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.conversationId);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </HistoryPanel>
      ) : (
        <>
          <MessagesContainer>
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : messages.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Welcome to Admin Support Chat
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Send a message to get help with your vendor account
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={createConversation}
                  disabled={loading}
                >
                  Start Conversation
                </Button>
              </Box>
            ) : (
              <List>
                {messages.map((message) => (
                  <Box
                    key={message._id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    {message.senderId === user?.id ? (
                      <UserMessage>
                        <Typography variant="body2">{message.content}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                      </UserMessage>
                    ) : (
                      <AdminMessage>
                        <Typography variant="body2">{message.content}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          Admin • {formatTime(message.createdAt)}
                        </Typography>
                      </AdminMessage>
                    )}
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </List>
            )}
          </MessagesContainer>

          <Divider />

          <InputContainer>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending || loading}
              size="small"
              multiline
              maxRows={3}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim() || loading}
              sx={{ ml: 1 }}
            >
              {sending ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </InputContainer>
        </>
      )}
    </ChatContainer>
  );
};

export default PersistentChatContainer;
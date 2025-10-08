import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  Divider, 
  CircularProgress, 
  IconButton, 
  Button,
  Alert,
  Avatar,
  Paper
} from '@mui/material';
import { 
  Send as SendIcon,
  SupportAgent as SupportAgentIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import chatbotApiModule from '@/services/chatbotApi';
import { ChatbotMessage, GetVendorAdminConversationResponse, CreateVendorAdminConversationResponse } from '@/services/chatbotApi';

interface ChatConversation {
  _id: string;
  customerId: string;
  vendorId: string;
  productId: string;
  productName: string;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  lastActivity: string;
  isActive: boolean;
  isResolved: boolean;
}

const VendorAdminChatPage = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0); // Track retry attempts
  const [lastErrorTime, setLastErrorTime] = useState<number>(0); // Track when last error occurred

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Validate ObjectId format
  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Fetch or create conversation
  useEffect(() => {
    // Prevent infinite retries - limit to 3 attempts within 30 seconds
    const now = Date.now();
    if (retryCount >= 3 && now - lastErrorTime < 30000) {
      console.log('Skipping retry to prevent infinite loop');
      return;
    }

    const fetchOrCreateConversation = async () => {
      if (!isAuthenticated || !user) return;
      
      // Don't retry if we already have a conversation
      if (conversation) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Ensure we have a valid token before making the request
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }
        
        console.log('Attempting to fetch vendor-admin conversation with token:', token.substring(0, 10) + '...');
        
        // Try to find existing vendor-admin conversation
        const response: GetVendorAdminConversationResponse = await chatbotApiModule.getVendorAdminConversation();
        console.log('Vendor-admin conversation response:', response);
        
        if (response.success && response.data.conversation) {
          const conversation = response.data.conversation;
          console.log('Received conversation:', conversation);
          
          // Validate conversation object
          if (!conversation._id) {
            throw new Error('Conversation missing ID');
          }
          
          // Validate conversation ID format
          if (!isValidObjectId(conversation._id)) {
            throw new Error('Invalid conversation ID format: ' + conversation._id);
          }
          
          setConversation(conversation);
          setRetryCount(0); // Reset retry count on success
      
          // Fetch messages for this conversation
          try {
            const messagesResponse = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
            if (messagesResponse?.success && messagesResponse.data?.messages) {
              setMessages(messagesResponse.data.messages);
            }
          } catch (messagesError: any) {
            console.error('Error fetching messages:', messagesError);
            throw new Error('Failed to load messages: ' + (messagesError.message || 'Unknown error'));
          }
        } else if (response.success) {
          // No existing conversation found, create a new one
          console.log('No existing conversation found, creating new one...');
          const createResponse: CreateVendorAdminConversationResponse = await chatbotApiModule.createVendorAdminConversation();
          console.log('Create conversation response:', createResponse);
          
          if (createResponse?.success && createResponse.data?.conversation) {
            const newConversation = createResponse.data.conversation;
            console.log('Created conversation:', newConversation);
            
            // Validate conversation object
            if (!newConversation._id) {
              throw new Error('New conversation missing ID');
            }
            
            // Validate conversation ID format
            if (!isValidObjectId(newConversation._id)) {
              throw new Error('Invalid new conversation ID format: ' + newConversation._id);
            }
            
            setConversation(newConversation);
            setRetryCount(0); // Reset retry count on success
            
            // Fetch messages for this new conversation
            try {
              const messagesResponse = await chatbotApiModule.getMessages(newConversation._id, { limit: 50 });
              if (messagesResponse?.success && messagesResponse.data?.messages) {
                setMessages(messagesResponse.data.messages);
              }
            } catch (messagesError: any) {
              console.error('Error fetching messages for new conversation:', messagesError);
              throw new Error('Failed to load messages for new conversation: ' + (messagesError.message || 'Unknown error'));
            }
          } else {
            const errorMessage = createResponse?.message || 'Failed to create chat with admin';
            throw new Error(errorMessage);
          }
        } else {
          const errorMessage = response?.message || 'Failed to get vendor-admin conversation';
          // Handle authentication errors specifically
          if (errorMessage.includes('token') || errorMessage.includes('auth') || errorMessage.includes('401')) {
            // Redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              router.push('/auth/login?expired=1');
              return;
            }
          }
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error('Failed to fetch or create conversation:', err);
        setLastErrorTime(Date.now());
        setRetryCount(prev => prev + 1);
        
        // Provide more specific error messages
        if (err.message) {
          if (err.message.includes('Invalid conversation ID')) {
            setError('Unable to process conversation. Please try refreshing the page.');
          } else if (err.message.includes('token') || err.message.includes('auth') || err.message.includes('401')) {
            setError('Authentication error. Please log out and log back in.');
            // Redirect to login
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              setTimeout(() => {
                router.push('/auth/login?expired=1');
              }, 3000);
            }
          } else {
            setError('Failed to load or start conversation: ' + err.message);
          }
        } else {
          setError('Failed to load or start conversation: ' + (err.message || 'Unknown error'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateConversation();
  }, [isAuthenticated, user, conversation, retryCount, lastErrorTime, router]);

  // Reset retry count when user changes
  useEffect(() => {
    setRetryCount(0);
    setLastErrorTime(0);
    setConversation(null);
    setMessages([]);
  }, [user?.id]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return;

    try {
      setSending(true);
      setError(null);
      
      // Validate conversation ID before sending message
      if (!conversation._id) {
        throw new Error('Conversation missing ID');
      }
      
      if (!isValidObjectId(conversation._id)) {
        throw new Error('Invalid conversation ID format');
      }
      
      const response = await chatbotApiModule.sendMessage(conversation._id, {
        content: newMessage
      });
      
      if (response?.success && response.data?.message) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Provide more specific error messages
      if (err.message) {
        if (err.message.includes('Invalid conversation ID')) {
          setError('Unable to send message. Please try refreshing the page.');
        } else if (err.message.includes('token') || err.message.includes('auth') || err.message.includes('401')) {
          setError('Authentication error. Please log out and log back in.');
          // Redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setTimeout(() => {
              router.push('/auth/login?expired=1');
            }, 3000);
          }
        } else {
          setError('Failed to send message: ' + err.message);
        }
      } else {
        setError('Failed to send message: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    if (!conversation) return;
    
    setLoading(true);
    setError(null);
    try {
      // Validate conversation ID before refreshing
      if (!conversation._id) {
        throw new Error('Conversation missing ID');
      }
      
      if (!isValidObjectId(conversation._id)) {
        throw new Error('Invalid conversation ID format');
      }
      
      const response = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
      if (response?.success && response.data?.messages) {
        setMessages(response.data.messages);
      } else {
        throw new Error('Failed to refresh messages');
      }
    } catch (err: any) {
      console.error('Failed to refresh messages:', err);
      // Provide more specific error messages
      if (err.message) {
        if (err.message.includes('Invalid conversation ID')) {
          setError('Unable to refresh messages. Please try refreshing the page.');
        } else if (err.message.includes('token') || err.message.includes('auth') || err.message.includes('401')) {
          setError('Authentication error. Please log out and log back in.');
          // Redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setTimeout(() => {
              router.push('/auth/login?expired=1');
            }, 3000);
          }
        } else {
          setError('Failed to refresh messages: ' + err.message);
        }
      } else {
        setError('Failed to refresh messages: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <SupportAgentIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                Chat with Admin Support
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get help with your vendor account and products
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <br />
            <Button 
              size="small" 
              onClick={() => {
                setRetryCount(0);
                setLastErrorTime(0);
                setConversation(null);
                setMessages([]);
                setError(null);
              }}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Alert>
        )}

        <Card sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            {/* Messages area */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              {loading && messages.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                  <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Welcome to Admin Support Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Send a message to get help with your vendor account
                  </Typography>
                </Box>
              ) : (
                <List>
                  {messages.map((message) => (
                    <ListItem
                      key={message._id}
                      sx={{
                        justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                        flexDirection: 'column',
                        alignItems: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                        py: 1
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '80%',
                          backgroundColor: message.senderId === user?.id ? 'primary.main' : 'grey.200',
                          color: message.senderId === user?.id ? 'white' : 'text.primary',
                          borderRadius: 2,
                          p: 2,
                          mb: 1,
                        }}
                      >
                        <Typography variant="body1">{message.content}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                          {message.senderId === user?.id ? 'You' : 'Admin Support'} • {formatTime(message.createdAt)}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                  <div ref={messagesEndRef} />
                </List>
              )}
            </Box>

            {/* Input area */}
            <Divider />
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                  multiline
                  maxRows={3}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim() || loading}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  {sending ? <CircularProgress size={24} /> : <SendIcon />}
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default VendorAdminChatPage;
import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  TextField, 
  IconButton, 
  Paper, 
  CircularProgress, 
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip
} from '@mui/material';
import { 
  Send as SendIcon,
  Close as CloseIcon,
  SupportAgent as SupportAgentIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import chatbotApiModule from '@/services/chatbotApi';
import { ChatbotMessage, ChatbotConversation } from '@/services/chatbotApi';

interface ChatMessage extends ChatbotMessage {}

interface VendorAdminChatInterfaceProps {
  open: boolean;
  onClose: () => void;
}

const VendorAdminChatInterface: React.FC<VendorAdminChatInterfaceProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatbotConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
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
      }
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      setError('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setMessages([]);
      setNewMessage('');
      setConversation(null);
      setError(null);
      
      fetchConversation();
    }
  }, [open, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation || !user) return;
    
    try {
      setSending(true);
      setError(null);
      
      // Send the message to the backend
      const response = await chatbotApiModule.sendMessage(conversation._id, {
        content: newMessage
      });
      
      if (response?.data?.message) {
        setMessages(prev => [...prev, response.data.message]);
        setNewMessage('');
      } else {
        setError(response?.message || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: 600, display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar>
            <SupportAgentIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              Chat with Admin Support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Get help with your vendor account
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Messages area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : !conversation ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No conversation found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start a new conversation with admin support.
              </Typography>
              <Button 
                variant="contained" 
                onClick={createConversation}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                Start Conversation
              </Button>
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
        
        {/* Input area - only show if conversation exists */}
        {conversation && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
                disabled={sending}
                multiline
                maxRows={3}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                sx={{ alignSelf: 'flex-end' }}
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        {conversation && (
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchConversation}
            disabled={loading}
          >
            Refresh
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorAdminChatInterface;
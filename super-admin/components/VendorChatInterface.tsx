import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  SupportAgent as SupportAgentIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system';
  isBotMessage: boolean;
  createdAt: string;
  sender?: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface Vendor {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  displayName?: string;
}

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
  customer: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
  vendor: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface VendorChatInterfaceProps {
  vendor: Vendor;
  open: boolean;
  onClose: () => void;
}

const VendorChatInterface: React.FC<VendorChatInterfaceProps> = ({ vendor, open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch conversations where vendor is involved
      const conversationsRes = await AdminApi.getChatConversations({
        vendorId: vendor._id
      });
      
      if (conversationsRes?.success) {
        // Find the most recent conversation with this vendor
        const vendorConversations = Array.isArray(conversationsRes.data) 
          ? conversationsRes.data 
          : [];
        if (vendorConversations.length > 0) {
          // Sort by last activity and get the most recent (without mutating original array)
          const sorted = [...vendorConversations].sort((a: ChatConversation, b: ChatConversation) => 
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          );
          setConversation(sorted[0]);
          
          // Fetch messages for this conversation
          const messagesRes = await AdminApi.getChatMessages(sorted[0]._id, {
            limit: 50
          });
          
          if (messagesRes?.success) {
            // Check if messages are in data.messages or directly in data
            const messagesData = Array.isArray(messagesRes.data?.messages) 
              ? messagesRes.data.messages 
              : Array.isArray(messagesRes.data) 
                ? messagesRes.data 
                : [];
            setMessages(messagesData);
          }
        } else {
          setConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setError('Failed to load conversation');
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
  }, [open, vendor._id]);

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
      
      // Send the message to the backend
      const sendRes = await AdminApi.sendChatMessage(conversation._id, {
        content: newMessage
      });
      
      if (sendRes?.success) {
        // Add the new message to the messages list
        // Check the structure of the response to get the message correctly
        const newMsg: ChatMessage = sendRes.data?.message || sendRes.data;
        if (newMsg && newMsg._id) {
          setMessages(prev => [...prev, newMsg]);
        }
        setNewMessage('');
        
        // Update conversation's last message
        setConversation((prev: ChatConversation | null) => prev ? {
          ...prev,
          lastMessage: {
            content: newMessage,
            senderId: 'admin', // Since admin is sending the message
            createdAt: new Date().toISOString()
          },
          lastActivity: new Date().toISOString()
        } : null);
      } else {
        setError(sendRes?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              Chat with {vendor.displayName || vendor.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vendor • {vendor.email}
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
                There is no existing conversation with this vendor. 
                Conversations are typically created when customers initiate chat about products.
              </Typography>
              <Button variant="outlined" onClick={onClose}>
                Close
              </Button>
            </Box>
          ) : (
            <List>
              {messages.map((message) => (
                <ListItem
                  key={message._id}
                  sx={{
                    justifyContent: message.senderId === 'admin' ? 'flex-end' : 'flex-start',
                    flexDirection: 'column',
                    alignItems: message.senderId === 'admin' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '80%',
                      backgroundColor: message.senderId === 'admin' ? 'primary.main' : 'grey.200',
                      color: message.senderId === 'admin' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      p: 2,
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">{message.content}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                      {(message.senderId === 'admin' ? 'Admin' : (message.sender?.displayName || message.sender?.username || 'Customer'))} • {formatTime(message.createdAt)}
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorChatInterface;
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface ChatManagementDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

export default function ChatManagementDashboard({ timeRange = '30d', onRefresh }: ChatManagementDashboardProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch chat analytics
      const analyticsRes = await AdminApi.getChatAnalytics({ timeRange });
      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
      
      // Fetch recent conversations
      const conversationsRes = await AdminApi.getChatConversations({
        limit: 10,
        sortBy: 'lastActivity',
        sortOrder: 'desc'
      });
      
      if (conversationsRes?.success) {
        setConversations(conversationsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch chat data:', err);
      setError('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  const handleOpenChat = async (conversation: any) => {
    try {
      setSelectedConversation(conversation);
      
      // Fetch messages for this conversation
      const messagesRes = await AdminApi.getChatMessages(conversation._id, {
        limit: 50
      });
      
      if (messagesRes?.success) {
        setMessages(messagesRes.data.messages || []);
      }
      
      setChatDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load conversation messages');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) return;
    
    try {
      setSending(true);
      
      // Send the message to the backend
      const sendRes = await AdminApi.sendChatMessage(selectedConversation._id, {
        content: newMessage
      });
      
      if (sendRes?.success) {
        // Add the new message to the messages list
        const newMsg: any = sendRes.data.message;
        setMessages([...messages, newMsg]);
        setNewMessage('');
        
        // Update the conversation's last message
        setConversations(conversations.map(conv => 
          conv._id === selectedConversation._id 
            ? { 
                ...conv, 
                lastMessage: { 
                  content: newMessage, 
                  senderId: 'admin', 
                  createdAt: new Date().toISOString() 
                },
                lastActivity: new Date().toISOString()
              } 
            : conv
        ));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Chat Management Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Chat Management Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Chat Analytics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <ChatIcon />
                </Box>
                <Typography variant="h6">Chat Analytics</Typography>
              </Stack>
              
              {analytics && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Conversations
                    </Typography>
                    <Typography variant="h4">
                      {analytics.total_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {analytics.active_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Resolved
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {analytics.resolved_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Response Rate
                    </Typography>
                    <Typography variant="h4">
                      {analytics.vendor_response_rate.toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Conversations */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Conversations
              </Typography>
              
              {conversations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No conversations found
                </Typography>
              ) : (
                <List>
                  {conversations.map((conversation) => (
                    <React.Fragment key={conversation._id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenChat(conversation)}
                          >
                            View Chat
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <BusinessIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={conversation.productName}
                          secondary={
                            <React.Fragment>
                              <Typography component="span" variant="body2" color="text.primary">
                                {conversation.customer.displayName || conversation.customer.username}
                              </Typography>
                              {' — '}
                              {conversation.lastMessage?.content}
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ ml: 2, textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">
                            {conversation.lastMessage?.createdAt && formatTime(conversation.lastMessage.createdAt)}
                          </Typography>
                          <br />
                          <Chip
                            label={conversation.isResolved ? 'Resolved' : 'Active'}
                            size="small"
                            color={conversation.isResolved ? 'success' : 'warning'}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chat Dialog */}
      <Dialog 
        open={chatDialogOpen} 
        onClose={() => setChatDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chat with {selectedConversation?.customer.displayName || selectedConversation?.customer.username}
          <Typography variant="body2" color="text.secondary">
            About: {selectedConversation?.productName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
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
                        {message.sender?.displayName || message.sender?.username} • {formatTime(message.createdAt)}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
            
            {/* Message Input */}
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
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
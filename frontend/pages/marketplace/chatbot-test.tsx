import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  CircularProgress, 
  IconButton, 
  Menu, 
  MenuItem, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Alert
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  Reply, 
  MoreVert, 
  Check, 
  Close 
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChatbotConversation, 
  ChatbotMessage, 
  getConversations, 
  createConversation, 
  getMessages, 
  sendMessage, 
  editMessage, 
  deleteMessage, 
  replyToMessage 
} from '@/services/chatbotApi';

const ChatbotTestPage = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<ChatbotConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatbotConversation | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  
  // For message actions
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatbotMessage | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [replyMode, setReplyMode] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!isAuthenticated) return;
      
      setConversationsLoading(true);
      try {
        const response = await getConversations();
        if (response.success) {
          setConversations(response.data.conversations);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      } finally {
        setConversationsLoading(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) {
        setMessages([]);
        return;
      }

      try {
        const response = await getMessages(selectedConversation._id);
        if (response.success) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
  }, [selectedConversation]);

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateConversation = async () => {
    // In a real app, you would get these from the product page
    const vendorId = '64f8a0b1c2d3e4f5a6b7c8e0'; // Sample vendor ID
    const productId = '64f8a0b1c2d3e4f5a6b7c8e1'; // Sample product ID

    try {
      const response = await createConversation({ vendorId, productId });
      if (response.success) {
        setConversations([response.data.conversation, ...conversations]);
        setSelectedConversation(response.data.conversation);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setLoading(true);
      const response = await sendMessage(selectedConversation._id, { content: newMessage });
      if (response.success) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMessage = async () => {
    if (!selectedConversation || !selectedMessage || !editContent.trim()) return;

    try {
      setLoading(true);
      const response = await editMessage(selectedConversation._id, selectedMessage._id, { content: editContent });
      if (response.success) {
        setMessages(messages.map(msg => 
          msg._id === selectedMessage._id ? response.data.message : msg
        ));
        setEditMode(false);
        setEditContent('');
        setSelectedMessage(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to edit message');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedConversation || !selectedMessage) return;

    try {
      setLoading(true);
      const response = await deleteMessage(selectedConversation._id, selectedMessage._id);
      if (response.success) {
        setMessages(messages.map(msg => 
          msg._id === selectedMessage._id ? { ...msg, isDeleted: true, content: '[Message deleted]' } : msg
        ));
        handleCloseMenu();
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete message');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyToMessage = async () => {
    if (!selectedConversation || !selectedMessage || !replyContent.trim()) return;

    try {
      setLoading(true);
      const response = await replyToMessage(selectedConversation._id, selectedMessage._id, { content: replyContent });
      if (response.success) {
        setMessages([...messages, response.data.message]);
        setReplyMode(false);
        setReplyContent('');
        setSelectedMessage(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, message: ChatbotMessage) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedMessage(null);
  };

  const handleEditClick = () => {
    if (selectedMessage) {
      setEditMode(true);
      setEditContent(selectedMessage.content);
    }
    handleCloseMenu();
  };

  const handleReplyClick = () => {
    if (selectedMessage) {
      setReplyMode(true);
    }
    handleCloseMenu();
  };

  const isMessageOwner = (message: ChatbotMessage) => {
    return user && message.senderId === user.id;
  };

  const canEditMessage = (message: ChatbotMessage) => {
    return isMessageOwner(message) && !message.isDeleted && message.type !== 'system';
  };

  const canDeleteMessage = (message: ChatbotMessage) => {
    return isMessageOwner(message) && message.type !== 'system';
  };

  const canReplyToMessage = (message: ChatbotMessage) => {
    return !message.isDeleted && message.type !== 'system';
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
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
          Chatbot Test
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Conversations sidebar */}
          <Card sx={{ width: 300, flexShrink: 0 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Conversations</Typography>
                <Button variant="contained" size="small" onClick={handleCreateConversation}>
                  New Chat
                </Button>
              </Box>

              {conversationsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List>
                  {conversations.map((conversation) => (
                    <ListItem
                      key={conversation._id}
                      onClick={() => setSelectedConversation(conversation)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 1,
                        backgroundColor: selectedConversation?._id === conversation._id ? 'action.selected' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemText
                        primary={conversation.productName}
                        secondary={conversation.isResolved ? 'Resolved' : 'Active'}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Chat area */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedConversation ? (
              <>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6">
                      Chat about {selectedConversation.productName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor ID: {selectedConversation.vendorId}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 2 }}>
                  <CardContent sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No messages yet. Start a conversation!
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
                              width: '100%',
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
                                position: 'relative'
                              }}
                            >
                              {message.isDeleted ? (
                                <Typography variant="body1" fontStyle="italic" color="text.secondary">
                                  {message.content}
                                </Typography>
                              ) : (
                                <>
                                  <Typography variant="body1">{message.content}</Typography>
                                  {message.isEdited && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                                      (edited)
                                    </Typography>
                                  )}
                                </>
                              )}
                              
                              <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                                {new Date(message.createdAt).toLocaleTimeString()}
                                {message.senderId === user?.id && !message.isDeleted && (
                                  <IconButton 
                                    size="small" 
                                    sx={{ ml: 1, p: 0.5, color: message.senderId === user?.id ? 'white' : 'text.secondary' }}
                                    onClick={(e) => handleOpenMenu(e, message)}
                                  >
                                    <MoreVert fontSize="small" />
                                  </IconButton>
                                )}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                        <div ref={messagesEndRef} />
                      </List>
                    )}
                  </CardContent>

                  <Divider />

                  {/* Edit Message Dialog */}
                  <Dialog open={editMode} onClose={() => setEditMode(false)}>
                    <DialogTitle>Edit Message</DialogTitle>
                    <DialogContent>
                      <TextField
                        autoFocus
                        margin="dense"
                        label="Message"
                        fullWidth
                        multiline
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={loading}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setEditMode(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleEditMessage} disabled={loading || !editContent.trim()}>
                        {loading ? <CircularProgress size={24} /> : 'Save'}
                      </Button>
                    </DialogActions>
                  </Dialog>

                  {/* Reply Dialog */}
                  <Dialog open={replyMode} onClose={() => setReplyMode(false)}>
                    <DialogTitle>Reply to Message</DialogTitle>
                    <DialogContent>
                      <TextField
                        autoFocus
                        margin="dense"
                        label="Reply"
                        fullWidth
                        multiline
                        rows={3}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        disabled={loading}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setReplyMode(false)} disabled={loading}>
                        Cancel
                      </Button>
                      <Button onClick={handleReplyToMessage} disabled={loading || !replyContent.trim()}>
                        {loading ? <CircularProgress size={24} /> : 'Send Reply'}
                      </Button>
                    </DialogActions>
                  </Dialog>

                  {/* Message Action Menu */}
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                  >
                    {selectedMessage && canEditMessage(selectedMessage) && (
                      <MenuItem onClick={handleEditClick}>
                        <Edit fontSize="small" sx={{ mr: 1 }} />
                        Edit
                      </MenuItem>
                    )}
                    {selectedMessage && canDeleteMessage(selectedMessage) && (
                      <MenuItem onClick={handleDeleteMessage}>
                        <Delete fontSize="small" sx={{ mr: 1 }} />
                        Delete
                      </MenuItem>
                    )}
                    {selectedMessage && canReplyToMessage(selectedMessage) && (
                      <MenuItem onClick={handleReplyClick}>
                        <Reply fontSize="small" sx={{ mr: 1 }} />
                        Reply
                      </MenuItem>
                    )}
                  </Menu>

                  <CardContent>
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
                        disabled={loading}
                        multiline
                        maxRows={3}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSendMessage}
                        disabled={loading || !newMessage.trim()}
                        endIcon={loading ? <CircularProgress size={20} /> : null}
                      >
                        {loading ? 'Sending...' : 'Send'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Select a conversation or start a new one
                  </Typography>
                  <Button variant="contained" onClick={handleCreateConversation}>
                    Start New Chat
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default ChatbotTestPage;

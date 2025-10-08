import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  Avatar,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  ButtonBase,
} from '@mui/material';
import {
  ShoppingCart,
  LocalMall,
  Favorite,
  Chat,
  Star,
  TrendingUp,
  CalendarToday,
  CreditCard,
  CheckCircle,
  Pending,
  Cancel,
  Send,
  Search,
  Add,
  Close,
} from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import useMessages from '@/hooks/useMessages';

interface Order {
  id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    images: Array<{
      secure_url?: string;
      url: string;
    }>;
  };
  addedAt: string;
}

const MyDashboard: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState({
    orders: true,
    wishlist: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Vendor chat states
  const {
    conversations,
    activeConversation,
    messages,
    loading: messagesLoading,
    error: messagesError,
    fetchConversations,
    setActiveConversation,
    sendMessage,
    createConversation,
  } = useMessages();
  
  const [messageText, setMessageText] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [openVendorDialog, setOpenVendorDialog] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user data
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchOrders();
      fetchWishlist();
      fetchConversations();
      fetchVendors();
    }
  }, [isAuthenticated, user]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchOrders = async () => {
    try {
      setLoading(prev => ({ ...prev, orders: true }));
      const response: any = await api.orders.getOrders(1, 10);
      
      if (response.success) {
        setOrders(response.data.orders || []);
      } else {
        setError(response.error || 'Failed to load orders');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      const response: any = await api.marketplace.getWishlist();
      
      if (response.success) {
        setWishlistItems(response.data.wishlist || []);
      } else {
        setError(response.error || 'Failed to load wishlist');
      }
    } catch (err: any) {
      console.error('Error fetching wishlist:', err);
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  };

  const fetchVendors = async () => {
    try {
      const response: any = await api.marketplace.getVendors({ limit: 100 });
      if (response.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'shipped':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle color="success" />;
      case 'pending':
      case 'processing':
        return <Pending color="warning" />;
      case 'cancelled':
        return <Cancel color="error" />;
      default:
        return <Pending />;
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/marketplace/order/${orderId}`);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace/${productId}`);
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const response: any = await api.marketplace.removeFromWishlist(productId);
      if (response.success) {
        setWishlistItems(prev => prev.filter(item => item.productId !== productId));
        toast.success('Removed from wishlist');
      } else {
        toast.error(response.error || 'Failed to remove from wishlist');
      }
    } catch (err: any) {
      console.error('Error removing from wishlist:', err);
      toast.error(err.message || 'Failed to remove from wishlist');
    }
  };

  const handleChatWithVendor = (vendorId: string) => {
    // Find existing conversation with this vendor or create a new one
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.id === vendorId) && 
      conv.participants.length === 2 // Direct message
    );
    
    if (existingConversation) {
      setActiveConversation(existingConversation);
      setActiveTab(2); // Switch to chat tab
    } else {
      // Open dialog to create new conversation
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        setSelectedVendor(vendor);
        setOpenVendorDialog(true);
      }
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedVendor) return;
    
    try {
      const newConversation = await createConversation([selectedVendor.id]);
      if (newConversation) {
        setActiveConversation(newConversation);
        setActiveTab(2); // Switch to chat tab
        setOpenVendorDialog(false);
        setSelectedVendor(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeConversation) return;
    
    try {
      const success = await sendMessage(messageText);
      if (success) {
        setMessageText('');
      } else {
        toast.error('Failed to send message');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            My Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your orders, wishlist, and chat with vendors
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<ShoppingCart />} iconPosition="start" label="My Orders" />
          <Tab icon={<Favorite />} iconPosition="start" label="Wishlist" />
          <Tab icon={<Chat />} iconPosition="start" label="Vendor Chat" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* My Orders Tab */}
        {activeTab === 0 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardHeader
              title="Recent Orders"
              subheader="Track your recent purchases and order status"
            />
            <CardContent>
              {loading.orders ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : orders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    No orders yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Start shopping to see your orders here
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Box>
              ) : (
                <List>
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                Order #{order.orderNumber}
                              </Typography>
                              <Chip
                                icon={getStatusIcon(order.status)}
                                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                size="small"
                                color={getStatusColor(order.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {order.totalAmount} {order.currency}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewOrder(order.id)}
                          >
                            View Details
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {order !== orders[orders.length - 1] && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Wishlist Tab */}
        {activeTab === 1 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardHeader
              title="My Wishlist"
              subheader="Products you've saved for later"
            />
            <CardContent>
              {loading.wishlist ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : wishlistItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Favorite sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Your wishlist is empty
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Save products to your wishlist to view them here
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {wishlistItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.productId}>
                      <Card elevation={0} sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Avatar
                              variant="rounded"
                              src={item.product.images[0]?.secure_url || item.product.images[0]?.url}
                              sx={{ width: 60, height: 60 }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                {item.product.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {item.product.price} {item.product.currency}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Added: {new Date(item.addedAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                        <CardHeader
                          sx={{ pt: 0 }}
                          action={
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleViewProduct(item.productId)}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleRemoveFromWishlist(item.productId)}
                              >
                                Remove
                              </Button>
                            </Box>
                          }
                        />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Vendor Chat Tab */}
        {activeTab === 2 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardHeader
              title="Vendor Chat"
              subheader="Chat with vendors you've purchased from"
              action={
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setOpenVendorDialog(true)}
                >
                  New Chat
                </Button>
              }
            />
            <CardContent>
              {activeConversation ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
                  {/* Chat header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={activeConversation.participants.find(p => p.id !== user?.id)?.avatar || ''}
                        alt={activeConversation.participants.find(p => p.id !== user?.id)?.displayName}
                      />
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {activeConversation.participants.find(p => p.id !== user?.id)?.displayName || 
                           activeConversation.participants.find(p => p.id !== user?.id)?.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vendor
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      size="small" 
                      onClick={() => setActiveConversation(null)}
                    >
                      Close
                    </Button>
                  </Box>

                  {/* Messages area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {messagesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    ) : messagesError ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="error">{messagesError}</Typography>
                      </Box>
                    ) : messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          No messages yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start a conversation with this vendor
                        </Typography>
                      </Box>
                    ) : (
                      messages.map((message) => (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                            mb: 2
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '70%',
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: message.senderId === user?.id 
                                ? 'primary.main' 
                                : 'grey.200',
                              color: message.senderId === user?.id 
                                ? 'primary.contrastText' 
                                : 'text.primary'
                            }}
                          >
                            <Typography variant="body2">{message.content}</Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block', 
                                textAlign: 'right',
                                mt: 0.5,
                                opacity: 0.7
                              }}
                            >
                              {formatMessageTime(message.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </Box>

                  {/* Message input */}
                  <Box 
                    component="form" 
                    onSubmit={handleSendMessage}
                    sx={{ 
                      p: 2, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      multiline
                      maxRows={3}
                    />
                    <IconButton 
                      type="submit"
                      disabled={!messageText.trim()}
                      color="primary"
                    >
                      <Send />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Vendor Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Select a conversation or start a new chat with a vendor
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpenVendorDialog(true)}
                  >
                    Start New Chat
                  </Button>
                  
                  {/* List of recent conversations */}
                  {conversations.length > 0 && (
                    <Box sx={{ mt: 4, textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Conversations
                      </Typography>
                      <List>
                        {conversations.map((conversation) => {
                          const vendor = conversation.participants.find(p => p.id !== user?.id);
                          return (
                            <ButtonBase 
                              onClick={() => {
                                setActiveConversation(conversation);
                              }}
                              sx={{
                                width: '100%',
                                borderRadius: 2,
                                mb: 1,
                                '&:hover': {
                                  bgcolor: 'action.hover'
                                }
                              }}
                            >
                            <ListItem 
                              key={conversation.id}
                              sx={{
                                width: '100%',
                                borderRadius: 2,
                              }}
                            >
                              <Avatar src={vendor?.avatar || ''} sx={{ mr: 2 }}>
                                {vendor?.displayName?.[0] || vendor?.username?.[0]}
                              </Avatar>
                              <ListItemText
                                primary={vendor?.displayName || vendor?.username}
                                secondary={conversation.lastMessage?.content || 'No messages yet'}
                              />
                            </ListItem>
                            </ButtonBase>
                          );
                        })}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Vendor Selection Dialog */}
        <Dialog open={openVendorDialog} onClose={() => setOpenVendorDialog(false)}>
          <DialogTitle>Select a Vendor to Chat With</DialogTitle>
          <DialogContent sx={{ minWidth: 400 }}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.displayName || option.username}
              renderOption={(props, option) => (
                <li {...props}>
                  <Avatar src={option.avatar || ''} sx={{ mr: 2 }}>
                    {option.displayName?.[0] || option.username?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {option.displayName || option.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search vendors"
                  placeholder="Type to search for vendors..."
                  fullWidth
                />
              )}
              value={selectedVendor}
              onChange={(event, newValue) => setSelectedVendor(newValue)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenVendorDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConversation}
              variant="contained"
              disabled={!selectedVendor}
            >
              Start Chat
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default MyDashboard;
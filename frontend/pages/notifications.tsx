import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Divider,
  Button,
  Tabs,
  Tab,
  Chip,
  useTheme,
  alpha,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Snackbar,
} from '@mui/material';
import { 
  Bell, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Share, 
  Award,
  Check,
  CheckCircle,
  X,
  Filter,
  AlertCircle,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `notifications-tab-${index}`,
    'aria-controls': `notifications-tabpanel-${index}`,
  };
}

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const { 
    notifications: rawNotifications, 
    markAsRead, 
    markAllAsRead, 
    loading, 
    error,
    fetchNotifications,
    fetchUnreadCount
  } = useNotifications();
  
  // Ensure notifications is always an array
  const notifications = Array.isArray(rawNotifications) ? rawNotifications : [];
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Early return if notifications is not properly initialized
  if (!Array.isArray(rawNotifications)) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Initializing...
          </Typography>
        </Container>
      </Layout>
    );
  }

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Format relative time
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={20} color={theme.palette.error.main} fill={theme.palette.error.main} />;
      case 'comment':
        return <MessageSquare size={20} color={theme.palette.info.main} />;
      case 'follow':
        return <UserPlus size={20} color={theme.palette.success.main} />;
      case 'share':
        return <Share size={20} color={theme.palette.warning.main} />;
      case 'achievement':
        return <Award size={20} color={theme.palette.secondary.main} />;
      default:
        return <Bell size={20} color={theme.palette.primary.main} />;
    }
  };

  // Get color based on notification type
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return theme.palette.error.main;
      case 'comment':
        return theme.palette.info.main;
      case 'follow':
        return theme.palette.success.main;
      case 'share':
        return theme.palette.warning.main;
      case 'achievement':
        return theme.palette.secondary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Filter notifications by type
  const filterNotifications = (type: string) => {
    // Ensure notifications is an array before filtering
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    
    if (type === 'all') return safeNotifications;
    return safeNotifications.filter(notification => notification.type === type);
  };

  // Get unread notifications count by type
  const getUnreadCount = (type: string) => {
    // Ensure notifications is an array before filtering
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    
    if (type === 'all') return safeNotifications.filter(n => !n.isRead).length;
    return safeNotifications.filter(n => n.type === type && !n.isRead).length;
  };

  // Handle mark as read with error handling
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const success = await markAsRead(notificationId);
      if (success) {
        setSnackbarMessage('Notification marked as read');
      } else {
        setSnackbarMessage('Failed to mark notification as read');
      }
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Error marking notification as read');
      setSnackbarOpen(true);
    }
  };

  // Handle mark all as read with error handling
  const handleMarkAllAsRead = async () => {
    try {
      const success = await markAllAsRead();
      if (success) {
        setSnackbarMessage('All notifications marked as read');
      } else {
        setSnackbarMessage('Failed to mark all notifications as read');
      }
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage('Error marking all notifications as read');
      setSnackbarOpen(true);
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading...
          </Typography>
        </Container>
      </Layout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <AlertCircle size={48} color={theme.palette.error.main} style={{ margin: '0 auto 16px' }} />
          <Typography variant="h6" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please log in to view your notifications
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/auth/login?redirect=/notifications'}
          >
            Go to Login
          </Button>
        </Container>
      </Layout>
    );
  }

  // Show error if there's an issue loading notifications
  if (error) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Error Loading Notifications
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                fetchNotifications();
                fetchUnreadCount();
              }}
            >
              Try Again
            </Button>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bell size={24} color={theme.palette.primary.main} />
            <Typography variant="h5" fontWeight={700}>
              Notifications
            </Typography>
          </Box>
          
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<CheckCircle size={16} />}
            onClick={handleMarkAllAsRead}
            disabled={notifications.filter(n => !n.isRead).length === 0}
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Mark all as read
          </Button>
        </Box>
        
        {/* Filter Tabs */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                  height: 3
                }
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>All</Typography>
                    {getUnreadCount('all') > 0 && (
                      <Chip 
                        label={getUnreadCount('all')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'primary.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(0)} 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Heart size={16} color={theme.palette.error.main} fill={theme.palette.error.main} />
                    <Typography variant="body2" fontWeight={600}>Likes</Typography>
                    {getUnreadCount('like') > 0 && (
                      <Chip 
                        label={getUnreadCount('like')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'error.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(1)} 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MessageSquare size={16} color={theme.palette.info.main} />
                    <Typography variant="body2" fontWeight={600}>Comments</Typography>
                    {getUnreadCount('comment') > 0 && (
                      <Chip 
                        label={getUnreadCount('comment')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'info.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(2)} 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserPlus size={16} color={theme.palette.success.main} />
                    <Typography variant="body2" fontWeight={600}>Follows</Typography>
                    {getUnreadCount('follow') > 0 && (
                      <Chip 
                        label={getUnreadCount('follow')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'success.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(3)} 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Share size={16} color={theme.palette.warning.main} />
                    <Typography variant="body2" fontWeight={600}>Shares</Typography>
                    {getUnreadCount('share') > 0 && (
                      <Chip 
                        label={getUnreadCount('share')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'warning.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(4)} 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Award size={16} color={theme.palette.secondary.main} />
                    <Typography variant="body2" fontWeight={600}>Achievements</Typography>
                    {getUnreadCount('achievement') > 0 && (
                      <Chip 
                        label={getUnreadCount('achievement')} 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          minWidth: 18,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: 'secondary.main',
                          color: 'white'
                        }} 
                      />
                    )}
                  </Box>
                } 
                {...a11yProps(5)} 
              />
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Notifications List */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} />
              </Box>
            ) : filterNotifications(
              activeTab === 0 ? 'all' : 
              activeTab === 1 ? 'like' : 
              activeTab === 2 ? 'comment' : 
              activeTab === 3 ? 'follow' : 
              activeTab === 4 ? 'share' : 
              'achievement'
            ).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Bell size={48} color={alpha(theme.palette.text.secondary, 0.5)} style={{ marginBottom: 16 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No notifications yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When you receive notifications, they'll appear here
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filterNotifications(
                  activeTab === 0 ? 'all' : 
                  activeTab === 1 ? 'like' : 
                  activeTab === 2 ? 'comment' : 
                  activeTab === 3 ? 'follow' : 
                  activeTab === 4 ? 'share' : 
                  'achievement'
                ).map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem 
                      sx={{ 
                        py: 2, 
                        px: 3,
                        cursor: 'pointer',
                        bgcolor: notification.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                        '&:hover': {
                          bgcolor: alpha(theme.palette.action.hover, 0.3)
                        }
                      }}
                      onClick={() => {
                        handleMarkAsRead(notification.id);
                        if (notification.data?.url) {
                          window.open(notification.data.url, '_blank');
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: alpha(getNotificationColor(notification.type), 0.1),
                            color: getNotificationColor(notification.type)
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={
                          <Typography variant="body1" fontWeight={notification.isRead ? 400 : 600}>
                            {notification.content}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {formatTimeAgo(notification.createdAt)}
                          </Typography>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        {!notification.isRead && (
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            sx={{ 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'primary.dark'
                              }
                            }}
                          >
                            <Check size={16} />
                          </IconButton>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <Divider variant="inset" component="li" sx={{ mx: 3 }} />
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Layout>
  );
};

export default NotificationsPage;
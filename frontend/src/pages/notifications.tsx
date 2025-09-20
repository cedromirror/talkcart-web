import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Button,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import { Bell, MoreVertical, Trash, Check } from 'lucide-react';
import Layout from '@/components/layout/Layout';
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
  const router = useRouter();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  
  const { 
    notifications, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAllNotifications
  } = useNotifications();
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle notification click
  const handleNotificationClick = (notificationId: string, url?: string) => {
    // Mark as read
    markAsRead(notificationId);
    
    // Navigate if URL is provided
    if (url) {
      router.push(url);
    }
  };
  
  // Handle notification menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedNotificationId(notificationId);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedNotificationId(null);
  };
  
  // Handle mark as read from menu
  const handleMarkAsRead = () => {
    if (selectedNotificationId) {
      markAsRead(selectedNotificationId);
      handleMenuClose();
    }
  };
  
  // Handle delete notification
  const handleDeleteNotification = () => {
    if (selectedNotificationId) {
      deleteNotification(selectedNotificationId);
      handleMenuClose();
    }
  };
  
  // Format relative time
  const timeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return notifDate.toLocaleDateString();
  };
  
  // Get notification URL
  const getNotificationUrl = (notification: any) => {
    if (!notification.data) return undefined;
    
    if (notification.data.postId) {
      return `/post/${notification.data.postId}`;
    }
    
    if (notification.data.userId) {
      return `/profile/${notification.data.userId}`;
    }
    
    return notification.data.url;
  };
  
  // Filter notifications based on active tab
  const getFilteredNotifications = () => {
    if (activeTab === 0) return notifications;
    if (activeTab === 1) return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.isRead);
  };
  
  const filteredNotifications = getFilteredNotifications();
  
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={600}>
            Notifications
          </Typography>
          
          <Box>
            <Button 
              variant="outlined" 
              onClick={() => markAllAsRead()}
              sx={{ mr: 1 }}
            >
              Mark all as read
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={() => clearAllNotifications()}
            >
              Clear all
            </Button>
          </Box>
        </Box>
        
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="notification tabs"
              variant="fullWidth"
            >
              <Tab label="All" {...a11yProps(0)} />
              <Tab label="Unread" {...a11yProps(1)} />
              <Tab label="Read" {...a11yProps(2)} />
            </Tabs>
          </Box>
          
          <TabPanel value={activeTab} index={0}>
            {renderNotificationList(filteredNotifications)}
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            {renderNotificationList(filteredNotifications)}
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            {renderNotificationList(filteredNotifications)}
          </TabPanel>
        </Paper>
        
        {/* Notification Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              mt: 1.5,
              width: 200,
              borderRadius: 2,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleMarkAsRead}>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              <Check size={18} />
            </ListItemAvatar>
            <ListItemText primary="Mark as read" />
          </MenuItem>
          
          <MenuItem onClick={handleDeleteNotification}>
            <ListItemAvatar sx={{ minWidth: 36 }}>
              <Trash size={18} />
            </ListItemAvatar>
            <ListItemText primary="Delete" />
          </MenuItem>
        </Menu>
      </Container>
    </Layout>
  );
  
  function renderNotificationList(notifications: any[]) {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (notifications.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" gutterBottom>
            No notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {activeTab === 0 ? "You don't have any notifications yet" : 
             activeTab === 1 ? "You don't have any unread notifications" : 
             "You don't have any read notifications"}
          </Typography>
        </Box>
      );
    }
    
    return (
      <List>
        {notifications.map((notification) => (
          <React.Fragment key={notification.id}>
            <ListItem
              sx={{ 
                py: 2,
                bgcolor: notification.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
              }}
              secondaryAction={
                <IconButton 
                  edge="end" 
                  onClick={(e) => handleMenuOpen(e, notification.id)}
                >
                  <MoreVertical size={18} />
                </IconButton>
              }
              onClick={() => handleNotificationClick(notification.id, getNotificationUrl(notification))}
              button
            >
              <ListItemAvatar>
                <Avatar 
                  src={notification.sender?.avatar} 
                  sx={{ 
                    bgcolor: !notification.sender ? theme.palette.primary.main : undefined
                  }}
                >
                  {!notification.sender && (
                    <Bell size={20} />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box>
                    {notification.sender && (
                      <Typography component="span" fontWeight={600}>
                        {notification.sender.displayName}
                      </Typography>
                    )}{' '}
                    {notification.content}
                  </Box>
                }
                secondary={timeAgo(notification.createdAt)}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  }
};

export default NotificationsPage;
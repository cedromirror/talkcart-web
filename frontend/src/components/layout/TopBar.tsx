import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Stack,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Popover,
  List,
  ListItem,
  Paper,
  ClickAwayListener,
  useMediaQuery,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bell,
  Search,
  User,
  Moon,
  Sun,
  Wallet,
  MessageSquare,
  X as CloseIcon,
  TrendingUp,
  History,
  Hash as HashtagIcon,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { useSearch } from '@/hooks/useSearch';
import { useNotifications } from '@/hooks/useNotifications';
import { useCart } from '@/contexts/CartContext';
import UserAvatar from '../common/UserAvatar';
import WalletButton from '@/components/wallet/WalletButton';
import CartIcon from '@/components/cart/CartIcon';
import CartDrawer from '@/components/cart/CartDrawer';

interface TopBarProps {
  onMenuClick: () => void;
  showMenuButton?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  showMenuButton = true,
}) => {
  const { user, isAuthenticated } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const { toggleTheme } = useThemeToggle();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Use our custom search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions: apiSuggestions,
    loading: searchLoading,
    showSuggestions,
    setShowSuggestions,
    search,
    saveToRecent
  } = useSearch({
    debounceMs: 300,
    autoSearch: false
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // State for user menu
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  // Settings menu state removed

  // Use notifications hook
  const {
    notifications,
    unreadCount: unreadNotifications,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications();

  // State for notifications popover
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null);
  const notificationsOpen = Boolean(notificationsAnchor);

  // Cart state
  const { cart } = useCart();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Listen for global cart open/close events
  React.useEffect(() => {
    const openHandler = () => setCartDrawerOpen(true);
    const closeHandler = () => setCartDrawerOpen(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('cart:open', openHandler);
      window.addEventListener('cart:close', closeHandler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cart:open', openHandler);
        window.removeEventListener('cart:close', closeHandler);
      }
    };
  }, []);

  // Handle click away from search suggestions
  const handleClickAway = () => {
    setShowSuggestions(false);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      // Save to recent searches (only if authenticated)
      if (isAuthenticated) {
        saveToRecent(searchQuery);
      }

      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setMobileSearchOpen(false);
    }
  };

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'user') {
      const username = suggestion.text.replace('@', '');
      router.push(`/profile/${username}`);
    } else if (suggestion.type === 'hashtag') {
      const hashtag = suggestion.text.replace('#', '').replace('Trending: ', '');
      router.push(`/hashtag/${hashtag}`);
    } else if (suggestion.type === 'recent') {
      setSearchQuery(suggestion.text);
      router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
    } else {
      // For content type
      const query = suggestion.text.replace('Posts about "', '').replace('"', '');
      setSearchQuery(query);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
    setShowSuggestions(false);
  };

  // Map API suggestions to UI format with icons
  const searchSuggestions = apiSuggestions.map(suggestion => {
    let icon;
    let displayText = suggestion.text;
    let secondaryText = '';

    switch (suggestion.type) {
      case 'user':
        // For user suggestions, show avatar if available, otherwise user icon
        if (suggestion.metadata?.avatar) {
          icon = (
            <Avatar
              src={suggestion.metadata.avatar}
              sx={{ width: 24, height: 24 }}
            >
              {suggestion.text.charAt(1).toUpperCase()}
            </Avatar>
          );
        } else {
          icon = <User size={16} />;
        }
        // Show display name as secondary text if available
        if (suggestion.metadata?.displayName) {
          secondaryText = suggestion.metadata.displayName;
        }
        break;
      case 'hashtag':
        icon = <HashtagIcon size={16} />;
        break;
      case 'content':
        icon = <Search size={16} />;
        break;
      case 'recent':
        icon = <History size={16} />;
        break;
      default:
        icon = <Search size={16} />;
    }

    return {
      ...suggestion,
      icon,
      displayText,
      secondaryText
    };
  });

  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Settings menu handlers removed

  // Handle notifications
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setNotificationsAnchor(event.currentTarget);

    // Refresh notifications when opening
    fetchNotifications();
  };

  const handleNotificationsClose = () => setNotificationsAnchor(null);

  // Handle notification click
  const handleNotificationClick = (notificationId: string, url?: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Mark as read
    markAsRead(notificationId);

    // Navigate if URL is provided
    if (url) {
      router.push(url);
    }

    // Close notifications
    handleNotificationsClose();
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    markAllAsRead();
  };

  // Handle login click
  const handleLoginClick = () => {
    router.push('/auth/login');
  };

  // Toggle mobile search
  const handleToggleMobileSearch = () => {
    setMobileSearchOpen(prev => !prev);
    if (!mobileSearchOpen) {
      setTimeout(() => {
        const searchInput = document.getElementById('mobile-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    }
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: 'auto', md: '200px' } }}>
          {showMenuButton && !mobileSearchOpen && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onMenuClick}
              sx={{ mr: 2 }}
            >
              <MenuIcon size={24} />
            </IconButton>
          )}

          {!mobileSearchOpen && (
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                display: { xs: 'block', md: 'block' },
                cursor: 'pointer'
              }}
              onClick={() => {
                if (!isAuthenticated) {
                  router.push('/auth/login');
                } else {
                  router.push('/social');
                }
              }}
            >
              TalkCart
            </Typography>
          )}
        </Box>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              position: 'relative',
              width: '100%',
              mx: 'auto',
              maxWidth: '100%'
            }}
          >
            <TextField
              id="mobile-search-input"
              placeholder="Search TalkCart..."
              size="small"
              fullWidth
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searchLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Search size={18} />
                    )}
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={handleToggleMobileSearch}
                    >
                      <CloseIcon size={18} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                }
              }}
            />

            {/* Mobile Search Suggestions */}
            {showSuggestions && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  zIndex: 1000,
                  maxHeight: 300,
                  overflow: 'auto',
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {searchLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : searchSuggestions.length > 0 ? (
                    searchSuggestions.map((suggestion) => (
                      <ListItem
                        key={suggestion.id}
                        component="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          py: 1,
                          px: 2,
                          cursor: 'pointer',
                          border: 'none',
                          background: 'transparent',
                          width: '100%',
                          textAlign: 'left',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {suggestion.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion.displayText || suggestion.text}
                          secondary={suggestion.secondaryText}
                          primaryTypographyProps={{
                            variant: 'body2',
                            noWrap: true
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            noWrap: true,
                            color: 'text.secondary'
                          }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ py: 1, px: 2 }}>
                      <ListItemText
                        primary="No results found"
                        primaryTypographyProps={{
                          variant: 'body2',
                          align: 'center',
                          color: 'text.secondary'
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
          </Box>
        )}

        {/* Desktop Search Bar with Suggestions */}
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexGrow: 1,
              mx: 'auto',
              maxWidth: 500,
              position: 'relative'
            }}
            ref={searchRef}
          >
            <TextField
              placeholder="Search TalkCart..."
              size="small"
              fullWidth
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {searchLoading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Search size={18} />
                    )}
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => setSearchQuery('')}
                    >
                      <CloseIcon size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                }
              }}
            />

            {/* Search Suggestions Dropdown */}
            {showSuggestions && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 0.5,
                  zIndex: 1000,
                  maxHeight: 350,
                  overflow: 'auto',
                  borderRadius: 1,
                }}
              >
                <List dense>
                  {searchLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : searchSuggestions.length > 0 ? (
                    searchSuggestions.map((suggestion) => (
                      <ListItem
                        key={suggestion.id}
                        component="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          py: 1,
                          px: 2,
                          cursor: 'pointer',
                          border: 'none',
                          background: 'transparent',
                          width: '100%',
                          textAlign: 'left',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {suggestion.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion.displayText || suggestion.text}
                          secondary={suggestion.secondaryText}
                          primaryTypographyProps={{
                            variant: 'body2',
                            noWrap: true
                          }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            noWrap: true,
                            color: 'text.secondary'
                          }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ py: 1, px: 2 }}>
                      <ListItemText
                        primary="No results found"
                        primaryTypographyProps={{
                          variant: 'body2',
                          align: 'center',
                          color: 'text.secondary'
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
          </Box>
        </ClickAwayListener>

        {/* Action Icons */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: { xs: 'auto', md: '200px' }, justifyContent: 'flex-end' }}>
          {/* Search Icon - Mobile */}
          {!mobileSearchOpen && (
            <IconButton
              color="inherit"
              size="small"
              sx={{ display: { xs: 'flex', md: 'none' } }}
              onClick={handleToggleMobileSearch}
            >
              <Search size={20} />
            </IconButton>
          )}

          {isAuthenticated ? (
            <>
              {/* Notification Icon */}
              <Tooltip title="Notifications">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleNotificationsOpen}
                >
                  <Badge badgeContent={unreadNotifications} color="error">
                    <Bell size={20} />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Messages Icon */}
              <Tooltip title="Messages">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/messages');
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                >
                  <Badge badgeContent={2} color="primary">
                    <MessageSquare size={20} />
                  </Badge>
                </IconButton>
              </Tooltip>

              {/* Cart Icon */}
              <CartIcon
                size="small"
                onClick={() => setCartDrawerOpen(true)}
              />

              {/* Settings Icon */}
              <Tooltip title="Settings">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/settings');
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                >
                  <Settings size={20} />
                </IconButton>
              </Tooltip>

              {/* Wallet Button */}
              <Box sx={{ display: { xs: 'none', sm: 'block' }, ml: 1 }}>
                <WalletButton />
              </Box>

              {/* User Avatar */}
              <Tooltip title="Profile">
                <IconButton
                  onClick={handleUserMenuOpen}
                  size="small"
                  sx={{ ml: 1 }}
                  aria-controls={userMenuOpen ? 'account-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen ? 'true' : undefined}
                >
                  <UserAvatar
                    src={user?.avatar}
                    alt={user?.displayName || 'User'}
                    size={32}
                    isVerified={user?.isVerified}
                    sx={{
                      border: `2px solid ${theme.palette.primary.main}`
                    }}
                  />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <IconButton
              color="primary"
              onClick={handleLoginClick}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                },
              }}
            >
              <User size={20} />
            </IconButton>
          )}
        </Stack>
      </Toolbar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        id="account-menu"
        open={userMenuOpen}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            width: 220,
            borderRadius: 2,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {isAuthenticated && user && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {user.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              @{user.username}
            </Typography>
          </Box>
        )}

        <Divider />

        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/profile');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemIcon>
            <User size={18} />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>

        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/wallet');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemIcon>
            <Wallet size={18} />
          </ListItemIcon>
          <ListItemText primary="Wallet" />
        </MenuItem>

        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/settings');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemIcon>
            <Settings size={18} />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>

        {/* Logout option removed */}
      </Menu>

      {/* Settings Menu removed */}

      {/* Notifications Popover */}
      <Popover
        open={notificationsOpen}
        anchorEl={notificationsAnchor}
        onClose={handleNotificationsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            borderRadius: 2,
            p: 1,
          }
        }}
      >
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 1 }} />

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => {
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
            const getNotificationUrl = () => {
              if (!notification.data) return '/notifications';

              if (notification.data.postId) {
                return `/post/${notification.data.postId}`;
              }

              if (notification.data.userId) {
                return `/profile/${notification.data.userId}`;
              }

              return notification.data.url || '/notifications';
            };

            return (
              <Box
                key={notification.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor: notification.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                  '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                }}
                onClick={() => handleNotificationClick(notification.id, getNotificationUrl())}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar
                    src={notification.sender?.avatar}
                    sx={{
                      mr: 1.5,
                      width: 40,
                      height: 40,
                      bgcolor: !notification.sender ? theme.palette.primary.main : undefined
                    }}
                  >
                    {!notification.sender && (
                      <Bell size={20} />
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">
                      {notification.sender && (
                        <Typography component="span" fontWeight={600}>
                          {notification.sender.displayName}
                        </Typography>
                      )}{' '}
                      {notification.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(notification.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}

        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{
              cursor: 'pointer',
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => {
              handleNotificationsClose();
              router.push('/notifications');
            }}
          >
            View All Notifications
          </Typography>
        </Box>
      </Popover>

      {/* Cart Drawer */}
      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        anchor="right"
      />
    </AppBar>
  );
};

export default TopBar;
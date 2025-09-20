import React, { useState } from 'react';
import {
  Drawer,
  List,
  Box,
  Typography,
  Divider,
  Avatar,
  Stack,
  useTheme,
  alpha,
  Collapse,
  IconButton,
  Chip,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  MessageCircle,
  ShoppingCart,
  Video,
  Sparkles,
  User,
  Wallet,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Crown,
  Globe,
  Settings,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import NavigationItem from './NavigationItem';
import UserAvatar from '../common/UserAvatar';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
  width?: number;
}

interface NavigationSection {
  title: string;
  items: NavigationItemData[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  premium?: boolean;
}

interface NavigationItemData {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  comingSoon?: boolean;
  requireAuth?: boolean;
  tooltip?: string;
  premium?: boolean;
  new?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  variant = 'temporary',
  width = 280,
}) => {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const theme = useTheme();

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Main': true,
    'Features': true,
  });

  // Toggle section expansion
  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Simplified navigation sections with only the specified pages
  const navigationSections: NavigationSection[] = [
    {
      title: 'Main',
      defaultExpanded: true,
      items: [
        {
          label: 'Social Feed',
          path: '/social',
          icon: <Globe size={20} />,
          tooltip: 'View your social feed',
          badge: 'Hot',
        },
        {
          label: 'Messages',
          path: '/messages',
          icon: <MessageCircle size={20} />,
          tooltip: 'Private messages & conversations',
          badge: '3',
        },
        {
          label: 'Streams',
          path: '/streams',
          icon: <Video size={20} />,
          tooltip: 'Watch & create live streams',
          badge: 'Live',
        },
      ],
    },
    {
      title: 'Features',
      defaultExpanded: true,
      items: [
        {
          label: 'Marketplace',
          path: '/marketplace',
          icon: <ShoppingCart size={20} />,
          tooltip: 'NFT Marketplace & Digital Assets',
          badge: 'Hot',
        },
        {
          label: 'Cart',
          path: '/cart',
          icon: <ShoppingBag size={20} />,
          tooltip: 'Shopping Cart',
          requireAuth: true,
        },
        {
          label: 'Orders',
          path: '/orders',
          icon: <Package size={20} />,
          tooltip: 'Order History',
          requireAuth: true,
        },
        {
          label: 'Wallet',
          path: '/wallet',
          icon: <Wallet size={20} />,
          tooltip: 'Manage your wallet',
          requireAuth: true,
        },
      ],
    },
  ];

  const handleNavigation = (path: string) => {
    // If user is not authenticated, redirect to login page
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      router.push(path);
    }

    if (variant === 'temporary') {
      onClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // User stats for premium users
  const userStats = {
    followers: 1234,
    following: 567,
    posts: 89,
    nfts: 12,
  };

  const sidebarContent = (
    <Box sx={{ width, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <Sparkles size={28} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                TalkCart
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Web3 Social Platform
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Settings" onClick={() => handleNavigation('/settings')} size="small">
            <Settings size={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* Simplified User Profile Section: avatar only */}
      {isAuthenticated && user && (
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" justifyContent="center">
            <UserAvatar
              src={user.avatar}
              alt={user.displayName || user.username}
              size={56}
              isVerified={user.isVerified}
              onClick={() => handleNavigation('/profile')}
              sx={{
                cursor: 'pointer',
                border: `3px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }
              }}
            />
          </Stack>
        </Box>
      )}

      {/* Enhanced Navigation Sections */}
      <Box sx={{ flexGrow: 1, py: 1, overflowY: 'auto' }}>
        {navigationSections.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.title] ?? section.defaultExpanded ?? true;

          return (
            <Box key={section.title} sx={{ px: 2, mb: 2 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1,
                  mb: 1,
                  cursor: section.collapsible ? 'pointer' : 'default',
                  borderRadius: 1,
                  '&:hover': section.collapsible ? {
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                  } : {},
                }}
                onClick={section.collapsible ? () => toggleSection(section.title) : undefined}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="overline"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {section.title}
                  </Typography>
                  {section.premium && (
                    <Crown size={14} color={theme.palette.warning.main} />
                  )}
                </Stack>
                {section.collapsible && (
                  <IconButton size="small" sx={{ p: 0.5 }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </IconButton>
                )}
              </Stack>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List sx={{ py: 0 }}>
                  {section.items.map((item) => {
                    // Skip auth-required items if not authenticated
                    if (item.requireAuth && !isAuthenticated) {
                      return null;
                    }

                    return (
                      <NavigationItem
                        key={item.path}
                        label={item.label}
                        path={item.path}
                        icon={item.icon}
                        badge={item.badge}
                        comingSoon={item.comingSoon}
                        tooltip={item.tooltip}
                        premium={item.premium}
                        new={item.new}
                      />
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Bottom section with Logout */}
      {isAuthenticated && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <NavigationItem
              label="Logout"
              path="#"
              icon={<User size={20} />}
              tooltip="Sign out of your account"
              onClick={handleLogout}
            />
          </Box>
        </>
      )}

      {/* Enhanced Login prompt for non-authenticated users */}
      {!isAuthenticated && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Card
              elevation={0}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2,
                mb: 2,
              }}
            >
              <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Join TalkCart Today
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Connect, trade, and explore Web3
                </Typography>
                <Stack spacing={1}>
                  <NavigationItem
                    label="Sign Up"
                    path="/auth/register"
                    icon={<Plus size={20} />}
                    tooltip="Create new account"
                  />
                  <NavigationItem
                    label="Login"
                    path="/auth/login"
                    icon={<User size={20} />}
                    tooltip="Sign in to your account"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );
};

export default Sidebar;
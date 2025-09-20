import React, { useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  requireAuth?: boolean;
  showNavigation?: boolean;
  showSidebar?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  requireAuth = false,
  showNavigation = true,
  showSidebar = true,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    router.replace('/auth/login');
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Don't show sidebar on auth pages
  const isAuthPage = router.pathname.startsWith('/auth');
  const shouldShowSidebar = showSidebar && showNavigation && !isAuthPage && isAuthenticated;
  const shouldShowTopBar = showNavigation && !isAuthPage;

  const sidebarWidth = 280;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Bar */}
      {shouldShowTopBar && (
        <TopBar
          onMenuClick={handleSidebarToggle}
          showMenuButton={shouldShowSidebar}
        />
      )}

      {/* Sidebar */}
      {shouldShowSidebar && (
        <Sidebar
          open={sidebarOpen}
          onClose={handleSidebarClose}
          variant={isMobile ? 'temporary' : 'persistent'}
          width={sidebarWidth}
        />
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          marginLeft: shouldShowSidebar && !isMobile && sidebarOpen ? 0 : 0,
          marginTop: shouldShowTopBar ? '64px' : 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Container
          maxWidth={maxWidth}
          disableGutters={disableGutters}
          sx={{
            py: showNavigation ? 3 : 0,
            px: disableGutters ? 0 : { xs: 2, sm: 3 },
            minHeight: shouldShowTopBar ? 'calc(100vh - 64px)' : '100vh',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
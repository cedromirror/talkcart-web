import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { Web3Provider } from '@/contexts/Web3Context';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme } from '@/theme';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster, toast } from 'react-hot-toast';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css'; // global import for cropper styles
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import { CartProvider } from '@/contexts/CartContext';
import { StripeProvider } from '@/contexts/StripeContext';
import { SessionExpiredError } from '@/lib/api';

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  // Create a client
  const [queryClient] = useState(() => new QueryClient());

  // Global error handler for unhandled SessionExpiredError
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof SessionExpiredError) {
        event.preventDefault(); // Prevent default browser behavior
        toast.error('Your session has expired. Please log in again.');
        setTimeout(() => {
          const currentPath = window.location.pathname + window.location.search;
          window.location.assign(`/auth/login?next=${encodeURIComponent(currentPath)}`);
        }, 100);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>TalkCart - Web3 Super Application</title>
      </Head>

      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MuiThemeProvider theme={lightTheme}>
              <CssBaseline />
              <AuthProvider>
                <Web3Provider>
                  <PrivacyProvider>
                    <PresenceProvider>
                      <WebSocketProvider>
                        <StripeProvider>
                          <CartProvider>
                            <ProfileCacheProvider>
                              <Component {...pageProps} />
                              <Toaster
                                position="top-right"
                                toastOptions={{
                                  duration: 4000,
                                  style: {
                                    background: '#363636',
                                    color: '#fff',
                                  },
                                }}
                              />
                            </ProfileCacheProvider>
                          </CartProvider>
                        </StripeProvider>
                      </WebSocketProvider>
                    </PresenceProvider>
                  </PrivacyProvider>
                </Web3Provider>
              </AuthProvider>
            </MuiThemeProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default MyApp;
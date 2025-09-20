import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

// Safe auth hook that doesn't throw if used outside AuthProvider
export const useSafeAuth = () => {
  try {
    const context = useContext(AuthContext);
    
    if (!context) {
      // Return default values instead of throwing
      console.warn('useSafeAuth: AuthContext not found, returning default values');
      return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: async () => {
          console.warn('useSafeAuth: login called outside AuthProvider');
          return false;
        },
        register: async () => {
          console.warn('useSafeAuth: register called outside AuthProvider');
          return false;
        },
        loginWithWallet: async () => {
          console.warn('useSafeAuth: loginWithWallet called outside AuthProvider');
          return false;
        },
        updateProfile: async () => {
          console.warn('useSafeAuth: updateProfile called outside AuthProvider');
          return false;
        },
        refreshUser: async () => {
          console.warn('useSafeAuth: refreshUser called outside AuthProvider');
        },
        logout: async () => {
          console.warn('useSafeAuth: logout called outside AuthProvider');
        },
        updateUser: () => {
          console.warn('useSafeAuth: updateUser called outside AuthProvider');
        },
      };
    }
    
    return context;
  } catch (error) {
    console.error('useSafeAuth: Error accessing AuthContext:', error);
    // Return safe defaults if there's any error
    return {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => false,
      register: async () => false,
      loginWithWallet: async () => false,
      updateProfile: async () => false,
      refreshUser: async () => {},
      logout: async () => {},
      updateUser: () => {},
    };
  }
};
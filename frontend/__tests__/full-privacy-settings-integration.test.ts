import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { PrivacyProvider, usePrivacy } from '@/contexts/PrivacyContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the settingsSync service
jest.mock('@/services/settingsSync', () => ({
  syncSettings: {
    load: jest.fn(),
    privacy: jest.fn(),
    interaction: jest.fn(),
    theme: jest.fn()
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Test component to access privacy context
const TestComponent: React.FC = () => {
  const { privacySettings, updatePrivacySetting } = usePrivacy();
  
  return React.createElement(
    'div',
    null,
    React.createElement('div', {
      'data-testid': 'privacy-settings-display'
    }, JSON.stringify(privacySettings)),
    React.createElement(PrivacySettings, null),
    React.createElement('button', {
      'data-testid': 'update-setting',
      onClick: () => updatePrivacySetting('showWallet', !privacySettings.showWallet)
    }, 'Toggle Wallet')
  );
};

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

describe('Full Privacy Settings Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock successful fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/auth/settings')) {
        if (options?.method === 'GET') {
          // GET request - return current settings
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                privacy: {
                  profileVisibility: 'public',
                  activityVisibility: 'followers',
                  showWallet: true,
                  showActivity: false,
                  showOnlineStatus: true,
                  showLastSeen: false,
                  allowTagging: true,
                  allowDirectMessages: false,
                  allowGroupInvites: true,
                  allowMentions: false,
                  dataSharing: 'standard',
                  analyticsOptOut: false,
                  personalizedAds: true,
                  locationTracking: false,
                  activityTracking: true,
                  searchableByEmail: true,
                  searchableByPhone: false,
                  suggestToContacts: true,
                  showInDirectory: false,
                  downloadableContent: true,
                  contentIndexing: false,
                  shareAnalytics: true
                }
              }
            })
          });
        } else if (options?.method === 'PUT') {
          // PUT request - simulate successful update
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              message: 'Settings updated successfully'
            })
          });
        }
      }
      
      // Default response
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      React.createElement(
        AuthProvider, 
        null,
        React.createElement(
          LanguageProvider,
          null,
          React.createElement(
            PrivacyProvider,
            null,
            component
          )
        )
      )
    );
  };

  it('loads privacy settings from backend and displays them correctly', async () => {
    renderWithProviders(React.createElement(TestComponent, null));
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByTestId('privacy-settings-display')).toBeInTheDocument();
    });
    
    // Check that settings were loaded and displayed
    await waitFor(() => {
      const settingsDisplay = screen.getByTestId('privacy-settings-display');
      expect(settingsDisplay.textContent).toContain('public'); // profileVisibility
      expect(settingsDisplay.textContent).toContain('followers'); // activityVisibility
      expect(settingsDisplay.textContent).toContain('true'); // showWallet
    });
  });

  it('updates privacy settings and syncs with backend', async () => {
    renderWithProviders(React.createElement(TestComponent, null));
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('privacy-settings-display')).toBeInTheDocument();
    });
    
    // Find and click a toggle switch
    const toggleButton = screen.getByTestId('update-setting');
    fireEvent.click(toggleButton);
    
    // Wait for the setting to be updated
    await waitFor(() => {
      const settingsDisplay = screen.getByTestId('privacy-settings-display');
      expect(settingsDisplay.textContent).toContain('false'); // showWallet should now be false
    });
    
    // Verify that the backend sync was called
    expect(require('@/services/settingsSync').syncSettings.privacy).toHaveBeenCalled();
  });

  it('displays all privacy setting controls correctly', async () => {
    renderWithProviders(React.createElement(PrivacySettings, null));
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });
    
    // Check for key UI elements
    expect(screen.getByText('Profile Privacy')).toBeInTheDocument();
    expect(screen.getByText('Communication Privacy')).toBeInTheDocument();
    expect(screen.getByText('Data Privacy')).toBeInTheDocument();
    expect(screen.getByText('Search & Discovery')).toBeInTheDocument();
    expect(screen.getByText('Content Privacy')).toBeInTheDocument();
    
    // Check for specific controls
    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    expect(screen.getByText('Activity Visibility')).toBeInTheDocument();
    expect(screen.getByText('Show Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Allow Direct Messages')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing Level')).toBeInTheDocument();
    expect(screen.getByText('Analytics Opt-out')).toBeInTheDocument();
    expect(screen.getByText('Searchable by Email')).toBeInTheDocument();
    expect(screen.getByText('Downloadable Content')).toBeInTheDocument();
  });

  it('handles backend errors gracefully', async () => {
    // Mock a failed backend response
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    renderWithProviders(React.createElement(TestComponent, null));
    
    // Should still render without crashing
    await waitFor(() => {
      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });
    
    // Should show warning in console
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load settings from backend:', expect.any(Error));
    
    consoleWarnSpy.mockRestore();
  });
});
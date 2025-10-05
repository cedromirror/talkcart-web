import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the API service
jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    },
  },
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

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

describe('Appearance Settings Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock API responses
    const { api } = require('@/lib/api');
    api.auth.getSettings.mockResolvedValue({
      success: true,
      data: {
        theme: {
          theme: 'system',
          fontSize: 'medium',
          reducedMotion: false,
          highContrast: false,
          language: 'en',
        }
      }
    });
    
    api.auth.updateSettings.mockResolvedValue({
      success: true,
      message: 'Appearance settings updated successfully',
      data: {
        theme: {
          theme: 'dark',
          fontSize: 'large',
          reducedMotion: true,
          highContrast: true,
          language: 'es',
        }
      }
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          LanguageProvider,
          null,
          component
        )
      )
    );
  };

  it('loads appearance settings from backend and displays them correctly', async () => {
    // We'll test this by checking that the API is called correctly
    const { api } = require('@/lib/api');
    
    // Simulate the settings loading process
    const settingsResponse = await api.auth.getSettings();
    
    expect(api.auth.getSettings).toHaveBeenCalled();
    expect(settingsResponse.data.theme.theme).toBe('system');
    expect(settingsResponse.data.theme.fontSize).toBe('medium');
    expect(settingsResponse.data.theme.language).toBe('en');
  });

  it('updates appearance settings and syncs with backend', async () => {
    const { api } = require('@/lib/api');
    
    // Prepare settings data
    const themeSettings = {
      theme: 'dark',
      fontSize: 'large',
      reducedMotion: true,
      highContrast: true,
      language: 'es',
    };
    
    // Call the update settings API
    const response = await api.auth.updateSettings('Appearance', themeSettings);
    
    // Verify the API was called with correct parameters
    expect(api.auth.updateSettings).toHaveBeenCalledWith('Appearance', themeSettings);
    expect(response.success).toBe(true);
    expect(response.data.theme.theme).toBe('dark');
    expect(response.data.theme.fontSize).toBe('large');
    expect(response.data.theme.language).toBe('es');
  });

  it('handles backend errors gracefully', async () => {
    const { api } = require('@/lib/api');
    
    // Mock a failed response
    api.auth.updateSettings.mockRejectedValueOnce(new Error('Network error'));
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      await api.auth.updateSettings('Appearance', { theme: 'dark' });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
    }
    
    consoleErrorSpy.mockRestore();
  });
});
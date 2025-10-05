import { syncSettings } from '@/services/settingsSync';

// Mock fetch
global.fetch = jest.fn();

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

describe('Settings Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should load settings from backend', async () => {
    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          privacy: {
            profileVisibility: 'public',
            activityVisibility: 'followers'
          },
          theme: {
            mode: 'dark'
          }
        }
      })
    });

    const result = await syncSettings.load();
    
    expect(result).toEqual({
      privacy: {
        profileVisibility: 'public',
        activityVisibility: 'followers'
      },
      theme: {
        mode: 'dark'
      }
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      }
    });
  });

  it('should sync privacy settings to backend', async () => {
    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Settings updated successfully'
      })
    });

    const privacySettings = {
      profileVisibility: 'private',
      activityVisibility: 'public'
    };

    const result = await syncSettings.privacy(privacySettings);
    
    expect(result).toEqual({
      success: true,
      message: 'Settings updated successfully'
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({
        settingType: 'privacy',
        settings: privacySettings
      })
    });
  });

  it('should sync interaction settings to backend', async () => {
    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Settings updated successfully'
      })
    });

    const interactionSettings = {
      notifications: {
        email: true,
        push: false
      },
      media: {
        autoPlayVideos: 'wifi-only'
      }
    };

    const result = await syncSettings.interaction(interactionSettings);
    
    expect(result).toEqual({
      success: true,
      message: 'Settings updated successfully'
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({
        settingType: 'interaction',
        settings: interactionSettings
      })
    });
  });

  it('should sync theme settings to backend', async () => {
    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Settings updated successfully'
      })
    });

    const themeSettings = {
      mode: 'light',
      fontSize: 'large'
    };

    const result = await syncSettings.theme(themeSettings);
    
    expect(result).toEqual({
      success: true,
      message: 'Settings updated successfully'
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer null'
      },
      body: JSON.stringify({
        settingType: 'theme',
        settings: themeSettings
      })
    });
  });

  it('should handle backend errors gracefully', async () => {
    // Mock failed response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await expect(syncSettings.privacy({ profileVisibility: 'public' }))
      .rejects
      .toThrow('Failed to sync privacy settings: Internal Server Error');

    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to sync privacy settings:', expect.any(Error));
    
    consoleWarnSpy.mockRestore();
  });
});
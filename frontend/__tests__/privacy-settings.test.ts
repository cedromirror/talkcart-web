import { syncSettings } from '@/services/settingsSync';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'test-token'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe('Privacy Settings Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load settings from backend', async () => {
    const mockResponse = {
      success: true,
      data: {
        privacy: {
          profileVisibility: 'public',
          showWallet: true,
        },
        theme: {
          mode: 'dark',
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const settings = await syncSettings.load();
    
    expect(settings).toEqual(mockResponse.data);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/settings',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        }),
      })
    );
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const settings = await syncSettings.load();
    
    expect(settings).toEqual({});
  });

  it('should handle non-ok responses gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const settings = await syncSettings.load();
    
    expect(settings).toEqual({});
  });

  it('should sync privacy settings', async () => {
    const privacySettings = {
      profileVisibility: 'private',
      showWallet: false,
    };
    
    const result = await syncSettings.privacy(privacySettings);
    
    expect(result).toBe(true);
  });

  it('should sync interaction settings', async () => {
    const interactionSettings = {
      notifications: {
        email: true,
        push: false,
      },
    };
    
    const result = await syncSettings.interaction(interactionSettings);
    
    expect(result).toBe(true);
  });
});
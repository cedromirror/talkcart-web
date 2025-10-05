import { api } from '@/lib/api';
import { API_URL } from '@/config/index';

// Mock the localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'test-token'),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Settings Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch user settings successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          privacy: {
            profileVisibility: 'public',
            showWallet: true,
          },
          notifications: {
            email: true,
            push: false,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        json: async () => mockResponse,
      } as any);

      const response = await api.auth.getSettings();
      
      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/auth/settings`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('updateSettings', () => {
    it('should update user settings successfully', async () => {
      const settingType = 'Privacy';
      const settingsData = {
        profileVisibility: 'private',
        showWallet: false,
      };

      const mockResponse = {
        success: true,
        message: 'Privacy settings updated successfully',
        data: {
          privacy: settingsData,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        json: async () => mockResponse,
      } as any);

      const response = await api.auth.updateSettings(settingType, settingsData);
      
      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_URL}/auth/settings`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({ settingType, settings: settingsData }),
        })
      );
    });
  });
});
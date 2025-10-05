// Simple test file to verify currency service error handling
/// <reference types="jest" />
import CurrencyService from '@/services/currencyService';

// Mock axios
jest.mock('axios');
import axios from 'axios';

describe('Currency Service', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('fetchLocationBasedCurrency', () => {
    it('should fallback to locale detection on network error', async () => {
      // Mock axios to throw a network error
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-KE'
      });
      
      const currency = await CurrencyService.fetchLocationBasedCurrency();
      expect(currency).toBe('KES');
    });

    it('should return USD as fallback when all methods fail', async () => {
      // Mock axios to throw a network error
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network Error'));
      
      // Mock navigator to throw an error when accessing language
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        get: () => {
          throw new Error('Navigator error');
        },
        configurable: true
      });
      
      const currency = await CurrencyService.fetchLocationBasedCurrency();
      expect(currency).toBe('USD');
      
      // Restore original navigator.language
      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        writable: true,
        configurable: true
      });
    });
  });
});
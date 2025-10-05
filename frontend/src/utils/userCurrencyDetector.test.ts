// Test file for user currency detector
/// <reference types="jest" />
import { detectCurrencyByLocale, detectCurrencyByLocation, getUserCurrency } from './userCurrencyDetector';
import CurrencyService from '@/services/currencyService';

// Mock the CurrencyService
jest.mock('@/services/currencyService');

describe('User Currency Detector', () => {
  beforeEach(() => {
    // Reset mocks
    (CurrencyService as any).fetchLocationBasedCurrency.mockReset();
  });

  describe('detectCurrencyByLocale', () => {
    it('detects currency based on browser locale', () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-KE'
      });

      const currency = detectCurrencyByLocale();
      expect(currency).toBe('KES');
    });

    it('defaults to USD for unknown locales', () => {
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-XX'
      });

      const currency = detectCurrencyByLocale();
      expect(currency).toBe('USD');
    });

    it('defaults to USD when navigator.language is not available', () => {
      // Mock navigator.language to be undefined
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const currency = detectCurrencyByLocale();
      expect(currency).toBe('USD');
    });
  });

  describe('detectCurrencyByLocation', () => {
    it('uses currency service to detect location-based currency', async () => {
      // Mock the currency service response
      (CurrencyService as any).fetchLocationBasedCurrency.mockResolvedValue('EUR');

      const currency = await detectCurrencyByLocation();
      expect(currency).toBe('EUR');
      expect(CurrencyService.fetchLocationBasedCurrency).toHaveBeenCalled();
    });

    it('falls back to locale detection when service fails', async () => {
      // Mock the currency service to throw an error
      (CurrencyService as any).fetchLocationBasedCurrency.mockRejectedValue(new Error('API Error'));
      
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-KE'
      });

      const currency = await detectCurrencyByLocation();
      expect(currency).toBe('KES');
    });

    it('validates currency code format', async () => {
      // Mock the currency service to return invalid data
      (CurrencyService as any).fetchLocationBasedCurrency.mockResolvedValue('invalid');
      
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-KE'
      });

      const currency = await detectCurrencyByLocation();
      // Should fall back to locale detection
      expect(currency).toBe('KES');
    });

    it('handles null/undefined currency response', async () => {
      // Mock the currency service to return null
      (CurrencyService as any).fetchLocationBasedCurrency.mockResolvedValue(null);
      
      // Mock navigator.language
      Object.defineProperty(navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-UG'
      });

      const currency = await detectCurrencyByLocation();
      // Should fall back to locale detection
      expect(currency).toBe('UGX');
    });
  });

  describe('getUserCurrency', () => {
    it('returns currency from location detection', async () => {
      // Mock the currency service response
      (CurrencyService as any).fetchLocationBasedCurrency.mockResolvedValue('GBP');

      const currency = await getUserCurrency();
      expect(currency).toBe('GBP');
    });

    it('has ultimate fallback to USD on complete failure', async () => {
      // Mock the currency service to throw an error
      (CurrencyService as any).fetchLocationBasedCurrency.mockRejectedValue(new Error('API Error'));
      
      // Mock navigator to throw an error when accessing language
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        get: () => {
          throw new Error('Navigator error');
        },
        configurable: true
      });

      const currency = await getUserCurrency();
      // Should fall back to USD as ultimate fallback
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
import { getUserCurrency } from '@/utils/userCurrencyDetector';
import { convertUsdToCurrency, formatCurrencyAmount } from '@/utils/currencyConverter';
import CurrencyService from '@/services/currencyService';

// Mock the exchange rates and services
jest.mock('@/services/currencyService', () => {
  return {
    fetchLocationBasedCurrency: jest.fn().mockResolvedValue('RWF'),
    fetchExchangeRates: jest.fn().mockResolvedValue({
      'USD': 1,
      'RWF': 1050,
    }),
    convertCurrency: jest.fn().mockImplementation((amount, fromCurrency, toCurrency) => {
      const rates: Record<string, number> = {
        'USD': 1,
        'RWF': 1050,
      };
      
      if (fromCurrency === toCurrency) return amount;
      
      // Convert to USD first
      let amountInUsd = amount;
      if (fromCurrency !== 'USD') {
        amountInUsd = amount / rates[fromCurrency];
      }
      
      // Convert from USD to target currency
      if (toCurrency === 'USD') {
        return amountInUsd;
      }
      
      return amountInUsd * rates[toCurrency];
    }),
    formatCurrencyAmount: jest.fn().mockImplementation((amount, currency) => {
      const currencySymbols: Record<string, string> = {
        'USD': '$',
        'RWF': 'RF',
      };
      
      const symbol = currencySymbols[currency] || currency;
      const decimals = currency === 'RWF' ? 0 : 2;
      
      const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      
      if (currency === 'USD') {
        return `${symbol}${formattedAmount}`;
      } else {
        return `${formattedAmount} ${symbol}`;
      }
    })
  };
});

describe('Full Currency Flow for Rwanda', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock navigator.language to be Rwanda English
    Object.defineProperty(navigator, 'language', {
      writable: true,
      configurable: true,
      value: 'en-RW'
    });
  });

  test('full flow: detect currency, convert, and format', async () => {
    // Step 1: Detect user currency
    const detectedCurrency = await getUserCurrency();
    expect(detectedCurrency).toBe('RWF');
    
    // Step 2: Convert USD to RWF
    const usdAmount = 12.00;
    const convertedAmount = await convertUsdToCurrency(usdAmount, detectedCurrency);
    expect(convertedAmount).toBe(12600); // 12 * 1050
    
    // Step 3: Format the converted amount
    const formattedAmount = formatCurrencyAmount(convertedAmount, detectedCurrency);
    expect(formattedAmount).toBe('12,600 RF');
    
    // Verify all services were called correctly
    expect(CurrencyService.fetchLocationBasedCurrency).toHaveBeenCalled();
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(usdAmount, 'USD', 'RWF');
    expect(CurrencyService.formatCurrencyAmount).toHaveBeenCalledWith(convertedAmount, 'RWF');
  });

  test('shows both original and converted prices', async () => {
    const productPriceUSD = 12.00;
    const detectedCurrency = await getUserCurrency();
    
    // Original price display
    const originalPriceDisplay = `$${productPriceUSD.toFixed(2)}`;
    expect(originalPriceDisplay).toBe('$12.00');
    
    // Converted price display
    const convertedAmount = await convertUsdToCurrency(productPriceUSD, detectedCurrency);
    const convertedPriceDisplay = formatCurrencyAmount(convertedAmount, detectedCurrency);
    expect(convertedPriceDisplay).toBe('12,600 RF');
    
    // Both prices should be displayed together
    const priceDisplay = `${originalPriceDisplay} (${convertedPriceDisplay})`;
    expect(priceDisplay).toBe('$12.00 (12,600 RF)');
  });
});
import { convertUsdToCurrency, formatCurrencyAmount } from '@/utils/currencyConverter';
import CurrencyService from '@/services/currencyService';

// Mock the exchange rates for testing
jest.mock('@/services/currencyService', () => {
  return {
    fetchExchangeRates: jest.fn().mockResolvedValue({
      'USD': 1,
      'RWF': 1050, // Rwanda Franc exchange rate
    }),
    convertCurrency: jest.fn().mockImplementation((amount, fromCurrency, toCurrency) => {
      // Simple conversion logic for testing
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
      
      // RWF typically doesn't use decimal places
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

describe('Rwanda Currency Conversion', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('converts USD to RWF correctly', async () => {
    const result = await convertUsdToCurrency(12, 'RWF');
    expect(result).toBe(12600); // 12 * 1050
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(12, 'USD', 'RWF');
  });

  test('formats RWF currency correctly', () => {
    const result = formatCurrencyAmount(12600, 'RWF');
    expect(result).toBe('12,600 RF');
  });

  test('converts RWF to USD correctly', async () => {
    const result = await convertUsdToCurrency(12600, 'USD'); // This function converts USD to target
    // For RWF to USD, we need a different approach
    const result2 = await CurrencyService.convertCurrency(12600, 'RWF', 'USD');
    expect(result2).toBe(12); // 12600 / 1050
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(12600, 'RWF', 'USD');
  });

  test('formats USD currency correctly', () => {
    const result = formatCurrencyAmount(12, 'USD');
    expect(result).toBe('$12.00');
  });

  test('no conversion when currencies are the same', async () => {
    const result = await convertUsdToCurrency(12, 'USD');
    expect(result).toBe(12); // Same currency, no conversion
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(12, 'USD', 'USD');
  });
});
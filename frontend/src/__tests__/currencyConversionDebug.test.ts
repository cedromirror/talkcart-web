import { convertUsdToCurrency, convertCurrencyToUsd, formatCurrencyAmount } from '@/utils/currencyConverter';
import CurrencyService from '@/services/currencyService';

// Mock the exchange rates for testing
jest.mock('@/services/currencyService', () => {
  return {
    fetchExchangeRates: jest.fn().mockResolvedValue({
      'USD': 1,
      'KES': 110,
      'UGX': 3700,
      'EUR': 0.85,
      'GBP': 0.75
    }),
    convertCurrency: jest.fn().mockImplementation((amount, fromCurrency, toCurrency) => {
      // Simple conversion logic for testing
      const rates: Record<string, number> = {
        'USD': 1,
        'KES': 110,
        'UGX': 3700,
        'EUR': 0.85,
        'GBP': 0.75
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
        'EUR': '€',
        'GBP': '£',
        'KES': 'KSh',
        'UGX': 'USh',
      };
      
      const symbol = currencySymbols[currency] || currency;
      const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      if (['USD', 'EUR', 'GBP'].includes(currency)) {
        return `${symbol}${formattedAmount}`;
      } else {
        return `${formattedAmount} ${symbol}`;
      }
    })
  };
});

describe('Currency Conversion Debug', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('converts USD to KES correctly', async () => {
    const result = await convertUsdToCurrency(12, 'KES');
    expect(result).toBe(1320); // 12 * 110
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(12, 'USD', 'KES');
  });

  test('formats KES currency correctly', () => {
    const result = formatCurrencyAmount(1320, 'KES');
    expect(result).toBe('1,320.00 KSh');
  });

  test('converts KES to USD correctly', async () => {
    const result = await convertCurrencyToUsd(1320, 'KES');
    expect(result).toBe(12); // 1320 / 110
    expect(CurrencyService.convertCurrency).toHaveBeenCalledWith(1320, 'KES', 'USD');
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
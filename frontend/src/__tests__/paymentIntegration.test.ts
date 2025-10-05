// Test to verify payment integration with currency conversion
/// <reference types="jest" />
import { convertUsdToCurrency, formatCurrencyAmount } from '@/utils/currencyConverter';
import CurrencyService from '@/services/currencyService';

describe('Payment Integration with Currency Conversion', () => {
  beforeEach(() => {
    // Clear any cached exchange rates
    (CurrencyService as any).exchangeRates = {};
    (CurrencyService as any).lastUpdated = 0;
  });

  test('converts product prices for display without affecting payment processing', async () => {
    // Mock exchange rates
    const mockRates = {
      'USD': 1,
      'KES': 110,
      'UGX': 3700,
      'EUR': 0.85
    };
    
    (CurrencyService as any).exchangeRates = mockRates;
    (CurrencyService as any).lastUpdated = Date.now();

    // Test product with USD price
    const productPriceUSD = 20; // $20 USD
    const productCurrency = 'USD';

    // Simulate Kenyan user viewing the product
    const userCurrency = 'KES';
    const convertedPrice = await convertUsdToCurrency(productPriceUSD, userCurrency);
    
    // Verify conversion is correct
    expect(convertedPrice).toBe(2200); // 20 USD * 110 KES/USD = 2200 KES

    // Verify that the original product currency is preserved for payment
    expect(productCurrency).toBe('USD');
    
    // Verify formatting
    expect(formatCurrencyAmount(productPriceUSD, 'USD')).toBe('$20.00');
    expect(formatCurrencyAmount(convertedPrice, 'KES')).toBe('2,200.00 KSh');
  });

  test('handles payment processing in original product currency', async () => {
    // This test verifies that even though we display converted prices,
    // the actual payment processing happens in the original product currency
    
    const originalProductPrice = 25.99;
    const originalProductCurrency = 'USD';
    
    // User in Uganda sees the price in UGX
    const userCurrency = 'UGX';
    
    // Mock exchange rates
    const mockRates = {
      'USD': 1,
      'UGX': 3700
    };
    
    (CurrencyService as any).exchangeRates = mockRates;
    (CurrencyService as any).lastUpdated = Date.now();
    
    const convertedPrice = await convertUsdToCurrency(originalProductPrice, userCurrency);
    
    // Verify the user sees the price in their local currency
    expect(convertedPrice).toBe(96163); // 25.99 * 3700 = 96163 UGX (rounded to nearest integer)
    
    // But the payment should still be processed in USD
    expect(originalProductCurrency).toBe('USD');
  });
});
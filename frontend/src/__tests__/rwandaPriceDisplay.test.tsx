import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProductCard from '@/components/marketplace/ProductCard';

// Mock the next/image component since it doesn't work in tests
jest.mock('next/image', () => {
  return ({ alt, ...props }: any) => <img alt={alt} {...props} />;
});

// Mock the next/link component
jest.mock('next/link', () => {
  return ({ children, ...props }: any) => <a {...props}>{children}</a>;
});

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

// Mock the currency conversion functions
jest.mock('@/utils/currencyConverter', () => ({
  convertUsdToCurrency: jest.fn().mockResolvedValue(12600),
  convertCurrencyToUsd: jest.fn().mockResolvedValue(12),
  formatCurrencyAmount: jest.fn().mockImplementation((amount, currency) => {
    if (currency === 'RWF') {
      return '12,600 RF';
    }
    return `$${amount.toFixed(2)}`;
  }),
  formatPrice: jest.fn().mockImplementation((price, currency) => {
    if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price} ${currency}`;
  }),
}));

// Mock the user currency detector
jest.mock('@/utils/userCurrencyDetector', () => ({
  getUserCurrency: jest.fn().mockResolvedValue('RWF'),
}));

const theme = createTheme();

const mockProduct = {
  id: '1',
  name: 'Test Product',
  description: 'Test product description',
  price: 12,
  currency: 'USD',
  images: ['https://example.com/image.jpg'],
  category: 'Test',
  vendor: {
    id: '1',
    username: 'testvendor',
    displayName: 'Test Vendor',
    avatar: 'https://example.com/avatar.jpg',
    isVerified: true,
  },
  isNFT: false,
  featured: false,
  tags: ['test'],
  stock: 5,
  rating: 4.5,
  reviewCount: 10,
  sales: 20,
  views: 100,
  availability: 'available',
  createdAt: '2023-01-01',
};

describe('ProductCard Price Display for Rwanda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays RWF as primary price and USD as secondary for Rwanda users', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
          userCurrency="RWF"
        />
      </ThemeProvider>
    );

    // Wait for async operations to complete
    await screen.findByText('12,600 RF');
    
    // Check that RWF price is displayed as primary (more prominent)
    const rwfPrice = screen.getByText('12,600 RF');
    expect(rwfPrice).toBeInTheDocument();
    expect(rwfPrice.tagName).toBe('P'); // Should be a paragraph element like the original price
    
    // Check that USD price is displayed as secondary (less prominent)
    const usdPrice = screen.getByText('$12.00');
    expect(usdPrice).toBeInTheDocument();
    expect(usdPrice.tagName).toBe('SPAN'); // Should be a span element with strikethrough
    expect(usdPrice).toHaveStyle('text-decoration: line-through');
  });

  test('shows USD equivalent information for Rwanda users', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
          userCurrency="RWF"
        />
      </ThemeProvider>
    );

    // Wait for async operations to complete
    await screen.findByText('12,600 RF');
    
    // Check that USD equivalent information is displayed
    const equivalentInfo = screen.getByText('Equivalent to $12.00 USD');
    expect(equivalentInfo).toBeInTheDocument();
    expect(equivalentInfo.tagName).toBe('P');
  });

  test('maintains original display for non-Rwanda users', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
          userCurrency="KES" // Non-Rwanda currency
        />
      </ThemeProvider>
    );

    // Wait for async operations to complete
    await screen.findByText('$12.00');
    
    // Check that USD price is displayed as primary
    const usdPrice = screen.getByText('$12.00');
    expect(usdPrice).toBeInTheDocument();
    expect(usdPrice.tagName).toBe('P');
    
    // Check that converted price is displayed in parentheses
    const convertedPrice = screen.getByText('(12,600 RF)');
    expect(convertedPrice).toBeInTheDocument();
    expect(convertedPrice.tagName).toBe('SPAN');
  });
});
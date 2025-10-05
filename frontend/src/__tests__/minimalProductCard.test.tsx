import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProductCard from '@/components/marketplace/ProductCard';

// Mock the next/image component since it doesn't work in tests
jest.mock('next/image', () => {
  return ({ alt, ...props }: any) => <img alt={alt} {...props} />;
});

// Mock the currency conversion functions
jest.mock('@/utils/currencyConverter', () => ({
  convertUsdToCurrency: jest.fn().mockResolvedValue(12600),
  formatCurrencyAmount: jest.fn().mockImplementation((amount, currency) => {
    if (currency === 'RWF') {
      return '12,600 RF';
    }
    return `$${amount.toFixed(2)}`;
  }),
}));

// Mock the user currency detector
jest.mock('@/utils/userCurrencyDetector', () => ({
  getUserCurrency: jest.fn().mockResolvedValue('USD'),
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

describe('Minimal ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays only image and price', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
        />
      </ThemeProvider>
    );

    // Check that the image is displayed
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');

    // Check that the price is displayed
    const price = screen.getByText('$12.00');
    expect(price).toBeInTheDocument();
    expect(price.tagName).toBe('P');
  });

  test('displays converted price for different currency', async () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
          userCurrency="KES"
        />
      </ThemeProvider>
    );

    // Wait for async operations to complete
    await screen.findByText('(12600.00)');
    
    // Check that the converted price is displayed
    const convertedPrice = screen.getByText('(12600.00)');
    expect(convertedPrice).toBeInTheDocument();
  });

  test('displays view count', () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductCard 
          product={mockProduct}
        />
      </ThemeProvider>
    );

    // Check that the view count is displayed
    const viewCount = screen.getByText('100');
    expect(viewCount).toBeInTheDocument();
  });
});
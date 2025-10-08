import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import VendorMessagingDashboard from '../../pages/marketplace/vendor-messaging';
import * as chatbotApi from '../../src/services/chatbotApi';

// Mock the chatbot API
jest.mock('../../src/services/chatbotApi', () => ({
  searchVendors: jest.fn(),
  searchCustomers: jest.fn(),
}));

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

describe('VendorMessagingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dashboard with tabs', () => {
    render(<VendorMessagingDashboard />);
    
    expect(screen.getByText('Vendor Messaging')).toBeInTheDocument();
    expect(screen.getByText('Search Vendors')).toBeInTheDocument();
    expect(screen.getByText('Search Customers')).toBeInTheDocument();
  });

  it('displays vendor search results', async () => {
    const mockVendors = {
      success: true,
      data: {
        vendors: [
          {
            id: '1',
            username: 'testvendor',
            displayName: 'Test Vendor',
            avatar: '',
            isVerified: true,
            walletAddress: '',
            followerCount: 100,
            followingCount: 50,
            productCount: 5,
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        }
      }
    };

    (chatbotApi.searchVendors as jest.Mock).mockResolvedValue(mockVendors);

    render(<VendorMessagingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
      expect(screen.getByText('5 products')).toBeInTheDocument();
      expect(screen.getByText('100 followers')).toBeInTheDocument();
    });
  });

  it('displays customer search results', async () => {
    const mockCustomers = {
      success: true,
      data: {
        customers: [
          {
            id: '2',
            username: 'testcustomer',
            displayName: 'Test Customer',
            avatar: '',
            isVerified: false,
            createdAt: new Date().toISOString(),
            orderCount: 3,
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        }
      }
    };

    (chatbotApi.searchCustomers as jest.Mock).mockResolvedValue(mockCustomers);

    render(<VendorMessagingDashboard />);

    // Switch to customers tab
    fireEvent.click(screen.getByText('Search Customers'));

    await waitFor(() => {
      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('3 orders')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    const mockVendors = {
      success: true,
      data: {
        vendors: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        }
      }
    };

    (chatbotApi.searchVendors as jest.Mock).mockResolvedValue(mockVendors);

    render(<VendorMessagingDashboard />);

    const searchInput = screen.getByPlaceholderText('Search vendors...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'nonexistent vendor' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('No vendors found')).toBeInTheDocument();
    });
  });
});
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VendorDashboard from '../../pages/marketplace/vendor-dashboard';
import { AuthContext } from '@/contexts/AuthContextDefinition';
import * as nextRouter from 'next/router';

// Mock the AuthContext
const mockUser = {
  id: '1',
  username: 'testvendor',
  email: 'vendor@test.com',
  role: 'vendor',
  displayName: 'Test Vendor',
  isVerified: true,
  avatar: '',
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
};

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  reload: jest.fn(),
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock the API calls
jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      getProfile: jest.fn().mockResolvedValue({
        success: true,
        data: mockUser,
      }),
    },
    marketplace: {
      getCategories: jest.fn().mockResolvedValue({
        success: true,
        data: { categories: [] },
      }),
      getMyProducts: jest.fn().mockResolvedValue({
        success: true,
        data: { products: [], pagination: { pages: 1 } },
      }),
    },
  },
}));

describe('VendorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the vendor dashboard with messaging button', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <VendorDashboard />
      </AuthContext.Provider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('My Store Dashboard')).toBeInTheDocument();
    });

    // Check that the messaging button is present
    expect(screen.getByText('Messaging')).toBeInTheDocument();
    expect(screen.getByText('Payment Settings')).toBeInTheDocument();
    expect(screen.getByText('Vendor Store')).toBeInTheDocument();
  });

  it('navigates to vendor messaging when messaging button is clicked', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <VendorDashboard />
      </AuthContext.Provider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('My Store Dashboard')).toBeInTheDocument();
    });

    // Find and click the messaging button
    const messagingButton = screen.getByText('Messaging');
    messagingButton.click();

    // Check that router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/marketplace/vendor-messaging');
  });
});
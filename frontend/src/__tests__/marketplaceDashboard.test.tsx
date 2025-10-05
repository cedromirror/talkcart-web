import React from 'react';
import { render } from '@testing-library/react';
import MarketplaceDashboard from '../../pages/marketplace/dashboard';

// Mock the useRouter hook
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock the Layout component
jest.mock('@/components/layout/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

describe('MarketplaceDashboard', () => {
  it('renders without crashing', () => {
    render(<MarketplaceDashboard />);
  });
});
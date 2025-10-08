import React from 'react';
import { ProfileProvider, useProfile } from './ProfileContext';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the api module
jest.mock('@/lib/api', () => ({
  api: {
    users: {
      getByUsername: jest.fn(),
    },
  },
}));

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'testuser' },
    updateProfile: jest.fn().mockResolvedValue(true),
  }),
}));

describe('ProfileContext', () => {
  it('should render without crashing', () => {
    const TestComponent = () => {
      const { profile, loading } = useProfile();
      return (
        <div>
          {loading ? 'Loading...' : 'Loaded'}
          {profile ? profile.username : 'No profile'}
        </div>
      );
    };

    const { getByText } = render(
      <ProfileProvider>
        <TestComponent />
      </ProfileProvider>
    );

    expect(getByText('Loading...')).toBeInTheDocument();
  });
});
import React from 'react';
import { render } from '@testing-library/react';
import { InteractionProvider, useInteraction } from '@/contexts/InteractionContext';

// Mock the useSafeAuth hook
jest.mock('@/hooks/useSafeAuth', () => ({
  useSafeAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe('InteractionContext', () => {
  it('should provide default interaction settings', () => {
    let testSettings: any;
    
    // Create a test component that uses the interaction context
    const TestComponent = () => {
      const { interactionSettings } = useInteraction();
      testSettings = interactionSettings;
      return React.createElement('div', null, 'Test');
    };
    
    render(
      React.createElement(
        InteractionProvider,
        null,
        React.createElement(TestComponent)
      )
    );
    
    expect(testSettings.media.autoPlayVideos).toBe('wifi-only');
    expect(testSettings.notifications.frequency).toBe('immediate');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console error for this test
    const consoleError = console.error;
    console.error = jest.fn();
    
    // Create a test component that uses the interaction context
    const TestComponent = () => {
      useInteraction();
      return React.createElement('div', null, 'Test');
    };
    
    expect(() => {
      render(React.createElement(TestComponent));
    }).toThrow('useInteraction must be used within an InteractionProvider');
    
    // Restore console error
    console.error = consoleError;
  });
});
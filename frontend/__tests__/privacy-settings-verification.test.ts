import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock the useLanguage hook to return default values
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en'
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => 
    React.createElement(React.Fragment, null, children)
}));

describe('Privacy Settings Component', () => {
  it('renders privacy settings component correctly', () => {
    render(
      React.createElement(
        PrivacyProvider,
        null,
        React.createElement(PrivacySettings, null)
      )
    );
    
    // Check that the main title is rendered
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    
    // Check for section titles
    expect(screen.getByText('Profile Privacy')).toBeInTheDocument();
    expect(screen.getByText('Communication Privacy')).toBeInTheDocument();
    expect(screen.getByText('Data Privacy')).toBeInTheDocument();
    expect(screen.getByText('Search & Discovery')).toBeInTheDocument();
    expect(screen.getByText('Content Privacy')).toBeInTheDocument();
    
    // Check for specific setting labels
    expect(screen.getByText('Profile Visibility')).toBeInTheDocument();
    expect(screen.getByText('Activity Visibility')).toBeInTheDocument();
    expect(screen.getByText('Show Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Allow Direct Messages')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing Level')).toBeInTheDocument();
    expect(screen.getByText('Analytics Opt-out')).toBeInTheDocument();
    expect(screen.getByText('Searchable by Email')).toBeInTheDocument();
    expect(screen.getByText('Downloadable Content')).toBeInTheDocument();
  });
});
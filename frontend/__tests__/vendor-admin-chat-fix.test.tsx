import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VendorAdminChatPage from '../pages/marketplace/vendor-admin-chat';

// Mock the useRouter hook
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'test-user-id', role: 'vendor' },
  }),
}));

// Mock the chatbotApiModule
jest.mock('@/services/chatbotApi', () => ({
  __esModule: true,
  default: {
    getVendorAdminConversation: jest.fn(),
    createVendorAdminConversation: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

// Create a simple theme for testing
const theme = createTheme();

describe('Vendor Admin Chat Fix Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle API errors without infinite retries', async () => {
    const chatbotApiModule = require('@/services/chatbotApi').default;
    
    // Mock API calls to fail
    chatbotApiModule.getVendorAdminConversation.mockResolvedValue({
      success: false,
      data: { conversation: null },
    });
    
    chatbotApiModule.createVendorAdminConversation.mockResolvedValue({
      success: false,
      data: { conversation: null, isNew: false },
      message: 'Failed to create conversation'
    });
    
    chatbotApiModule.getMessages.mockResolvedValue({
      success: false,
      data: { messages: [], pagination: {} },
    });

    const { container } = render(
      <ThemeProvider theme={theme}>
        <VendorAdminChatPage />
      </ThemeProvider>
    );
    
    // Wait for the component to handle the errors
    await waitFor(() => {
      expect(screen.getByText(/Failed to load or start conversation/)).toBeInTheDocument();
    });
    
    expect(container).toBeInTheDocument();
  });

  test('should handle successful conversation creation', async () => {
    const chatbotApiModule = require('@/services/chatbotApi').default;
    
    // Mock API calls to succeed
    chatbotApiModule.getVendorAdminConversation.mockResolvedValue({
      success: true,
      data: { conversation: null },
    });
    
    chatbotApiModule.createVendorAdminConversation.mockResolvedValue({
      success: true,
      data: { 
        conversation: { 
          _id: 'test-conversation-id',
          customerId: 'admin',
          vendorId: 'test-vendor-id',
          productId: 'test-product-id',
          productName: 'Test Product',
          lastActivity: new Date().toISOString(),
          isActive: true,
          isResolved: false
        }, 
        isNew: true 
      },
      message: 'Conversation created successfully'
    });
    
    chatbotApiModule.getMessages.mockResolvedValue({
      success: true,
      data: { 
        messages: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalMessages: 0,
          hasMore: false
        }
      },
    });

    const { container } = render(
      <ThemeProvider theme={theme}>
        <VendorAdminChatPage />
      </ThemeProvider>
    );
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome to Admin Support Chat/)).toBeInTheDocument();
    });
    
    expect(container).toBeInTheDocument();
  });
});
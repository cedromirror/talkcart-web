import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ChatbotTestPage from '../../pages/marketplace/chatbot-test';
import * as chatbotApi from '../../src/services/chatbotApi';
import { AuthContext } from '@/contexts/AuthContextDefinition';

// Mock the chatbot API
jest.mock('../../src/services/chatbotApi', () => ({
  getConversations: jest.fn(),
  createConversation: jest.fn(),
  getMessages: jest.fn(),
  sendMessage: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  replyToMessage: jest.fn(),
}));

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock auth context
const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  displayName: 'Test User',
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

describe('ChatbotTestPage - Message Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chat interface with message actions', async () => {
    const mockConversations = {
      success: true,
      data: {
        conversations: [
          {
            _id: 'conv1',
            customerId: 'user123',
            vendorId: 'vendor123',
            productId: 'product123',
            productName: 'Test Product',
            lastActivity: new Date().toISOString(),
            isActive: true,
            isResolved: false,
          }
        ]
      }
    };

    const mockMessages = {
      success: true,
      data: {
        messages: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: 'user123',
            content: 'Hello, I have a question',
            type: 'text',
            isBotMessage: false,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      }
    };

    (chatbotApi.getConversations as jest.Mock).mockResolvedValue(mockConversations);
    (chatbotApi.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ChatbotTestPage />
      </AuthContext.Provider>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select the conversation
    fireEvent.click(screen.getByText('Test Product'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question')).toBeInTheDocument();
    });

    // Check that message action button is present
    expect(screen.getByTestId('MoreVertIcon')).toBeInTheDocument();
  });

  it('opens message action menu when clicking the menu button', async () => {
    const mockConversations = {
      success: true,
      data: {
        conversations: [
          {
            _id: 'conv1',
            customerId: 'user123',
            vendorId: 'vendor123',
            productId: 'product123',
            productName: 'Test Product',
            lastActivity: new Date().toISOString(),
            isActive: true,
            isResolved: false,
          }
        ]
      }
    };

    const mockMessages = {
      success: true,
      data: {
        messages: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: 'user123',
            content: 'Hello, I have a question',
            type: 'text',
            isBotMessage: false,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      }
    };

    (chatbotApi.getConversations as jest.Mock).mockResolvedValue(mockConversations);
    (chatbotApi.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ChatbotTestPage />
      </AuthContext.Provider>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select the conversation
    fireEvent.click(screen.getByText('Test Product'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question')).toBeInTheDocument();
    });

    // Click the message action button
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    if (menuButton) {
      fireEvent.click(menuButton);
    }

    // Check that menu items are present
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });
  });

  it('opens edit dialog when edit is selected', async () => {
    const mockConversations = {
      success: true,
      data: {
        conversations: [
          {
            _id: 'conv1',
            customerId: 'user123',
            vendorId: 'vendor123',
            productId: 'product123',
            productName: 'Test Product',
            lastActivity: new Date().toISOString(),
            isActive: true,
            isResolved: false,
          }
        ]
      }
    };

    const mockMessages = {
      success: true,
      data: {
        messages: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: 'user123',
            content: 'Hello, I have a question',
            type: 'text',
            isBotMessage: false,
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      }
    };

    (chatbotApi.getConversations as jest.Mock).mockResolvedValue(mockConversations);
    (chatbotApi.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ChatbotTestPage />
      </AuthContext.Provider>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select the conversation
    fireEvent.click(screen.getByText('Test Product'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question')).toBeInTheDocument();
    });

    // Click the message action button
    const menuButton = screen.getByTestId('MoreVertIcon').closest('button');
    if (menuButton) {
      fireEvent.click(menuButton);
    }

    // Click edit
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));

    // Check that edit dialog is open
    await waitFor(() => {
      expect(screen.getByText('Edit Message')).toBeInTheDocument();
    });
  });

  it('shows (edited) indicator for edited messages', async () => {
    const mockConversations = {
      success: true,
      data: {
        conversations: [
          {
            _id: 'conv1',
            customerId: 'user123',
            vendorId: 'vendor123',
            productId: 'product123',
            productName: 'Test Product',
            lastActivity: new Date().toISOString(),
            isActive: true,
            isResolved: false,
          }
        ]
      }
    };

    const mockMessages = {
      success: true,
      data: {
        messages: [
          {
            _id: 'msg1',
            conversationId: 'conv1',
            senderId: 'user123',
            content: 'Hello, I have a question',
            type: 'text',
            isBotMessage: false,
            isEdited: true,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ]
      }
    };

    (chatbotApi.getConversations as jest.Mock).mockResolvedValue(mockConversations);
    (chatbotApi.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(
      <AuthContext.Provider value={mockAuthContext as any}>
        <ChatbotTestPage />
      </AuthContext.Provider>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    // Select the conversation
    fireEvent.click(screen.getByText('Test Product'));

    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question')).toBeInTheDocument();
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });
  });
});

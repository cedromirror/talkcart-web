import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeContextType {
  stripe: Stripe | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializeStripe = async () => {
    try {
      console.log('🔄 Initializing Stripe.js...');
      setIsLoading(true);
      setError(null);

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      console.log('🔑 Publishable key present:', !!publishableKey);
      console.log('🔑 Key format:', publishableKey?.substring(0, 10) + '...');
      
      if (!publishableKey) {
        console.warn('⚠️ Stripe publishable key is not configured. Stripe functionality will be disabled.');
        setError('Stripe is not configured - payments are disabled');
        setStripe(null); // Explicitly set to null for clarity
        return;
      }

      // Validate the publishable key format
      if (!publishableKey.startsWith('pk_')) {
        console.error('❌ Invalid Stripe publishable key format');
        throw new Error('Invalid Stripe publishable key format');
      }

      console.log('📡 Loading Stripe.js from CDN...');
      const stripeInstance = await loadStripe(publishableKey);
      
      if (!stripeInstance) {
        console.error('❌ Stripe.js returned null');
        throw new Error('Failed to load Stripe.js - please check your internet connection and try again');
      }

      console.log('✅ Stripe.js loaded successfully:', stripeInstance);
      setStripe(stripeInstance);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('❌ Error initializing Stripe:', err);
      
      // More detailed error handling
      let errorMessage = 'Failed to initialize Stripe';
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check for specific error types
        if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error loading Stripe.js - check your internet connection';
        } else if (err.message.includes('blocked') || err.message.includes('CSP')) {
          errorMessage = 'Stripe.js blocked by security policy - check browser console';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const retry = () => {
    if (retryCount < 3) { // Limit retries to prevent infinite loops
      setRetryCount(prev => prev + 1);
      initializeStripe();
    }
  };

  useEffect(() => {
    initializeStripe();
  }, []);

  const contextValue: StripeContextType = {
    stripe,
    isLoading,
    error,
    retry
  };

  return (
    <StripeContext.Provider value={contextValue}>
      {children}
    </StripeContext.Provider>
  );
};

// Higher-order component to wrap components that need Stripe Elements
interface StripeElementsWrapperProps {
  children: React.ReactNode;
  clientSecret?: string;
}

export const StripeElementsWrapper: React.FC<StripeElementsWrapperProps> = ({ 
  children, 
  clientSecret 
}) => {
  const { stripe, isLoading, error, retry } = useStripe();

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
        gap: '10px'
      }}>
        <div>Loading payment system...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Initializing Stripe.js
        </div>
      </div>
    );
  }

  if (error || !stripe) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
        gap: '15px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
          Payment System Error
        </div>
        <div style={{ color: '#666', fontSize: '14px' }}>
          {error || 'Stripe not available'}
        </div>
        <button 
          onClick={retry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const options: import('@stripe/stripe-js').StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#1976d2',
        colorBackground: '#ffffff',
        colorText: '#000000',
        colorDanger: '#df1b41',
        borderRadius: '4px',
      },
    },
  };

  return (
    <Elements stripe={stripe} options={clientSecret ? options : undefined}>
      {children}
    </Elements>
  );
};
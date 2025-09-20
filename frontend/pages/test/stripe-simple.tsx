import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const StripeSimpleTest: React.FC = () => {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testStripe = async () => {
      try {
        console.log('Testing Stripe.js loading...');
        console.log('Publishable Key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        
        if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
          throw new Error('No publishable key found');
        }

        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        
        if (!stripe) {
          throw new Error('Stripe.js failed to load');
        }

        console.log('Stripe.js loaded successfully:', stripe);
        setStatus('✅ Stripe.js loaded successfully!');
      } catch (err) {
        console.error('Stripe loading error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('❌ Failed to load Stripe.js');
      }
    };

    testStripe();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Simple Stripe.js Test</h1>
      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        <h3>Debug Info:</h3>
        <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
        <div><strong>Next.js Version:</strong> {process.env.__NEXT_VERSION || 'Unknown'}</div>
        <div><strong>Publishable Key Present:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Yes' : 'No'}</div>
        <div><strong>Key Format Valid:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') ? 'Yes' : 'No'}</div>
        <div><strong>User Agent:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</div>
      </div>
    </div>
  );
};

export default StripeSimpleTest;
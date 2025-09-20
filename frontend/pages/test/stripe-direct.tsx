import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';

// Direct Stripe loading without context
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const TestComponent: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    if (stripe) {
      setStatus('✅ Stripe is ready!');
      console.log('Stripe instance:', stripe);
    } else {
      setStatus('⏳ Waiting for Stripe...');
    }
  }, [stripe]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Direct Stripe Test</h2>
      <div><strong>Status:</strong> {status}</div>
      <div><strong>Stripe Instance:</strong> {stripe ? 'Available' : 'Not Available'}</div>
      <div><strong>Elements:</strong> {elements ? 'Available' : 'Not Available'}</div>
    </div>
  );
};

const StripeDirectTest: React.FC = () => {
  const [promiseStatus, setPromiseStatus] = useState('Loading...');

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (stripe) {
        setPromiseStatus('✅ Stripe Promise resolved successfully');
        console.log('Stripe loaded via promise:', stripe);
      } else {
        setPromiseStatus('❌ Stripe Promise resolved to null');
      }
    }).catch((error) => {
      setPromiseStatus('❌ Stripe Promise rejected: ' + error.message);
      console.error('Stripe loading error:', error);
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Direct Stripe.js Test (No Context)</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Promise Status:</h3>
        <div>{promiseStatus}</div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
        <h3>Elements Test:</h3>
        <Elements stripe={stripePromise}>
          <TestComponent />
        </Elements>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#fff5f5', borderRadius: '5px' }}>
        <h3>Debug Info:</h3>
        <div><strong>Publishable Key:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Present' : 'Missing'}</div>
        <div><strong>Browser:</strong> {typeof window !== 'undefined' ? 'Client' : 'Server'}</div>
        <div><strong>Network:</strong> {typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Unknown'}</div>
      </div>
    </div>
  );
};

export default StripeDirectTest;
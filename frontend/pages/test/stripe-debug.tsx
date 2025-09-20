import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { useStripe as useStripeContext } from '@/contexts/StripeContext';

// Test 1: Direct loadStripe call
const TestDirectLoad: React.FC = () => {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const test = async () => {
      try {
        console.log('Test 1: Direct loadStripe call');
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
        if (stripe) {
          setStatus('✅ SUCCESS: Direct loadStripe works');
          console.log('Direct loadStripe success:', stripe);
        } else {
          setStatus('❌ FAILED: Direct loadStripe returned null');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setStatus('❌ FAILED: Direct loadStripe threw error');
        setError(message);
        console.error('Direct loadStripe error:', err);
      }
    };
    test();
  }, []);

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', margin: '10px 0', borderRadius: '5px' }}>
      <h3>Test 1: Direct loadStripe()</h3>
      <div><strong>Status:</strong> {status}</div>
      {error && <div style={{ color: 'red' }}><strong>Error:</strong> {error}</div>}
    </div>
  );
};

// Test 2: Elements wrapper test
const ElementsInner: React.FC = () => {
  const stripe = useStripe();
  const elements = useElements();
  
  return (
    <div>
      <div><strong>Stripe Hook:</strong> {stripe ? '✅ Available' : '❌ Not Available'}</div>
      <div><strong>Elements Hook:</strong> {elements ? '✅ Available' : '❌ Not Available'}</div>
    </div>
  );
};

const TestElements: React.FC = () => {
  const [stripePromise] = useState(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''));

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', margin: '10px 0', borderRadius: '5px' }}>
      <h3>Test 2: Elements Wrapper</h3>
      <Elements stripe={stripePromise}>
        <ElementsInner />
      </Elements>
    </div>
  );
};

// Test 3: Context test
const TestContext: React.FC = () => {
  const { stripe, isLoading, error } = useStripeContext();

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', margin: '10px 0', borderRadius: '5px' }}>
      <h3>Test 3: Stripe Context</h3>
      <div><strong>Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}</div>
      <div><strong>Error:</strong> {error || '✅ None'}</div>
      <div><strong>Stripe Instance:</strong> {stripe ? '✅ Available' : '❌ Not Available'}</div>
    </div>
  );
};

// Test 4: Network test
const TestNetwork: React.FC = () => {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    const testNetwork = async () => {
      try {
        console.log('Test 4: Network connectivity to Stripe');
        const response = await fetch('https://js.stripe.com/v3/', { method: 'HEAD' });
        if (response.ok) {
          setStatus('✅ SUCCESS: Can reach Stripe CDN');
        } else {
          setStatus(`❌ FAILED: Stripe CDN returned ${response.status}`);
        }
      } catch (err) {
        setStatus('❌ FAILED: Cannot reach Stripe CDN');
        console.error('Network test error:', err);
      }
    };
    testNetwork();
  }, []);

  return (
    <div style={{ padding: '15px', border: '1px solid #ddd', margin: '10px 0', borderRadius: '5px' }}>
      <h3>Test 4: Network Connectivity</h3>
      <div><strong>Status:</strong> {status}</div>
    </div>
  );
};

const StripeDebugPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔍 Stripe.js Debug Suite</h1>
      <p>This page runs comprehensive tests to identify Stripe.js loading issues.</p>

      {/* Environment Info */}
      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', margin: '10px 0', borderRadius: '5px' }}>
        <h3>Environment Information</h3>
        <div><strong>Node Environment:</strong> {process.env.NODE_ENV}</div>
        <div><strong>Next.js Version:</strong> 15.5.3</div>
        <div><strong>Publishable Key:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
          `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}...` : 
          'NOT SET'
        }</div>
        <div><strong>Key Valid:</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') ? '✅' : '❌'}</div>
        <div><strong>Browser:</strong> {typeof window !== 'undefined' ? window.navigator.userAgent.split(' ')[0] : 'Server'}</div>
        <div><strong>Online:</strong> {typeof navigator !== 'undefined' ? (navigator.onLine ? '✅' : '❌') : 'Unknown'}</div>
      </div>

      {/* Tests */}
      <TestDirectLoad />
      <TestElements />
      <TestContext />
      <TestNetwork />

      {/* Instructions */}
      <div style={{ padding: '15px', backgroundColor: '#fff3cd', margin: '10px 0', borderRadius: '5px' }}>
        <h3>🔧 Troubleshooting Instructions</h3>
        <ol>
          <li><strong>Check Browser Console:</strong> Open DevTools and look for errors</li>
          <li><strong>Check Network Tab:</strong> Look for failed requests to js.stripe.com</li>
          <li><strong>Disable Extensions:</strong> Try in incognito mode</li>
          <li><strong>Check Firewall:</strong> Ensure js.stripe.com is not blocked</li>
          <li><strong>Try Different Browser:</strong> Test in Chrome, Firefox, Safari</li>
        </ol>
      </div>

      {/* Console Instructions */}
      <div style={{ padding: '15px', backgroundColor: '#d1ecf1', margin: '10px 0', borderRadius: '5px' }}>
        <h3>📊 Console Output</h3>
        <p>Check the browser console for detailed logs. Each test logs its progress and any errors.</p>
        <p><strong>Expected logs:</strong></p>
        <ul>
          <li>🔄 Initializing Stripe.js...</li>
          <li>🔑 Publishable key present: true</li>
          <li>📡 Loading Stripe.js from CDN...</li>
          <li>✅ Stripe.js loaded successfully</li>
        </ul>
      </div>
    </div>
  );
};

export default StripeDebugPage;
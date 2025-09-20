import React from 'react';

const EnvCheck: React.FC = () => {
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Environment Variables Check</h1>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
        <h3>Stripe Configuration:</h3>
        <div><strong>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:</strong></div>
        <div style={{ 
          backgroundColor: stripeKey ? '#e8f5e8' : '#ffe8e8', 
          padding: '10px', 
          borderRadius: '3px',
          marginTop: '5px',
          wordBreak: 'break-all'
        }}>
          {stripeKey || 'NOT SET'}
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <strong>Key Validation:</strong>
          <ul>
            <li>Present: {stripeKey ? '✅' : '❌'}</li>
            <li>Starts with pk_: {stripeKey?.startsWith('pk_') ? '✅' : '❌'}</li>
            <li>Test Mode: {stripeKey?.includes('test') ? '✅ (Test)' : stripeKey?.includes('live') ? '⚠️ (Live)' : '❓'}</li>
            <li>Length: {stripeKey?.length || 0} characters</li>
          </ul>
        </div>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        <h3>Other Environment Variables:</h3>
        <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
        <div><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}</div>
        <div><strong>NEXT_PUBLIC_BACKEND_URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT SET'}</div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
        <h3>Troubleshooting Steps:</h3>
        <ol>
          <li>Ensure .env file exists in frontend directory</li>
          <li>Restart the development server after changing .env</li>
          <li>Check that the variable name starts with NEXT_PUBLIC_</li>
          <li>Verify no extra spaces or quotes in the .env file</li>
        </ol>
      </div>
    </div>
  );
};

export default EnvCheck;
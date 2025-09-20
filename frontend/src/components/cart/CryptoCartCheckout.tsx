import React, { useCallback, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useCart } from '@/contexts/CartContext';
import { connectWallet, getProvider } from '@/lib/web3';
import { ethers } from 'ethers';

interface CryptoCartCheckoutProps {
  onPaid: (args: { txHash: string; walletAddress: string; networkId: number }) => Promise<void> | void;
}

// NOTE: This is a basic example that sends a 0-value transaction to self for demonstration.
// In a real flow, you'd send the exact required amount to a merchant address or execute a contract call.
const CryptoCartCheckout: React.FC<CryptoCartCheckoutProps> = ({ onPaid }) => {
  const { cart } = useCart();
  const [address, setAddress] = useState<string>('');
  const [networkId, setNetworkId] = useState<number>(0);
  const [connecting, setConnecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const result = await connectWallet();
      if (!result) throw new Error('Wallet connection failed');
      setAddress(result.address);
      setNetworkId(result.chainId);
    } catch (e: any) {
      setError(e?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }, []);

  const handlePay = useCallback(async () => {
    setError(null);
    setPaying(true);
    try {
      const provider = getProvider();
      if (!provider) throw new Error('No Ethereum provider found');
      if (!address || !networkId) throw new Error('Connect wallet first');

      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner();

      // Example tx: 0 ETH to self (replace with merchant/contract call in real flow)
      const tx = await signer.sendTransaction({ to: address, value: ethers.parseEther('0') });
      const receipt = await browserProvider.waitForTransaction(tx.hash);
      if (!receipt || receipt.status !== 1n) throw new Error('Transaction failed');

      await onPaid({ txHash: tx.hash, walletAddress: address, networkId });
    } catch (e: any) {
      setError(e?.message || 'Crypto payment failed');
    } finally {
      setPaying(false);
    }
  }, [address, networkId, onPaid]);

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {!address ? (
        <Button variant="contained" onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </Button>
      ) : (
        <Box>
          <Typography variant="body2">Connected: {address}</Typography>
          <Typography variant="body2">Network ID: {networkId}</Typography>
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Button variant="contained" onClick={handlePay} disabled={!address || paying}>
        {paying ? 'Confirming…' : 'Confirm Crypto Payment'}
      </Button>

      <Typography variant="caption" color="text.secondary">
        Demo: sends a 0-value tx to your own address and uses its txHash.
      </Typography>
    </Stack>
  );
};

export default CryptoCartCheckout;
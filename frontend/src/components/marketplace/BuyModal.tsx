import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
  Alert,
} from '@mui/material';
import { ethers } from 'ethers';
import { useWeb3 } from '@/contexts/Web3Context';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
const StripeCartCheckout = dynamic(() => import('@/components/cart/StripeCartCheckout'), { ssr: false });

// Minimal ERC721 ABI for transfer
const ERC721_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId)'
];

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
}

const BuyModal: React.FC<BuyModalProps> = ({ open, onClose, product }) => {
  const { connected, account, chainId, switchChain, connect } = useWeb3();
  const [tab, setTab] = useState<'nft' | 'crypto' | 'stripe'>(product?.isNFT ? 'nft' : 'crypto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDC' | 'USDT'>('ETH');

  const vendorWallet = product?.vendor?.walletAddress || product?.vendorId?.walletAddress;
  const isOutOfStock = typeof product?.stock === 'number' && product.stock <= 0 && !product.isNFT;

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setTxHash(null);
    }
  }, [open]);

  const canProceed = useMemo(() => {
    if (isOutOfStock) return false;
    if (!vendorWallet) return false;
    if (product?.isNFT) {
      // For NFT transfers, the vendor must sign the tx (transfer from vendor -> buyer)
      return connected && account && account.toLowerCase() === String(vendorWallet).toLowerCase();
    }
    // For crypto/stripe checkout, buyer can proceed when wallet connected (crypto) or always for Stripe UI
    return true;
  }, [isOutOfStock, vendorWallet, product?.isNFT, connected, account]);

  // Initiate purchase: for NFTs (no payment), or finalize non-NFT after real payment
  const initiateBuy = async (body?: { paymentMethod?: 'stripe' | 'crypto'; paymentDetails?: any }) => {
    return api.marketplace.buyProduct(product.id, body);
  };

  // Execute NFT transfer using vendor wallet
  const handleNFTTransfer = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!connected) {
        const ok = await connect();
        if (!ok) return;
      }

      const res: any = await initiateBuy();
      if (!res?.success) throw new Error(res?.error || 'Failed to initiate buy');

      const payment = res.data?.payment;
      if (payment?.status !== 'requires_client_signature' || payment?.instructions?.type !== 'erc721_transfer') {
        throw new Error('Unexpected server response for NFT purchase');
      }

      const instr = payment.instructions;
      const requiredChainId = Number(instr.networkId) || 1;
      if (chainId !== requiredChainId) {
        const switched = await switchChain(requiredChainId);
        if (!switched) throw new Error('Please switch to the required network');
      }

      // Build contract and send transaction
      const provider = (window as any).ethereum;
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Validate signer is the vendor
      const signerAddr = await signer.getAddress();
      if (signerAddr.toLowerCase() !== String(instr.from).toLowerCase()) {
        throw new Error('Please switch to the vendor wallet to transfer the NFT');
      }

      const contract = new ethers.Contract(instr.contractAddress, ERC721_ABI, signer);
      const tx = await contract.safeTransferFrom(instr.from, instr.to, BigInt(instr.tokenId));
      const receipt = await tx.wait();

      setTxHash(tx.hash);
      setSuccess('NFT transferred successfully');
    } catch (e: any) {
      setError(e?.message || 'NFT transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // Crypto checkout (ETH / USDC / USDT)
  const handleCryptoCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!connected) {
        const ok = await connect();
        if (!ok) return;
      }

      if (!vendorWallet) throw new Error('Vendor wallet not available');

      const provider = (window as any).ethereum;
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      let txHashLocal = '';

      if (selectedToken === 'ETH') {
        const valueWei = ethers.parseEther(String(product.price));
        const tx = await signer.sendTransaction({ to: vendorWallet, value: valueWei });
        await tx.wait();
        txHashLocal = tx.hash;
      } else {
        // ERC20 transfer path. NOTE: assumes 6 decimals for USDC/USDT.
        const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
          USDC: {
            1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet USDC (old) — adjust if needed
            137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon USDC.e
          },
          USDT: {
            1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            137: '0xC2132D05D31c914a87C6611C10748AEb04B58e8F',
          },
        };
        const currentChain = chainId || 1;
        const tokenAddress = TOKEN_ADDRESSES[selectedToken]?.[currentChain];
        if (!tokenAddress) throw new Error(`${selectedToken} not supported on current network`);

        const ERC20_ABI = [
          'function transfer(address to, uint256 value) returns (bool)',
          'function decimals() view returns (uint8)',
        ];
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        // Attempt to fetch decimals; fallback to 6 if fails
        let decimals = 6;
        try { decimals = await contract.decimals(); } catch {}
        // Use parseUnits to avoid floating point errors
        const value = ethers.parseUnits(String(product.price), Number(decimals));
        const tx = await contract.transfer(vendorWallet, value);
        await tx.wait();
        txHashLocal = tx.hash;
      }

      setTxHash(txHashLocal);
      setSuccess('Payment sent successfully');

      // Finalize purchase on server with crypto payment proof
      const from = await signer.getAddress();
      const res: any = await initiateBuy({ paymentMethod: 'crypto', paymentDetails: { txHash: txHashLocal, from } });
      if (!res?.success) throw new Error(res?.error || 'Failed to finalize order');
    } catch (e: any) {
      setError(e?.message || 'Crypto checkout failed');
    } finally {
      setLoading(false);
    }
  };

  // Stripe checkout placeholder
  const handleStripeCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      // TODO: Call backend to create PaymentIntent when Stripe is configured
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY on backend and integrate stripe-js.');
    } catch (e: any) {
      setError(e?.message || 'Stripe checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const renderNFTTab = () => (
    <Stack spacing={2}>
      <Alert severity="info">
        NFT transfer will be executed from vendor wallet to buyer wallet.
      </Alert>
      <Typography variant="body2">Vendor wallet: {vendorWallet || 'N/A'}</Typography>
      <Typography variant="body2">Connected wallet: {account || 'Not connected'}</Typography>
      <Typography variant="body2">Price: {product.price} {product.currency}</Typography>
      {!canProceed && (
        <Alert severity="warning">
          {isOutOfStock
            ? 'Out of stock'
            : !vendorWallet
              ? 'Missing vendor wallet address'
              : 'Please connect the vendor wallet to proceed'}
        </Alert>
      )}
      <Button variant="contained" disabled={!canProceed || loading} onClick={handleNFTTransfer}>
        {loading ? 'Transferring…' : 'Transfer NFT'}
      </Button>
    </Stack>
  );

  const renderCryptoTab = () => (
    <Stack spacing={2}>
      <Typography variant="body2">Pay to: {vendorWallet || 'N/A'}</Typography>
      <FormControl fullWidth>
        <InputLabel id="token">Token</InputLabel>
        <Select labelId="token" label="Token" value={selectedToken} onChange={(e) => setSelectedToken(e.target.value as any)}>
          <MenuItem value="ETH">ETH</MenuItem>
          <MenuItem value="USDC">USDC</MenuItem>
          <MenuItem value="USDT">USDT</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="body2">Amount: {product.price} {product.currency}</Typography>
      {!vendorWallet && <Alert severity="warning">Missing vendor wallet address</Alert>}
      {isOutOfStock && <Alert severity="warning">Out of stock</Alert>}
      <Button variant="contained" disabled={!vendorWallet || isOutOfStock || loading} onClick={handleCryptoCheckout}>
        {loading ? 'Processing…' : 'Pay with Wallet'}
      </Button>
    </Stack>
  );

  const renderStripeTab = () => (
    <Stack spacing={2}>
      {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
        <Alert severity="info">Stripe publishable key not set. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable.</Alert>
      ) : (
        <StripeCartCheckout
          custom={{
            // Pass exact item, currency, and metadata to dedicated endpoint
            items: [{ id: String(product.id), name: product.name, price: Number(product.price), quantity: 1 }],
            currency: (product.currency || 'USD').toLowerCase(),
            metadata: { productId: String(product.id) },
            idempotencyKey: `product-${product.id}-user-${Date.now()}`,
          }}
          onPaid={async (paymentIntentId: string) => {
            try {
              const res: any = await initiateBuy({ paymentMethod: 'stripe', paymentDetails: { paymentIntentId } });
              if (!res?.success) throw new Error(res?.error || 'Failed to finalize order');
              setSuccess('Payment completed');
            } catch (e: any) {
              setError(e?.message || 'Failed to finalize order after payment');
            }
          }}
        />
      )}
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Checkout</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {product.name}
        </Typography>
        <Typography variant="body2" gutterBottom>
          Price: {product.price} {product.currency}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1, mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            {product.isNFT && <Tab label="NFT" value="nft" />}
            <Tab label="Crypto" value="crypto" />
            <Tab label="Stripe" value="stripe" />
          </Tabs>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}{txHash ? ` (tx: ${txHash.slice(0, 10)}...)` : ''}</Alert>}

        {tab === 'nft' && product.isNFT && renderNFTTab()}
        {tab === 'crypto' && renderCryptoTab()}
        {tab === 'stripe' && renderStripeTab()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuyModal;
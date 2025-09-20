import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { normalizeAuthError } from '@/lib/authErrors';

export interface WalletBalance {
  eth: number;
  usd: number;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: number;
  decimals: number;
  price: number;
  usdValue: number;
  change24h: number;
  logo: string;
}

export interface Transaction {
  hash: string;
  type: 'send' | 'receive';
  amount: number;
  token: string;
  from: string;
  to: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed: number;
  gasPrice: number;
  blockNumber: number;
}

export interface WalletPortfolio {
  walletAddress: string;
  totalBalance: WalletBalance;
  ethBalance: {
    amount: number;
    usdValue: number;
    price: number;
    change24h: number;
  };
  tokens: TokenBalance[];
  totalValue: number;
  lastUpdated: string;
}

export interface NFTItem {
  id: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  tokenId: string;
  contractAddress: string;
  blockchain: string;
  value: number;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'staking' | 'liquidity' | 'farming';
  token: string;
  amount: number;
  value: number;
  apy: number;
  rewards: number;
}

interface WalletState {
  portfolio: WalletPortfolio | null;
  transactions: Transaction[];
  nfts: NFTItem[];
  defiPositions: DeFiPosition[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

type WalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PORTFOLIO'; payload: WalletPortfolio }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_NFTS'; payload: NFTItem[] }
  | { type: 'SET_DEFI_POSITIONS'; payload: DeFiPosition[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { hash: string; updates: Partial<Transaction> } }
  | { type: 'RESET_WALLET' };

const initialState: WalletState = {
  portfolio: null,
  transactions: [],
  nfts: [],
  defiPositions: [],
  loading: false,
  refreshing: false,
  error: null,
  lastRefresh: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false, refreshing: false };
    case 'SET_PORTFOLIO':
      return {
        ...state,
        portfolio: action.payload,
        loading: false,
        error: null,
        lastRefresh: new Date()
      };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'SET_NFTS':
      return { ...state, nfts: action.payload };
    case 'SET_DEFI_POSITIONS':
      return { ...state, defiPositions: action.payload };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions]
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(tx =>
          tx.hash === action.payload.hash
            ? { ...tx, ...action.payload.updates }
            : tx
        )
      };
    case 'RESET_WALLET':
      return initialState;
    default:
      return state;
  }
}

interface WalletContextType extends WalletState {
  // Actions
  fetchPortfolio: () => Promise<void>;
  fetchTransactions: (page?: number, limit?: number, type?: 'send' | 'receive') => Promise<void>;
  fetchNFTs: (page?: number, limit?: number) => Promise<void>;
  fetchDeFiPositions: () => Promise<void>;
  sendTransaction: (txData: {
    to: string;
    amount: number;
    token: string;
    gasPrice?: number;
  }) => Promise<boolean>;
  importNFT: (contractAddress: string, tokenId: string, networkId?: number) => Promise<boolean>;
  refreshWallet: () => Promise<void>;
  estimateGas: (txData: {
    to: string;
    amount: number;
    token: string;
  }) => Promise<{
    gasLimit: number;
    gasPrice: number;
    totalCost: number;
    totalCostUsd: number;
  } | null>;

  // Computed values
  hasWallet: boolean;
  isConnected: boolean;
  totalPortfolioValue: number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { user, token } = useAuth();
  const [state, dispatch] = useReducer(walletReducer, initialState);

  const API_BASE = '/api/wallet';

  // Helper function to make authenticated API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(normalizeAuthError(errorData.message || `HTTP ${response.status}`));
    }

    return response.json();
  };

  // Fetch wallet portfolio
  const fetchPortfolio = async () => {
    if (!token || !user?.walletAddress) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const data = await apiCall('/balance');

      if (data.success) {
        dispatch({ type: 'SET_PORTFOLIO', payload: data.data });
      } else {
        throw new Error(data.message || 'Failed to fetch portfolio');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch portfolio';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
    }
  };

  // Fetch transaction history
  const fetchTransactions = async (page = 1, limit = 20, type?: 'send' | 'receive') => {
    if (!token || !user?.walletAddress) return;

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type })
      });

      const data = await apiCall(`/transactions?${params}`);

      if (data.success) {
        const transactions = data.data.transactions.map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }));
        dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transactions';
      toast.error(errorMessage);
    }
  };

  // Fetch NFT collection
  const fetchNFTs = async (page = 1, limit = 20) => {
    if (!token || !user?.walletAddress) return;

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const data = await apiCall(`/nfts?${params}`);

      if (data.success) {
        dispatch({ type: 'SET_NFTS', payload: data.data.nfts || [] });
      } else {
        throw new Error(data.message || 'Failed to fetch NFTs');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch NFTs';
      toast.error(errorMessage);
    }
  };

  // Fetch DeFi positions
  const fetchDeFiPositions = async () => {
    if (!token || !user?.walletAddress) return;

    try {
      const data = await apiCall('/defi-positions');

      if (data.success) {
        dispatch({ type: 'SET_DEFI_POSITIONS', payload: data.data.positions || [] });
      } else {
        throw new Error(data.message || 'Failed to fetch DeFi positions');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch DeFi positions';
      toast.error(errorMessage);
    }
  };

  // Estimate gas for transaction
  const estimateGas = async (txData: {
    to: string;
    amount: number;
    token: string;
  }) => {
    if (!token) return null;

    try {
      const params = new URLSearchParams({
        to: txData.to,
        amount: txData.amount.toString(),
        token: txData.token
      });

      const data = await apiCall(`/gas-estimate?${params}`);

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to estimate gas');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to estimate gas';
      toast.error(errorMessage);
      return null;
    }
  };

  // Send transaction
  const sendTransaction = async (txData: {
    to: string;
    amount: number;
    token: string;
    gasPrice?: number;
  }) => {
    if (!token) return false;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const data = await apiCall('/send', {
        method: 'POST',
        body: JSON.stringify(txData),
      });

      if (data.success) {
        // Add pending transaction to state
        const pendingTx: Transaction = {
          hash: data.data.transactionHash,
          type: 'send',
          amount: txData.amount,
          token: txData.token,
          from: user?.walletAddress || '',
          to: txData.to,
          timestamp: new Date(),
          status: 'pending',
          gasUsed: data.data.gasUsed || 0,
          gasPrice: data.data.gasPrice || 0,
          blockNumber: 0,
        };

        dispatch({ type: 'ADD_TRANSACTION', payload: pendingTx });
        toast.success('Transaction sent successfully!');

        // Refresh portfolio after a delay
        setTimeout(() => {
          fetchPortfolio();
        }, 2000);

        return true;
      } else {
        throw new Error(data.message || 'Failed to send transaction');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Import NFT
  const importNFT = async (contractAddress: string, tokenId: string, networkId = 1) => {
    if (!token) return false;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const data = await apiCall('/import-nft', {
        method: 'POST',
        body: JSON.stringify({ contractAddress, tokenId, networkId }),
      });

      if (data.success) {
        toast.success('NFT imported successfully!');
        await fetchNFTs();
        return true;
      } else {
        throw new Error(data.message || 'Failed to import NFT');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import NFT';
      toast.error(errorMessage);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Refresh wallet data
  const refreshWallet = async () => {
    if (!token || !user?.walletAddress) return;

    try {
      dispatch({ type: 'SET_REFRESHING', payload: true });

      const data = await apiCall('/refresh', {
        method: 'POST',
      });

      if (data.success) {
        toast.success('Wallet data refreshed!');
        // Refresh all data
        await Promise.all([
          fetchPortfolio(),
          fetchTransactions(),
          fetchNFTs(),
          fetchDeFiPositions()
        ]);
      } else {
        throw new Error(data.message || 'Failed to refresh wallet data');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh wallet data';
      toast.error(errorMessage);
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  };

  // Load initial data when user connects wallet
  useEffect(() => {
    if (token && user?.walletAddress) {
      fetchPortfolio();
      fetchTransactions();
      fetchNFTs();
      fetchDeFiPositions();
    } else {
      dispatch({ type: 'RESET_WALLET' });
    }
  }, [token, user?.walletAddress]);

  // Auto-refresh portfolio every 30 seconds
  useEffect(() => {
    if (!token || !user?.walletAddress) return;

    const interval = setInterval(() => {
      fetchPortfolio();
    }, 30000);

    return () => clearInterval(interval);
  }, [token, user?.walletAddress]);

  const contextValue: WalletContextType = {
    ...state,
    fetchPortfolio,
    fetchTransactions,
    fetchNFTs,
    fetchDeFiPositions,
    sendTransaction,
    importNFT,
    refreshWallet,
    estimateGas,
    hasWallet: !!user?.walletAddress,
    isConnected: !!state.portfolio,
    totalPortfolioValue: state.portfolio?.totalValue || 0,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
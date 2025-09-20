import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api, SessionExpiredError } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/router';
import { ShoppingCart as CartIcon, Check } from 'lucide-react';
import { Cart, CartItem, CartSummary, Product } from '@/types';

interface CartState {
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  lastUpdated: string | null;
  summary: CartSummary | null;
  loading: boolean;
  error: string | null;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CART'; payload: Partial<CartState> }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'RESET_STATE' };

const initialState: CartState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  lastUpdated: null,
  summary: null,
  loading: false,
  error: null,
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CART':
      return { 
        ...state, 
        ...action.payload, 
        loading: false, 
        error: null 
      };
    
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload],
        loading: false,
        error: null,
      };
    
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item._id === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        loading: false,
        error: null,
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item._id !== action.payload),
        loading: false,
        error: null,
      };
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalAmount: 0,
        totalItems: 0,
        summary: null,
        loading: false,
        error: null,
      };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

interface CartContextType {
  cart: CartState;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateCartItem: (itemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  fetchCart: () => Promise<void>;
  checkout: (paymentMethod: string, paymentDetails?: any) => Promise<any>;
  getCartItemCount: () => number;
  getCartTotal: () => number;
  isInCart: (productId: string) => boolean;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: React.ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const theme = useTheme();
  const router = useRouter();
  const [cart, dispatch] = useReducer(cartReducer, initialState);
  const { isAuthenticated, user } = useAuth();

  // Fetch cart when user authentication changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCart();
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [isAuthenticated, user]);

  const fetchCart = async () => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET_STATE' });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.getCart();
      
      if (response.success && response.data) {
        const cartData = response.data;
        dispatch({
          type: 'SET_CART',
          payload: {
            items: cartData.items || [],
            totalAmount: cartData.summary?.totalPrice || 0,
            totalItems: cartData.summary?.totalItems || 0,
            lastUpdated: cartData.updatedAt,
            summary: cartData.summary || null,
          },
        });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch cart' });
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      if (error instanceof SessionExpiredError) {
        // Reset cart silently on session expiry to avoid noisy errors
        dispatch({ type: 'RESET_STATE' });
        return;
      }
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to fetch cart' });
    }
  };

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    // Forceable action: 'open' always opens drawer, 'checkout' routes to /cart
    const FORCE_ACTION: 'open' | 'checkout' | null = 'open';
    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      return false;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.addToCart(productId, quantity);

      if (response.success && response.data) {
        const cartData = response.data;
        dispatch({
          type: 'SET_CART',
          payload: {
            items: cartData.items || [],
            totalAmount: cartData.summary?.totalPrice || 0,
            totalItems: cartData.summary?.totalItems || 0,
            summary: cartData.summary || null,
          },
        });
        // Show a compact brand-styled toast with product details and forced action
        const lastItem = (cartData.items || [])[Math.max(0, (cartData.items || []).length - 1)];
        const thumb = lastItem?.productId?.images?.[0]?.secure_url || lastItem?.productId?.images?.[0]?.url;
        const name = lastItem?.productId?.name;
        const qty = Number(lastItem?.quantity || quantity || 1);
        const unitPrice = Number(lastItem?.price || 0);
        const currency = String(lastItem?.currency || 'USD');
        const subtotal = unitPrice * qty;
        const formatPrice = (p: number, c: string) => (c === 'USD' ? `$${p.toFixed(2)}` : `${p.toFixed(4)} ${c}`);

        const actionLabel = FORCE_ACTION === 'checkout' ? 'Checkout' : 'Open Cart';

        toast.custom((t) => (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: theme.palette.mode === 'dark' ? '#0b1220' : theme.palette.primary.dark,
            color: theme.palette.primary.contrastText,
            padding: '8px 10px',
            borderRadius: 9999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            border: `1px solid ${theme.palette.primary.light}`,
            maxWidth: 640
          }}>
            {thumb ? (
              <img src={thumb} alt={name || 'Product'} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', border: `1px solid ${theme.palette.primary.light}` }} />
            ) : (
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: theme.palette.secondary.main
              }}>
                <CartIcon size={16} color={theme.palette.secondary.contrastText} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: 700, color: theme.palette.success.light }}>Added</span>
              <span style={{ opacity: 0.95, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name || 'Item'}</span>
              <span style={{ opacity: 0.75 }}>×{qty}</span>
              <span style={{ opacity: 0.85, fontWeight: 600 }}>· {formatPrice(subtotal, currency)}</span>
            </div>
            <div style={{ flex: 1 }} />
            <Button
              size="small"
              variant="contained"
              startIcon={<CartIcon size={16} />}
              sx={{
                textTransform: 'none',
                boxShadow: 'none',
                height: 30,
                minWidth: 0,
                padding: '0 12px',
                borderRadius: 9999,
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.secondary.contrastText,
                '&:hover': { backgroundColor: theme.palette.secondary.dark }
              }}
              onClick={() => {
                toast.dismiss(t.id);
                if (FORCE_ACTION === 'checkout') {
                  router.push('/cart');
                } else {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('cart:open'));
                  }
                }
              }}
            >
              {actionLabel}
            </Button>
          </div>
        ), { duration: 3500 });
        return true;
      } else {
        const errorMessage = response.message || 'Failed to add item to cart';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      const errorMessage = error.message || 'Failed to add item to cart';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const updateCartItem = async (itemId: string, quantity: number): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.updateCartItem(itemId, quantity);

      if (response.success && response.data) {
        const cartData = response.data;
        dispatch({
          type: 'SET_CART',
          payload: {
            items: cartData.items || [],
            totalAmount: cartData.summary?.totalPrice || 0,
            totalItems: cartData.summary?.totalItems || 0,
            summary: cartData.summary || null,
          },
        });
        toast.success('Cart updated');
        return true;
      } else {
        const errorMessage = response.message || 'Failed to update cart item';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      const errorMessage = error.message || 'Failed to update cart item';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const removeFromCart = async (itemId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.removeFromCart(itemId);

      if (response.success) {
        const cartData = response.data;
        if (cartData) {
          dispatch({
            type: 'SET_CART',
            payload: {
              items: cartData.items || [],
              totalAmount: cartData.summary?.totalPrice || 0,
              totalItems: cartData.summary?.totalItems || 0,
              summary: cartData.summary || null,
            },
          });
        } else {
          dispatch({ type: 'REMOVE_ITEM', payload: itemId });
        }
        toast.success('Item removed from cart');
        return true;
      } else {
        const errorMessage = response.message || 'Failed to remove item from cart';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      const errorMessage = error.message || 'Failed to remove item from cart';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.clearCart();

      if (response.success) {
        dispatch({ type: 'CLEAR_CART' });
        toast.success('Cart cleared');
        return true;
      } else {
        const errorMessage = response.message || 'Failed to clear cart';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        toast.error(errorMessage);
        return false;
      }
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      const errorMessage = error.message || 'Failed to clear cart';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return false;
    }
  };

  const checkout = async (paymentMethod: string, paymentDetails?: any): Promise<any> => {
    if (!isAuthenticated) {
      toast.error('Please log in to checkout');
      return null;
    }

    // Minimal client-side guards for required payment details
    if (paymentMethod === 'stripe') {
      if (!paymentDetails?.paymentIntentId) {
        toast.error('Complete card payment first to obtain a PaymentIntent ID.');
        return null;
      }
    } else if (paymentMethod === 'crypto' || paymentMethod === 'nft') {
      const valid = paymentDetails?.txHash && paymentDetails?.walletAddress && paymentDetails?.networkId;
      if (!valid) {
        toast.error('Confirm the crypto transaction (txHash, walletAddress, networkId) before checkout.');
        return null;
      }
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.checkout(paymentMethod, paymentDetails);

      dispatch({ type: 'SET_LOADING', payload: false });

      if (response.success) {
        // If checkout successful, refresh cart (it should be cleared)
        await fetchCart();
        toast.success('Checkout completed successfully!');
        return response.data;
      } else {
        const errorMessage = response.message || 'Checkout failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        toast.error(errorMessage);
        return null;
      }
    } catch (error: any) {
      console.error('Error during checkout:', error);
      const errorMessage = error.message || 'Checkout failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  };

  // Helper functions
  const getCartItemCount = (): number => {
    return cart.totalItems;
  };

  const getCartTotal = (): number => {
    return cart.summary?.totalPrice || 0;
  };

  const isInCart = (productId: string): boolean => {
    return cart.items.some(item => item.productId._id === productId);
  };

  const refreshCart = async (): Promise<void> => {
    await fetchCart();
  };

  // Compute currency groups for non-NFT items
  const getCurrencyGroups = () => {
    const map = new Map<string, { currency: string; items: CartItem[] }>();
    cart.items.filter(i => !i.productId.isNFT).forEach(i => {
      const key = String(i.currency || 'USD').toUpperCase();
      if (!map.has(key)) map.set(key, { currency: key, items: [] });
      map.get(key)!.items.push(i);
    });
    return Array.from(map.values());
  };

  const contextValue: CartContextType = {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    checkout,
    getCartItemCount,
    getCartTotal,
    isInCart,
    refreshCart,
  } as any; // Extend type if needed to expose getCurrencyGroups

  (contextValue as any).getCurrencyGroups = getCurrencyGroups;

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { SessionExpiredError } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
  };
  isNFT: boolean;
  createdAt: string;
  tags: string[];
  stock?: number;
  rating?: number;
  reviewCount?: number;
  sales?: number;
  views?: number;
  featured?: boolean;
  contractAddress?: string;
  tokenId?: string;
}

interface Pagination {
  page: number;
  limit: number;
  pages: number;
  total: number;
}

interface MarketplaceFilters {
  page?: number;
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  isNFT?: boolean;
  featured?: boolean;
  sortBy?: 'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured';
}

const useMarketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    pages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products with filters
  const fetchProducts = useCallback(async (filters: MarketplaceFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: filters.page || 1,
        limit: 12,
        search: filters.search,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        isNFT: filters.isNFT,
        featured: filters.featured,
        sortBy: filters.sortBy || 'newest',
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === undefined) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await api.marketplace.getProducts(params);

      if (response.success) {
        const productsData = response.data.products.map((product: any) => ({
          id: product.id || product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          images: product.images?.map((img: any) => img.secure_url || img.url || img) || [],
          category: product.category,
          vendor: {
            id: product.vendor?.id || product.vendorId?._id || product.vendorId,
            username: product.vendor?.username || product.vendorId?.username,
            displayName: product.vendor?.displayName || product.vendorId?.displayName,
            avatar: product.vendor?.avatar || product.vendorId?.avatar || '',
            isVerified: product.vendor?.isVerified || product.vendorId?.isVerified || false,
            walletAddress: product.vendor?.walletAddress || product.vendorId?.walletAddress,
          },
          isNFT: product.isNFT || false,
          createdAt: product.createdAt,
          tags: product.tags || [],
          stock: product.stock,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          sales: product.sales || 0,
          views: product.views || 0,
          featured: product.featured || false,
          contractAddress: product.contractAddress,
          tokenId: product.tokenId,
        }));

        setProducts(productsData);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          pages: response.data.pagination.pages,
          total: response.data.pagination.total,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
      setProducts([]);
      setPagination({ page: 1, limit: 12, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single product
  const fetchProduct = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Normalize the id to a string early to avoid invalid ObjectId issues
      const normalizedId = String(productId);
      const response = await api.marketplace.getProduct(normalizedId);

      if (response.success) {
        const product = response.data.product || response.data;
        return {
          id: String(product.id || product._id),
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          images: product.images?.map((img: any) => img.secure_url || img.url || img) || [],
          category: product.category,
          vendor: {
            id: String(product.vendor?.id || product.vendorId?._id || product.vendorId),
            username: product.vendor?.username || product.vendorId?.username,
            displayName: product.vendor?.displayName || product.vendorId?.displayName,
            avatar: product.vendor?.avatar || product.vendorId?.avatar || '',
            isVerified: product.vendor?.isVerified || product.vendorId?.isVerified || false,
            walletAddress: product.vendor?.walletAddress || product.vendorId?.walletAddress,
          },
          isNFT: product.isNFT || false,
          createdAt: product.createdAt,
          tags: product.tags || [],
          stock: product.stock,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          sales: product.sales || 0,
          views: product.views || 0,
          featured: product.featured || false,
          contractAddress: product.contractAddress,
          tokenId: product.tokenId,
        };
      } else {
        throw new Error(response.error || 'Failed to fetch product');
      }
    } catch (err: any) {
      // Avoid noisy dev overlay for expected 404s
      const status = err?.status ?? err?.data?.status;
      const msg = err?.message || err?.data?.error || '';
      if (status !== 404) {
        console.warn('Error fetching product:', msg || err);
      }
      setError(msg || 'Failed to fetch product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.marketplace.getCategories();
      if (response.success) {
        setCategories(response.data.categories || []);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      // On error, do not use hardcoded categories; leave empty so UI reflects real API state
      setCategories([]);
    }
  }, []);

  // Buy product
  const buyProduct = useCallback(async (productId: string, opts?: { paymentMethod?: 'stripe' | 'crypto' | 'nft'; paymentDetails?: any }) => {
    try {
      setLoading(true);
      setError(null);

      const method = opts?.paymentMethod;
      const details = opts?.paymentDetails;

      const response = await api.marketplace.buyProduct(productId, method ? { paymentMethod: method, paymentDetails: details } : undefined);

      if (response.success) {
        const { product, payment } = response.data;
        
        if (payment.status === 'completed') {
          toast.success('Purchase completed successfully!');
        } else if (payment.status === 'requires_client_signature') {
          toast.success('Transaction prepared! Please sign with the vendor wallet.');
        }
        
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to purchase product');
      }
    } catch (err: any) {
      console.error('Error buying product:', err);
      setError(err.message || 'Failed to purchase product');
      
      if (err instanceof SessionExpiredError || err?.name === 'SessionExpiredError') {
        throw err;
      }
      
      toast.error(err.message || 'Failed to purchase product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create product
  const createProduct = useCallback(async (productData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.marketplace.createProduct(productData);

      if (response.success) {
        toast.success('Product created successfully!');
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.message || 'Failed to create product');
      toast.error(err.message || 'Failed to create product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    categories,
    pagination,
    loading,
    error,
    fetchProducts,
    fetchProduct,
    fetchCategories,
    buyProduct,
    createProduct,
  };
};

export default useMarketplace;
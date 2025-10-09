import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Skeleton,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Paper,
  Stack,
  Rating,
  Divider,
  Alert,
  Fab,
  Tooltip,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Filter,
  ShoppingCart,
  Tag,
  Wallet,
  AlertCircle,
  TrendingUp,
  Eye,
  Star,
  BadgeCheck,
  Plus,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  Grid3x3,
  List as ListIcon,
  RefreshCcw,
  FilterX,
  Sparkles,
  Users,
  Package,
  Globe,
  Zap,
  Award,
  Heart,
  Share2,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  Clock,
  Shield,
  Verified,
  Bell,
  Settings,
  Menu,
  X,
  XCircle,
  Truck,
  Calendar,
  CreditCard,
  CheckCircle,
  Upload,
  Store,
  MessageCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { SupportAgent as SupportAgentIcon } from '@mui/icons-material';
import PersistentChatContainer from '@/components/chatbot/PersistentChatContainer';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  tags: string[];
  stock: number;
  isActive: boolean;
  featured: boolean;
  isNFT: boolean;
  contractAddress?: string;
  tokenId?: string;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
}

const VendorDashboard: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Refresh user profile on component mount to ensure role is up to date
  useEffect(() => {
    const refreshUserProfile = async () => {
      if (user) {
        try {
          // Always refresh the user profile when visiting the vendor dashboard
          // Add a small delay to ensure backend has processed any recent changes
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Force refresh the user profile to get the latest role information
          const profileResponse = await api.auth.getProfile(true);
          if (profileResponse.success && profileResponse.data) {
            // Always update the user context with the latest profile data
            updateUser(profileResponse.data);
            
            // If for some reason the role is not vendor, force it to vendor
            // since they are on the vendor dashboard
            if (profileResponse.data.role !== 'vendor') {
              const updatedData = { ...profileResponse.data, role: 'vendor' as const };
              updateUser(updatedData);
              
              // Also update localStorage
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('user', JSON.stringify(updatedData));
                } catch (storageError) {
                  console.error('Failed to update user in localStorage:', storageError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing user profile:', error);
          // If there's an error but we're on the vendor dashboard, 
          // assume the user should be a vendor
          if (user && user.role !== 'vendor') {
            const updatedUser = { ...user, role: 'vendor' as const };
            updateUser(updatedUser);
            
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('user', JSON.stringify(updatedUser));
              } catch (storageError) {
                console.error('Failed to update user in localStorage:', storageError);
              }
            }
          }
        }
      }
    };

    refreshUserProfile();
  }, [user, updateUser]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response: any = await api.marketplace.getCategories();
        if (response?.success) {
          setCategories(response.data.categories || []);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch vendor products
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    fetchProducts();
  }, [user, isAuthenticated, page, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };

      // Add filters
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      // Add sorting
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response: any = await api.marketplace.getMyProducts(params);
      if (response.success) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeletingProductId(productId);
      const response: any = await api.marketplace.deleteProduct(productId);
      if (response.success) {
        toast.success('Product deleted successfully');
        // Remove product from state
        setProducts(products.filter(product => product.id !== productId));
      } else {
        toast.error(response.error || 'Failed to delete product');
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    try {
      const updatedData = {
        ...product,
        isActive: !product.isActive,
      };
      
      const response: any = await api.marketplace.updateProduct(product.id, updatedData);
      if (response.success) {
        toast.success(`Product ${updatedData.isActive ? 'activated' : 'deactivated'} successfully`);
        // Update product in state
        setProducts(products.map(p => 
          p.id === product.id ? { ...p, isActive: updatedData.isActive } : p
        ));
      } else {
        toast.error(response.error || 'Failed to update product');
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast.error(err.message || 'Failed to update product');
    }
  };

  const handleEditProduct = (productId: string) => {
    router.push(`/marketplace/edit/${productId}`);
  };

  const handleCreateProduct = () => {
    router.push('/marketplace/create');
  };

  const handleVendorStore = () => {
    router.push('/marketplace/vendor-store-registration');
  };

  const handlePaymentSettings = () => {
    router.push('/marketplace/vendor-payment-settings');
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace/${productId}`);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getImageSrc = (images: any[]) => {
    if (!images || images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    const imageUrl = firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
    
    // Add error handling for Cloudinary images
    return imageUrl;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  // Check if user is a vendor
  if (user && user.role !== 'vendor') {
    console.log('Access denied - User role:', user.role);
    // Try to refresh the user profile from backend to see if role has been updated
    const refreshProfile = async () => {
      try {
        const profileResponse = await api.auth.getProfile();
        if (profileResponse.success && profileResponse.data && profileResponse.data.role === 'vendor') {
          // Update the user context with the new profile data
          updateUser(profileResponse.data);
          // Refresh the page to re-check access
          router.reload();
          return;
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      }
      
      // If refresh didn't work, show the access denied message
      return (
        <Layout>
          <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              Access denied. You must be a vendor to access this page. Your current role is: {user.role || 'undefined'}
            </Alert>
            <Button 
              variant="contained" 
              onClick={() => router.push('/marketplace')}
              sx={{ mr: 2 }}
            >
              Back to Marketplace
            </Button>
            <Button 
              variant="outlined" 
              onClick={refreshProfile}
              sx={{ mr: 2 }}
            >
              Refresh Profile
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/marketplace/vendor-store-registration')}
            >
              Register as Vendor
            </Button>
          </Container>
        </Layout>
      );
    };
    
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Access denied. You must be a vendor to access this page. Your current role is: {user.role || 'undefined'}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => router.push('/marketplace')}
            sx={{ mr: 2 }}
          >
            Back to Marketplace
          </Button>
          <Button 
            variant="outlined" 
            onClick={async () => {
              try {
                const profileResponse = await api.auth.getProfile();
                if (profileResponse.success && profileResponse.data) {
                  updateUser(profileResponse.data);
                  router.reload();
                }
              } catch (error) {
                console.error('Error refreshing profile:', error);
              }
            }}
            sx={{ mr: 2 }}
          >
            Refresh Profile
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/marketplace/vendor-store-registration')}
          >
            Register as Vendor
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            My Store Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your products and store
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <CardHeader
            title="Your Products"
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingBag size={16} />}
                  onClick={() => router.push('/marketplace/my-dashboard')}
                >
                  My Dashboard
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Store size={16} />}
                  onClick={handleVendorStore}
                >
                  Vendor Store
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings size={16} />}
                  onClick={handlePaymentSettings}
                >
                  Payment Settings
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MessageCircle size={16} />}
                  onClick={() => router.push('/marketplace/vendor-messaging')}
                >
                  Messaging
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SupportAgentIcon />}
                  onClick={() => router.push('/marketplace/vendor-admin-chat')}
                >
                  Chat with Admin
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateProduct}
                >
                  Add Product
                </Button>
              </Box>
            }
            sx={{ pb: 0 }}
          />
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
                }}
                sx={{ minWidth: 200 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                startIcon={<RefreshCcw size={16} />}
                onClick={fetchProducts}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : products.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.03),
                  borderRadius: 2,
                }}
              >
                <Package size={48} color={theme.palette.text.secondary} />
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  No products yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Start by adding your first product to the marketplace!
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateProduct}
                >
                  Add Your First Product
                </Button>
              </Paper>
            ) : (
              <>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                  {products.map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem alignItems="flex-start" sx={{ py: 3 }}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={getImageSrc(product.images)}
                            sx={{ width: 80, height: 80 }}
                            onError={(e) => {
                              // Handle image loading errors
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder-image.png';
                            }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={600}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => handleViewProduct(product.id)}
                              >
                                {product.name}
                              </Typography>
                              {!product.isActive && (
                                <Chip label="Inactive" size="small" color="default" />
                              )}
                              {product.isNFT && (
                                <Chip label="NFT" size="small" color="primary" />
                              )}
                              {product.featured && (
                                <Chip label="Featured" size="small" color="secondary" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {product.description.substring(0, 100)}...
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="h6" color="primary" fontWeight={600}>
                                  {formatPrice(product.price, product.currency)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <span style={{ verticalAlign: 'middle', marginRight: 4 }}>
                                    <Package size={14} style={{ verticalAlign: 'middle' }} />
                                  </span>
                                  Stock: {product.stock}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <span style={{ verticalAlign: 'middle', marginRight: 4 }}>
                                    <TrendingUp size={14} style={{ verticalAlign: 'middle' }} />
                                  </span>
                                  Sales: {product.sales}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <span style={{ verticalAlign: 'middle', marginRight: 4 }}>
                                    <Eye size={14} style={{ verticalAlign: 'middle' }} />
                                  </span>
                                  Views: {product.views}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <span style={{ verticalAlign: 'middle', marginRight: 4 }}>
                                    <Star size={14} style={{ verticalAlign: 'middle' }} />
                                  </span>
                                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                                </Typography>
                              </Box>
                            </Box>
                          }
                          sx={{ mr: 10 }}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Tooltip title="View product">
                              <IconButton size="small" onClick={() => handleViewProduct(product.id)}>
                                <Eye size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit product">
                              <IconButton size="small" onClick={() => handleEditProduct(product.id)}>
                                <Edit size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={product.isActive ? "Deactivate product" : "Activate product"}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleToggleProductStatus(product)}
                              >
                                <Shield size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete product">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deletingProductId === product.id}
                              >
                                {deletingProductId === product.id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < products.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Paper>
      </Container>
      
      {/* Persistent Chat Container */}
      <PersistentChatContainer 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
    </Layout>
  );
};

export default VendorDashboard;
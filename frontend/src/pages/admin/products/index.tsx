import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  Stack,
  Divider,
  Alert,
  Skeleton,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
  Pagination,
  Badge,
  Tooltip,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Check,
  X,
  Star,
  Package,
  Download,
  Upload,
  FilterList,
  Search,
  Refresh,
  MoreVert,
  TrendingUp,
  Eye,
  ShoppingCart,
  AlertTriangle,
  Settings,
  Smartphone
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import MobileProductCreator from '@/components/marketplace/MobileProductCreator';
import api from '@/lib/api';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: Array<{ secure_url: string; url: string }>;
  stock: number;
  isActive: boolean;
  featured: boolean;
  isNFT: boolean;
  sales: number;
  views: number;
  rating: number;
  reviewCount: number;
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

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  featuredProducts: number;
  totalSales: number;
  totalRevenue: number;
  avgPrice: number;
  topCategory: string;
}

const AdminProductsPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    pendingProducts: 0,
    featuredProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    avgPrice: 0,
    topCategory: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mobileCreatorOpen, setMobileCreatorOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    featured: '',
    isActive: '',
    vendorId: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [editForm, setEditForm] = useState({
    price: 0,
    stock: 0,
    isActive: true,
    featured: false
  });

  const categories = [
    'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
    'Books', 'Collectibles', 'Education', 'Accessories', 
    'Food & Beverages', 'Fitness', 'Other'
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'priceAsc', label: 'Price: Low to High' },
    { value: 'priceDesc', label: 'Price: High to Low' },
    { value: 'sales', label: 'Most Sales' },
    { value: 'views', label: 'Most Views' },
    { value: 'featured', label: 'Featured First' }
  ];

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProducts();
    }
  }, [user, filters, pagination.page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const productParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await api.admin.products.getProducts(productParams);

      if (response.success) {
        const productList = response.data.products || [];
        setProducts(productList);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 0
        }));

        // Calculate stats
        const totalProducts = productList.length;
        const activeProducts = productList.filter((p: Product) => p.isActive).length;
        const pendingProducts = productList.filter((p: Product) => !p.isActive).length;
        const featuredProducts = productList.filter((p: Product) => p.featured).length;
        const totalSales = productList.reduce((sum: number, p: Product) => sum + (p.sales || 0), 0);
        const totalRevenue = productList.reduce((sum: number, p: Product) => sum + ((p.sales || 0) * p.price), 0);
        const avgPrice = totalProducts > 0 ? productList.reduce((sum: number, p: Product) => sum + p.price, 0) / totalProducts : 0;
        
        // Find top category
        const categoryCount: { [key: string]: number } = {};
        productList.forEach((p: Product) => {
          categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
        });
        const topCategory = Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b, '');

        setStats({
          totalProducts,
          activeProducts,
          pendingProducts,
          featuredProducts,
          totalSales,
          totalRevenue,
          avgPrice,
          topCategory
        });
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = async (productId: string, field: 'isActive' | 'featured', value: boolean) => {
    try {
      const data = { [field]: value };
      const response = await api.admin.products.toggleProduct(productId, data);
      if (response.success) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to toggle product:', error);
    }
  };

  const handleProductApprove = async (productId: string, featured: boolean = false) => {
    try {
      const response = await api.admin.products.approveProduct(productId, { featured });
      if (response.success) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to approve product:', error);
    }
  };

  const handleProductDelete = async (productId: string) => {
    try {
      const response = await api.admin.products.deleteProduct(productId);
      if (response.success) {
        setDeleteDialog(false);
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleBulkAction = async (action: string, payload?: any) => {
    if (selectedProducts.length === 0) return;

    try {
      const response = await api.admin.products.bulkAction({
        ids: selectedProducts,
        action,
        payload
      });
      
      if (response.success) {
        setSelectedProducts([]);
        setBulkMenuAnchor(null);
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.admin.products.exportCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-products-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
      featured: product.featured
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    
    try {
      // Update basic fields
      await api.admin.products.updateProduct(selectedProduct._id, {
        price: editForm.price,
        stock: editForm.stock
      });
      
      // Update toggle fields
      await api.admin.products.toggleProduct(selectedProduct._id, {
        isActive: editForm.isActive,
        featured: editForm.featured
      });
      
      setEditDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount} ${currency}`;
  };

  const speedDialActions = [
    {
      icon: <Add />,
      name: 'Desktop Creator',
      onClick: () => router.push('/admin/products/create')
    },
    {
      icon: <Smartphone />,
      name: 'Mobile Creator',
      onClick: () => setMobileCreatorOpen(true)
    },
    {
      icon: <Download />,
      name: 'Export CSV',
      onClick: handleExportCSV
    },
    {
      icon: <Refresh />,
      name: 'Refresh',
      onClick: fetchProducts
    }
  ];

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <AlertTriangle size={64} color="#f44336" />
          <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You don't have permission to access the admin panel.
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout requireAuth>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Skeleton variant="text" width={300} height={60} />
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={120} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rectangular" height={400} sx={{ mt: 4 }} />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout requireAuth>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Product Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage all marketplace products with advanced admin controls
            </Typography>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <Package size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.totalProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Products
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                    <Check size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.activeProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Products
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                    <AlertTriangle size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.pendingProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Approval
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                    <Star size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.featuredProducts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Featured Products
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Filters & Search
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Search Products"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  InputProps={{
                    startAdornment: <Search size={20} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.isActive}
                    onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Featured</InputLabel>
                  <Select
                    value={filters.featured}
                    onChange={(e) => setFilters({ ...filters, featured: e.target.value })}
                    label="Featured"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Featured</MenuItem>
                    <MenuItem value="false">Not Featured</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    label="Sort By"
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={1}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={fetchProducts}
                  startIcon={<FilterList />}
                  sx={{ height: 56 }}
                >
                  Apply
                </Button>
              </Grid>
            </Grid>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Min Price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  fullWidth
                  label="Max Price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setFilters({
                      search: '',
                      category: '',
                      featured: '',
                      isActive: '',
                      vendorId: '',
                      minPrice: '',
                      maxPrice: '',
                      sortBy: 'newest'
                    });
                  }}
                >
                  Clear All Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 3, bgcolor: 'primary.50' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">
                  {selectedProducts.length} product(s) selected
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleBulkAction('activate')}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleBulkAction('feature')}
                  >
                    Feature
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleBulkAction('unfeature')}
                  >
                    Unfeature
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => handleBulkAction('delete')}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={600}>
                  Products ({pagination.total})
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    onClick={handleExportCSV}
                  >
                    Export
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={fetchProducts}
                  >
                    Refresh
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {products.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Package size={64} color="#ccc" />
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  No products found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filters or create a new product
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedProducts.length === products.length}
                            indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts(products.map(p => p._id));
                              } else {
                                setSelectedProducts([]);
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Stock</TableCell>
                        <TableCell>Performance</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product._id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedProducts.includes(product._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProducts([...selectedProducts, product._id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product._id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar
                                src={product.images[0]?.secure_url || product.images[0]?.url}
                                sx={{ width: 48, height: 48, borderRadius: 2 }}
                              >
                                <Package />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {product.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {product.description.substring(0, 50)}...
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar
                                src={product.vendor?.avatar}
                                sx={{ width: 32, height: 32 }}
                              >
                                {product.vendor?.displayName?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {product.vendor?.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{product.vendor?.username}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip label={product.category} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {formatCurrency(product.price, product.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={product.stock} 
                              color={product.stock > 0 ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <ShoppingCart size={14} />
                                <Typography variant="caption">{product.sales || 0}</Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Eye size={14} />
                                <Typography variant="caption">{product.views || 0}</Typography>
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip
                                label={product.isActive ? 'Active' : 'Inactive'}
                                color={product.isActive ? 'success' : 'default'}
                                size="small"
                              />
                              {product.featured && (
                                <Chip label="Featured" color="primary" size="small" />
                              )}
                              {product.isNFT && (
                                <Chip label="NFT" color="secondary" size="small" />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="View Product">
                                <IconButton
                                  size="small"
                                  onClick={() => router.push(`/marketplace/${product._id}`)}
                                >
                                  <Visibility size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Product">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              {!product.isActive && (
                                <Tooltip title="Approve Product">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleProductApprove(product._id)}
                                  >
                                    <Check size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Toggle Featured">
                                <IconButton
                                  size="small"
                                  onClick={() => handleProductToggle(product._id, 'featured', !product.featured)}
                                >
                                  <Star size={16} color={product.featured ? '#ffc107' : '#ccc'} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Product">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setDeleteDialog(true);
                                  }}
                                >
                                  <Delete size={16} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.page}
                    onChange={(_, page) => setPagination(prev => ({ ...prev, page }))}
                    color="primary"
                    size="large"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Product Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>

        {/* Edit Product Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Price"
                type="number"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Stock"
                type="number"
                value={editForm.stock}
                onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                fullWidth
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editForm.featured}
                    onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                  />
                }
                label="Featured"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedProduct && handleProductDelete(selectedProduct._id)} 
              color="error" 
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Mobile Product Creator */}
        <MobileProductCreator
          open={mobileCreatorOpen}
          onClose={() => setMobileCreatorOpen(false)}
          onSuccess={(productId) => {
            console.log('Product created:', productId);
            fetchProducts();
          }}
          isAdmin={true}
        />
      </Container>
    </Layout>
  );
};

export default AdminProductsPage;
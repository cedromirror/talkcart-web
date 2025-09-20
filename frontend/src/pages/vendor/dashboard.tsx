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
  Skeleton
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  ShoppingCart,
  TrendingUp,
  Eye,
  Star,
  Package,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
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
}

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalSales: number;
  totalViews: number;
  totalRevenue: number;
}

const VendorDashboard: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    totalViews: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'USD',
    category: 'Electronics',
    stock: 1,
    isActive: true,
    featured: false
  });

  const categories = [
    'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
    'Books', 'Collectibles', 'Education', 'Accessories', 
    'Food & Beverages', 'Fitness', 'Other'
  ];

  const currencies = ['ETH', 'BTC', 'USD', 'USDC', 'USDT'];

  useEffect(() => {
    if (user) {
      fetchVendorProducts();
    }
  }, [user]);

  const fetchVendorProducts = async () => {
    try {
      setLoading(true);
      const response = await api.marketplace.getProducts({ vendorId: user?.id });
      if (response.success) {
        const vendorProducts = response.data.products || [];
        setProducts(vendorProducts);
        
        // Calculate stats
        const totalProducts = vendorProducts.length;
        const activeProducts = vendorProducts.filter((p: Product) => p.isActive).length;
        const totalSales = vendorProducts.reduce((sum: number, p: Product) => sum + (p.sales || 0), 0);
        const totalViews = vendorProducts.reduce((sum: number, p: Product) => sum + (p.views || 0), 0);
        const totalRevenue = vendorProducts.reduce((sum: number, p: Product) => sum + ((p.sales || 0) * p.price), 0);
        
        setStats({
          totalProducts,
          activeProducts,
          totalSales,
          totalViews,
          totalRevenue
        });
      }
    } catch (error) {
      console.error('Failed to fetch vendor products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
      featured: product.featured
    });
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await api.marketplace.updateProduct(selectedProduct._id, editForm);
      if (response.success) {
        setEditDialog(false);
        fetchVendorProducts();
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product');
    }
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const response = await api.marketplace.deleteProduct(selectedProduct._id);
      if (response.success) {
        setDeleteDialog(false);
        fetchVendorProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount} ${currency}`;
  };

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
              Vendor Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your products and track your sales performance
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/marketplace/create')}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Add Product
          </Button>
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
                    <ShoppingCart size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.totalSales}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
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
                    <Eye size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.totalViews}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Views
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
                    <DollarSign size={24} />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      ${stats.totalRevenue.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Products Table */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Your Products ({products.length})
              </Typography>
            </Box>

            {products.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <Package size={64} color="#ccc" />
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                  No products yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Start by creating your first product listing
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => router.push('/marketplace/create')}
                >
                  Create Product
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Sales</TableCell>
                      <TableCell>Views</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id} hover>
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
                          <Chip label={product.category} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {formatCurrency(product.price, product.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>{product.sales || 0}</TableCell>
                        <TableCell>{product.views || 0}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={product.isActive ? 'Active' : 'Inactive'}
                              color={product.isActive ? 'success' : 'default'}
                              size="small"
                            />
                            {product.featured && (
                              <Chip label="Featured" color="primary" size="small" />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/marketplace/${product._id}`)}
                            >
                              <Visibility size={16} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit size={16} />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(product)}
                            >
                              <Delete size={16} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Edit Product Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Product Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Price"
                  type="number"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    label="Currency"
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency} value={currency}>
                        {currency}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Stock"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
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
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default VendorDashboard;
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Box,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
  Fade,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  TrendingUp,
  Inventory,
  MoreVert,
  Star,
  StarBorder,
  CheckCircle,
} from '@mui/icons-material';
import { AdminApi } from '@/services/api';
import StatsCard from '@/components/UI/StatsCard';
import { gradients } from '@/theme';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  vendor?: { name: string; email: string };
  isActive: boolean;
  featured: boolean;
  images: string[];
  createdAt: string;
}

export default function ProductsPage() {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [featured, setFeatured] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editDialog, setEditDialog] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Product | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    featured: 0,
    pending: 0,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await AdminApi.listProductsAdmin({
        page,
        limit: 10,
        search,
        category,
        featured,
      });

      if (response.success) {
        setProducts(response.data?.products || []);
        setTotalPages(Math.ceil((response.data?.pagination?.total || 0) / 10));
        
        // Update stats based on fetched data
        const allProducts = response.data?.products || [];
        setStats({
          total: response.data?.pagination?.total || 0,
          active: allProducts.filter((p: Product) => p.isActive).length,
          featured: allProducts.filter((p: Product) => p.featured).length,
          pending: allProducts.filter((p: Product) => !p.isActive).length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, category, featured]);

  const handleToggleActive = async (product: Product) => {
    try {
      await AdminApi.toggleProduct(product._id, { isActive: !product.isActive });
      fetchProducts();
    } catch (error) {
      console.error('Failed to toggle product:', error);
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await AdminApi.toggleProduct(product._id, { featured: !product.featured });
      fetchProducts();
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      await AdminApi.deleteProduct(product._id);
      setDeleteDialog(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: gradients.primary,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Products Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your marketplace products, pricing, and inventory
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialog(true)}
            sx={{
              background: gradients.primary,
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              '&:hover': {
                background: gradients.primary,
                filter: 'brightness(1.1)',
              },
            }}
          >
            Add Product
          </Button>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total Products"
              value={stats.total}
              icon={<Inventory />}
              color="primary"
              change={12.5}
              changeLabel="vs last month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Active Products"
              value={stats.active}
              icon={<CheckCircle />}
              color="success"
              change={8.2}
              changeLabel="vs last month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Featured Products"
              value={stats.featured}
              icon={<Star />}
              color="warning"
              change={15.3}
              changeLabel="vs last month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Pending Approval"
              value={stats.pending}
              icon={<TrendingUp />}
              color="info"
              change={-5.1}
              changeLabel="vs last month"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Categories</MenuItem>
                <MenuItem value="Digital Art">Digital Art</MenuItem>
                <MenuItem value="Electronics">Electronics</MenuItem>
                <MenuItem value="Fashion">Fashion</MenuItem>
                <MenuItem value="Gaming">Gaming</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Featured</InputLabel>
              <Select
                value={featured}
                label="Featured"
                onChange={(e) => setFeatured(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Products</MenuItem>
                <MenuItem value="true">Featured Only</MenuItem>
                <MenuItem value="false">Not Featured</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              sx={{ borderRadius: 2, minWidth: 120 }}
            >
              More Filters
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < products.length}
                    checked={products.length > 0 && selected.length === products.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(products.map(p => p._id));
                      } else {
                        setSelected([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Featured</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vendor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      Loading products...
                    </TableCell>
                  </TableRow>
                ))
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product._id}
                    hover
                    selected={selected.includes(product._id)}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(product._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelected([...selected, product._id]);
                          } else {
                            setSelected(selected.filter(id => id !== product._id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={product.images[0]}
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            background: gradients.primary,
                          }}
                        >
                          {product.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.description?.substring(0, 50)}...
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.category}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {product.price} {product.currency}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(product.isActive)}
                        color={getStatusColor(product.isActive) as any}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleToggleFeatured(product)}
                        color={product.featured ? 'warning' : 'default'}
                      >
                        {product.featured ? <Star /> : <StarBorder />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.vendor?.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View">
                          <IconButton size="small" color="info">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => setEditDialog(product)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog(product)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={product.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            color={product.isActive ? 'error' : 'success'}
                            onClick={() => handleToggleActive(product)}
                          >
                            {product.isActive ? <RejectIcon /> : <ApproveIcon />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            size="large"
          />
        </Box>
      </Card>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addDialog}
        onClose={() => setAddDialog(false)}
        onSuccess={() => {
          setAddDialog(false);
          fetchProducts();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Cancel</Button>
          <Button
            onClick={() => deleteDialog && handleDelete(deleteDialog)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Add Product Dialog Component
interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddProductDialog({ open, onClose, onSuccess }: AddProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    category: '',
    tags: '',
    stock: '1',
    featured: false,
    isNFT: false,
    contractAddress: '',
    tokenId: '',
    imageUrl: ''
  });

  const categories = [
    'Digital Art',
    'Electronics', 
    'Fashion',
    'Gaming',
    'Music',
    'Books',
    'Collectibles',
    'Education',
    'Accessories',
    'Food & Beverages',
    'Fitness',
    'Other'
  ];

  const currencies = ['USD', 'ETH', 'BTC', 'USDC', 'USDT'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.price || !formData.category) {
      return;
    }

    try {
      setLoading(true);
      
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        stock: parseInt(formData.stock) || 1,
        featured: formData.featured,
        isNFT: formData.isNFT,
        contractAddress: formData.isNFT ? formData.contractAddress : undefined,
        tokenId: formData.isNFT ? formData.tokenId : undefined,
        images: formData.imageUrl ? [{
          public_id: `admin-upload-${Date.now()}`,
          secure_url: formData.imageUrl,
          url: formData.imageUrl
        }] : []
      };

      const response = await AdminApi.createProduct(productData);
      
      if (response.success) {
        onSuccess();
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          currency: 'USD',
          category: '',
          tags: '',
          stock: '1',
          featured: false,
          isNFT: false,
          contractAddress: '',
          tokenId: '',
          imageUrl: ''
        });
      }
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Product</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              fullWidth
              multiline
              rows={3}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency"
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {currencies.map(currency => (
                    <MenuItem key={currency} value={currency}>{currency}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                inputProps={{ min: 0 }}
              />
            </Stack>

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tags (comma separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              fullWidth
              placeholder="e.g. electronics, gaming, premium"
            />

            <TextField
              label="Image URL"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              fullWidth
              placeholder="https://example.com/image.jpg"
            />

            <Stack direction="row" spacing={2}>
              <Checkbox
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              />
              <Typography>Featured Product</Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Checkbox
                checked={formData.isNFT}
                onChange={(e) => setFormData({ ...formData, isNFT: e.target.checked })}
              />
              <Typography>NFT Product</Typography>
            </Stack>

            {formData.isNFT && (
              <Stack spacing={2}>
                <TextField
                  label="Contract Address"
                  value={formData.contractAddress}
                  onChange={(e) => setFormData({ ...formData, contractAddress: e.target.value })}
                  fullWidth
                  placeholder="0x..."
                />
                <TextField
                  label="Token ID"
                  value={formData.tokenId}
                  onChange={(e) => setFormData({ ...formData, tokenId: e.target.value })}
                  fullWidth
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ background: gradients.primary }}
          >
            {loading ? 'Creating...' : 'Create Product'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

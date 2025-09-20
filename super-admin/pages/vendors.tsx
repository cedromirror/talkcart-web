import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Pagination,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  PersonOff as SuspendIcon,
  PersonAdd as UnsuspendIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import VendorDashboard from '../components/VendorDashboard';

interface Vendor {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  kycStatus: string;
  isSuspended: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  productCount: number;
  activeProductCount: number;
  totalSales: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface VendorStats {
  totalSales: number;
  totalRevenue: number;
}

interface VendorFees {
  fees: number;
  revenue: number;
  feeRate: number;
}

const KYC_STATUSES = ['none', 'pending', 'approved', 'rejected'];
const KYC_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  none: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

const VENDOR_STATUSES = ['all', 'active', 'suspended'];

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vendor-tabpanel-${index}`}
      aria-labelledby={`vendor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function VendorsAdmin() {
  const guard = useAdminGuard();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [newKycStatus, setNewKycStatus] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({});
  const [vendorFees, setVendorFees] = useState<Record<string, VendorFees>>({});
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [tabValue, setTabValue] = useState(0);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await AdminApi.listVendors({
        page,
        limit,
        search: search || undefined,
        kycStatus: kycFilter || undefined,
        status: statusFilter || undefined
      });
      if (res?.success) {
        setVendors(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, limit, search, kycFilter]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const handleKycUpdate = async () => {
    if (!selectedVendor || !newKycStatus) return;
    
    try {
      const res = await AdminApi.updateUserKyc(selectedVendor._id, newKycStatus);
      if (res?.success) {
        setKycDialogOpen(false);
        setSelectedVendor(null);
        setNewKycStatus('');
        fetchVendors();
      }
    } catch (error) {
      console.error('Failed to update KYC status:', error);
    }
  };

  const handleSuspendToggle = async (vendor: Vendor) => {
    try {
      const res = vendor.isSuspended
        ? await AdminApi.unsuspendVendor(vendor._id)
        : await AdminApi.suspendVendor(vendor._id, suspendReason || 'Administrative action');

      if (res?.success) {
        fetchVendors();
        setSuspendDialogOpen(false);
        setSuspendReason('');
      }
    } catch (error) {
      console.error('Failed to toggle suspension:', error);
    }
  };

  const openSuspendDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSuspendDialogOpen(true);
  };

  const openKycDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setNewKycStatus(vendor.kycStatus);
    setKycDialogOpen(true);
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate summary stats
  const totalVendors = pagination.total;
  const approvedVendors = vendors.filter(v => v.kycStatus === 'approved').length;
  const suspendedVendors = vendors.filter(v => v.isSuspended).length;
  const totalRevenue = Object.values(vendorStats).reduce((sum, stats) => sum + (stats.totalRevenue || 0), 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>Vendor Management</Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="Vendor List" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        <VendorDashboard onRefresh={fetchVendors} />
      </TabPanel>

      {/* Vendor List Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Search Vendors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="KYC Status"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              select
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {KYC_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => { setPage(1); fetchVendors(); }}>
              Apply Filters
            </Button>
          </Stack>
        </Paper>

        {/* Vendors Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>KYC Status</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Sales</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No vendors found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {vendor.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {vendor.username}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {vendor.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={vendor.kycStatus} 
                        color={KYC_COLORS[vendor.kycStatus] || 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={vendor.isSuspended ? 'Suspended' : 'Active'} 
                        color={vendor.isSuspended ? 'error' : 'success'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {vendor.totalSales || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(vendor.totalRevenue || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(vendor.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => openKycDialog(vendor)}>
                          <EditIcon />
                        </IconButton>
                        <Tooltip title={vendor.isSuspended ? 'Unsuspend' : 'Suspend'}>
                          <IconButton
                            size="small"
                            onClick={() => openSuspendDialog(vendor)}
                            color={vendor.isSuspended ? 'success' : 'error'}
                          >
                            {vendor.isSuspended ? <UnsuspendIcon /> : <SuspendIcon />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={pagination.pages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
        </Paper>
      </TabPanel>

      {/* KYC Update Dialog */}
      <Dialog open={kycDialogOpen} onClose={() => setKycDialogOpen(false)}>
        <DialogTitle>Update KYC Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Vendor: {selectedVendor?.username}
            </Typography>
            <TextField
              label="KYC Status"
              value={newKycStatus}
              onChange={(e) => setNewKycStatus(e.target.value)}
              select
              fullWidth
              sx={{ mt: 2 }}
            >
              {KYC_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKycDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleKycUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)}>
        <DialogTitle>
          {selectedVendor?.isSuspended ? 'Unsuspend Vendor' : 'Suspend Vendor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Vendor: {selectedVendor?.username}
            </Typography>
            {!selectedVendor?.isSuspended && (
              <TextField
                label="Suspension Reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mt: 2 }}
                placeholder="Enter reason for suspension..."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={selectedVendor?.isSuspended ? 'success' : 'error'}
            onClick={() => selectedVendor && handleSuspendToggle(selectedVendor)}
          >
            {selectedVendor?.isSuspended ? 'Unsuspend' : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

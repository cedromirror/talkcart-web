import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Tabs,
  Tab,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Percent as PercentIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Image as ImageIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Computer as SystemIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  RestoreFromTrash as ResetIcon,
  Build as MaintenanceIcon,
  Notifications as NotificationsIcon,
  Analytics as AnalyticsIcon,
  Inventory as ProductIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface MarketplaceSettings {
  commissionRate: number;
  currencies: string[];
  categories: string[];
  maxImageSize: number;
  maxImagesPerProduct: number;
  autoApproveProducts: boolean;
  requireVendorVerification: boolean;
  allowGuestCheckout: boolean;
}

interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxProductsPerVendor: number;
  enableNotifications: boolean;
  enableAnalytics: boolean;
}

interface SecuritySettings {
  enableTwoFactor: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requirePasswordComplexity: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsAdmin() {
  const guard = useAdminGuard();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);

  // Settings states
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);

  // Edit states
  const [editMarketplace, setEditMarketplace] = useState<MarketplaceSettings | null>(null);
  const [editSystem, setEditSystem] = useState<SystemSettings | null>(null);
  const [editSecurity, setEditSecurity] = useState<SecuritySettings | null>(null);

  // UI states
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [resetDialog, setResetDialog] = useState<{ open: boolean; type: string }>({
    open: false,
    type: ''
  });

  const fetchAllSettings = async () => {
    try {
      setLoading(true);
      const [marketplaceRes, systemRes, securityRes] = await Promise.all([
        AdminApi.getMarketplaceSettings(),
        AdminApi.getSystemSettings(),
        AdminApi.getSecuritySettings()
      ]);

      if (marketplaceRes?.success) setMarketplaceSettings(marketplaceRes.data);
      if (systemRes?.success) setSystemSettings(systemRes.data);
      if (securityRes?.success) setSecuritySettings(securityRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showSnackbar('Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveSettings = async (type: string) => {
    try {
      setSaving(true);
      let result;

      switch (type) {
        case 'marketplace':
          if (editMarketplace) {
            result = await AdminApi.updateMarketplaceSettings(editMarketplace);
            if (result?.success) {
              setMarketplaceSettings(result.data);
              setEditMarketplace(null);
            }
          }
          break;
        case 'system':
          if (editSystem) {
            result = await AdminApi.updateSystemSettings(editSystem);
            if (result?.success) {
              setSystemSettings(result.data);
              setEditSystem(null);
            }
          }
          break;
        case 'security':
          if (editSecurity) {
            result = await AdminApi.updateSecuritySettings(editSecurity);
            if (result?.success) {
              setSecuritySettings(result.data);
              setEditSecurity(null);
            }
          }
          break;
      }

      if (result?.success) {
        setEditMode(null);
        showSnackbar(result.message || 'Settings updated successfully', 'success');
      } else {
        showSnackbar('Failed to update settings', 'error');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      showSnackbar(error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (type: string) => {
    switch (type) {
      case 'marketplace':
        setEditMarketplace(null);
        break;
      case 'system':
        setEditSystem(null);
        break;
      case 'security':
        setEditSecurity(null);
        break;
    }
    setEditMode(null);
  };

  const handleStartEdit = (type: string) => {
    switch (type) {
      case 'marketplace':
        setEditMarketplace(marketplaceSettings ? { ...marketplaceSettings } : null);
        break;
      case 'system':
        setEditSystem(systemSettings ? { ...systemSettings } : null);
        break;
      case 'security':
        setEditSecurity(securitySettings ? { ...securitySettings } : null);
        break;
    }
    setEditMode(type);
  };

  const handleResetSettings = async (type: string) => {
    try {
      setSaving(true);
      const result = await AdminApi.resetSettings(type);

      if (result?.success) {
        switch (type) {
          case 'marketplace':
            setMarketplaceSettings(result.data);
            setEditMarketplace(null);
            break;
          case 'system':
            setSystemSettings(result.data);
            setEditSystem(null);
            break;
          case 'security':
            setSecuritySettings(result.data);
            setEditSecurity(null);
            break;
        }

        setEditMode(null);
        setResetDialog({ open: false, type: '' });
        showSnackbar(result.message || 'Settings reset successfully', 'success');
      } else {
        showSnackbar('Failed to reset settings', 'error');
      }
    } catch (error: any) {
      console.error('Failed to reset settings:', error);
      showSnackbar(error.message || 'Failed to reset settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Settings Management</Typography>
        <Typography>Loading settings...</Typography>
      </Container>
    );
  }

  if (!marketplaceSettings) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Settings Management</Typography>
        <Typography color="error">Failed to load settings</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchAllSettings}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<PercentIcon />}
            label="Marketplace"
            id="settings-tab-0"
            aria-controls="settings-tabpanel-0"
          />
          <Tab
            icon={<SystemIcon />}
            label="System"
            id="settings-tab-1"
            aria-controls="settings-tabpanel-1"
          />
          <Tab
            icon={<SecurityIcon />}
            label="Security"
            id="settings-tab-2"
            aria-controls="settings-tabpanel-2"
          />
        </Tabs>

        {/* Marketplace Settings Tab */}
        <TabPanel value={tabValue} index={0}>
          {marketplaceSettings && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Marketplace Configuration</Typography>
                  <Stack direction="row" spacing={1}>
                    {editMode === 'marketplace' ? (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveSettings('marketplace')}
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelEdit('marketplace')}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleStartEdit('marketplace')}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<ResetIcon />}
                          onClick={() => setResetDialog({ open: true, type: 'marketplace' })}
                        >
                          Reset
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>
              </Grid>

              {editMode === 'marketplace' && editMarketplace ? (
                // Edit Mode
                <>
                  {/* Commission & Financial Settings - Edit Mode */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Commission & Financial</Typography>
                        <Stack spacing={3}>
                          <TextField
                            label="Platform Commission Rate (%)"
                            type="number"
                            value={editMarketplace.commissionRate * 100}
                            onChange={(e) => setEditMarketplace({
                              ...editMarketplace,
                              commissionRate: (parseFloat(e.target.value) || 0) / 100
                            })}
                            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.1 } }}
                            helperText="Platform commission rate as percentage (0-100%)"
                          />
                          <TextField
                            label="Max Image Size (MB)"
                            type="number"
                            value={Math.round(editMarketplace.maxImageSize / (1024 * 1024))}
                            onChange={(e) => setEditMarketplace({
                              ...editMarketplace,
                              maxImageSize: (parseInt(e.target.value) || 5) * 1024 * 1024
                            })}
                            slotProps={{ htmlInput: { min: 1, max: 50 } }}
                            helperText="Maximum image size in megabytes"
                          />
                          <TextField
                            label="Max Images Per Product"
                            type="number"
                            value={editMarketplace.maxImagesPerProduct}
                            onChange={(e) => setEditMarketplace({
                              ...editMarketplace,
                              maxImagesPerProduct: parseInt(e.target.value) || 10
                            })}
                            slotProps={{ htmlInput: { min: 1, max: 20 } }}
                            helperText="Maximum number of images per product"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Security & Approval Settings - Edit Mode */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Security & Approval</Typography>
                        <Stack spacing={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editMarketplace.autoApproveProducts}
                                onChange={(e) => setEditMarketplace({
                                  ...editMarketplace,
                                  autoApproveProducts: e.target.checked
                                })}
                              />
                            }
                            label="Auto-approve Products"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editMarketplace.requireVendorVerification}
                                onChange={(e) => setEditMarketplace({
                                  ...editMarketplace,
                                  requireVendorVerification: e.target.checked
                                })}
                              />
                            }
                            label="Require Vendor Verification"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editMarketplace.allowGuestCheckout}
                                onChange={(e) => setEditMarketplace({
                                  ...editMarketplace,
                                  allowGuestCheckout: e.target.checked
                                })}
                              />
                            }
                            label="Allow Guest Checkout"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              ) : (
                // View Mode
                <>
        {/* Commission & Financial Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PercentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Commission & Financial</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <MoneyIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Platform Commission Rate"
                    secondary={formatPercentage(marketplaceSettings.commissionRate)}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Supported Currencies"
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {marketplaceSettings.currencies.map((currency: string) => (
                          <Chip
                            key={currency}
                            label={currency}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                            color={currency === 'USD' ? 'primary' : 'default'}
                          />
                        ))}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <ImageIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Max Image Size"
                    secondary={formatFileSize(marketplaceSettings.maxImageSize)}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <PhotoLibraryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Max Images Per Product"
                    secondary={`${marketplaceSettings.maxImagesPerProduct} images`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Categories */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Product Categories</Typography>
              </Box>
              <Box>
                {marketplaceSettings.categories.map((category: string) => (
                  <Chip
                    key={category}
                    label={category}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                    variant="outlined"
                  />
                ))}
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Total: {marketplaceSettings.categories.length} categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Image & Media Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ImageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Image & Media</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Maximum Image Size"
                    secondary={formatFileSize(marketplaceSettings.maxImageSize)}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Max Images per Product"
                    secondary={`${marketplaceSettings.maxImagesPerProduct} images`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security & Approval Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Security & Approval</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Auto-approve Products"
                  />
                  <Chip
                    label={marketplaceSettings.autoApproveProducts ? 'Enabled' : 'Disabled'}
                    color={marketplaceSettings.autoApproveProducts ? 'success' : 'error'}
                    size="small"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Require Vendor Verification"
                  />
                  <Chip
                    label={marketplaceSettings.requireVendorVerification ? 'Required' : 'Optional'}
                    color={marketplaceSettings.requireVendorVerification ? 'warning' : 'default'}
                    size="small"
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Allow Guest Checkout"
                  />
                  <Chip
                    label={marketplaceSettings.allowGuestCheckout ? 'Allowed' : 'Disabled'}
                    color={marketplaceSettings.allowGuestCheckout ? 'success' : 'error'}
                    size="small"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
                </>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* System Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          {systemSettings && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">System Configuration</Typography>
                  <Stack direction="row" spacing={1}>
                    {editMode === 'system' ? (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveSettings('system')}
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelEdit('system')}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleStartEdit('system')}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<ResetIcon />}
                          onClick={() => setResetDialog({ open: true, type: 'system' })}
                        >
                          Reset
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>
              </Grid>

              {editMode === 'system' && editSystem ? (
                // Edit Mode
                <>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Maintenance & Operations</Typography>
                        <Stack spacing={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editSystem.maintenanceMode}
                                onChange={(e) => setEditSystem({
                                  ...editSystem,
                                  maintenanceMode: e.target.checked
                                })}
                              />
                            }
                            label="Maintenance Mode"
                          />
                          <TextField
                            label="Maintenance Message"
                            multiline
                            rows={3}
                            value={editSystem.maintenanceMessage}
                            onChange={(e) => setEditSystem({
                              ...editSystem,
                              maintenanceMessage: e.target.value
                            })}
                            fullWidth
                            helperText="Message displayed to users during maintenance"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>System Limits & Features</Typography>
                        <Stack spacing={3}>
                          <TextField
                            label="Max Products per Vendor"
                            type="number"
                            value={editSystem.maxProductsPerVendor}
                            onChange={(e) => setEditSystem({
                              ...editSystem,
                              maxProductsPerVendor: parseInt(e.target.value) || 0
                            })}
                            inputProps={{ min: 1, max: 10000 }}
                            helperText="Maximum number of products each vendor can list"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editSystem.enableNotifications}
                                onChange={(e) => setEditSystem({
                                  ...editSystem,
                                  enableNotifications: e.target.checked
                                })}
                              />
                            }
                            label="Enable Notifications"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editSystem.enableAnalytics}
                                onChange={(e) => setEditSystem({
                                  ...editSystem,
                                  enableAnalytics: e.target.checked
                                })}
                              />
                            }
                            label="Enable Analytics"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              ) : (
                // View Mode
                <>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <MaintenanceIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">Maintenance & Operations</Typography>
                        </Box>
                        <List>
                          <ListItem>
                            <ListItemText
                              primary="Maintenance Mode"
                            />
                            <Chip
                              label={systemSettings.maintenanceMode ? 'Active' : 'Inactive'}
                              color={systemSettings.maintenanceMode ? 'warning' : 'success'}
                              size="small"
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemText
                              primary="Maintenance Message"
                              secondary={systemSettings.maintenanceMessage || 'No message set'}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ProductIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">System Limits & Features</Typography>
                        </Box>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <ProductIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Max Products per Vendor"
                              secondary={`${systemSettings.maxProductsPerVendor} products`}
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemIcon>
                              <NotificationsIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Notifications"
                            />
                            <Chip
                              label={systemSettings.enableNotifications ? 'Enabled' : 'Disabled'}
                              color={systemSettings.enableNotifications ? 'success' : 'error'}
                              size="small"
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemIcon>
                              <AnalyticsIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Analytics"
                            />
                            <Chip
                              label={systemSettings.enableAnalytics ? 'Enabled' : 'Disabled'}
                              color={systemSettings.enableAnalytics ? 'success' : 'error'}
                              size="small"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </TabPanel>

        {/* Security Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          {securitySettings && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Security Configuration</Typography>
                  <Stack direction="row" spacing={1}>
                    {editMode === 'security' ? (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveSettings('security')}
                          disabled={saving}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => handleCancelEdit('security')}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleStartEdit('security')}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="warning"
                          startIcon={<ResetIcon />}
                          onClick={() => setResetDialog({ open: true, type: 'security' })}
                        >
                          Reset
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>
              </Grid>

              {editMode === 'security' && editSecurity ? (
                // Edit Mode
                <>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Authentication & Access</Typography>
                        <Stack spacing={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editSecurity.enableTwoFactor}
                                onChange={(e) => setEditSecurity({
                                  ...editSecurity,
                                  enableTwoFactor: e.target.checked
                                })}
                              />
                            }
                            label="Enable Two-Factor Authentication"
                          />
                          <TextField
                            label="Session Timeout (minutes)"
                            type="number"
                            value={editSecurity.sessionTimeout}
                            onChange={(e) => setEditSecurity({
                              ...editSecurity,
                              sessionTimeout: parseInt(e.target.value) || 30
                            })}
                            inputProps={{ min: 5, max: 1440 }}
                            helperText="Session timeout in minutes (5-1440)"
                          />
                          <TextField
                            label="Max Login Attempts"
                            type="number"
                            value={editSecurity.maxLoginAttempts}
                            onChange={(e) => setEditSecurity({
                              ...editSecurity,
                              maxLoginAttempts: parseInt(e.target.value) || 5
                            })}
                            inputProps={{ min: 3, max: 20 }}
                            helperText="Maximum failed login attempts before lockout"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Password Requirements</Typography>
                        <Stack spacing={3}>
                          <TextField
                            label="Minimum Password Length"
                            type="number"
                            value={editSecurity.passwordMinLength}
                            onChange={(e) => setEditSecurity({
                              ...editSecurity,
                              passwordMinLength: parseInt(e.target.value) || 8
                            })}
                            inputProps={{ min: 6, max: 50 }}
                            helperText="Minimum number of characters required"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editSecurity.requirePasswordComplexity}
                                onChange={(e) => setEditSecurity({
                                  ...editSecurity,
                                  requirePasswordComplexity: e.target.checked
                                })}
                              />
                            }
                            label="Require Password Complexity"
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              ) : (
                // View Mode
                <>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <SecurityIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">Authentication & Access</Typography>
                        </Box>
                        <List>
                          <ListItem>
                            <ListItemText
                              primary="Two-Factor Authentication"
                            />
                            <Chip
                              label={securitySettings.enableTwoFactor ? 'Enabled' : 'Disabled'}
                              color={securitySettings.enableTwoFactor ? 'success' : 'error'}
                              size="small"
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemText
                              primary="Session Timeout"
                              secondary={`${securitySettings.sessionTimeout} minutes`}
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemText
                              primary="Max Login Attempts"
                              secondary={`${securitySettings.maxLoginAttempts} attempts`}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <SecurityIcon color="primary" sx={{ mr: 1 }} />
                          <Typography variant="h6">Password Requirements</Typography>
                        </Box>
                        <List>
                          <ListItem>
                            <ListItemText
                              primary="Minimum Password Length"
                              secondary={`${securitySettings.passwordMinLength} characters`}
                            />
                          </ListItem>
                          <Divider />
                          <ListItem>
                            <ListItemText
                              primary="Password Complexity"
                            />
                            <Chip
                              label={securitySettings.requirePasswordComplexity ? 'Required' : 'Optional'}
                              color={securitySettings.requirePasswordComplexity ? 'warning' : 'default'}
                              size="small"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ open: false, type: '' })}
      >
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset {resetDialog.type} settings to default values?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, type: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleResetSettings(resetDialog.type)}
            color="warning"
            variant="contained"
            disabled={saving}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Alert,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import {
  Bell,
  X,
  Plus,
  TrendingDown,
  TrendingUp,
  Target,
  Trash2,
  Edit,
  DollarSign,
  Percent,
} from 'lucide-react';

interface PriceAlertsProps {
  open: boolean;
  onClose: () => void;
  productId?: string;
  currentPrice?: number;
  currency?: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  alertType: 'below' | 'above' | 'change';
  changePercentage?: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  notificationMethods: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({
  open,
  onClose,
  productId,
  currentPrice,
  currency = 'USD',
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const [newAlert, setNewAlert] = useState({
    targetPrice: currentPrice || 0,
    alertType: 'below' as 'below' | 'above' | 'change',
    changePercentage: 10,
    notificationMethods: {
      email: true,
      push: true,
      sms: false,
    },
  });

  // No mock data - should fetch real alerts from backend
  const alerts: PriceAlert[] = [];

  const handleCreateAlert = () => {
    console.log('Creating price alert:', newAlert);
    setShowCreateDialog(false);
    // Reset form
    setNewAlert({
      targetPrice: currentPrice || 0,
      alertType: 'below',
      changePercentage: 10,
      notificationMethods: {
        email: true,
        push: true,
        sms: false,
      },
    });
  };

  const handleEditAlert = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setNewAlert({
      targetPrice: alert.targetPrice,
      alertType: alert.alertType,
      changePercentage: alert.changePercentage || 10,
      notificationMethods: alert.notificationMethods,
    });
    setShowCreateDialog(true);
  };

  const handleDeleteAlert = (alertId: string) => {
    console.log('Deleting alert:', alertId);
  };

  const handleToggleAlert = (alertId: string, isActive: boolean) => {
    console.log('Toggling alert:', alertId, isActive);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'below':
        return <TrendingDown size={16} color="#4caf50" />;
      case 'above':
        return <TrendingUp size={16} color="#f44336" />;
      case 'change':
        return <Target size={16} color="#ff9800" />;
      default:
        return <Bell size={16} />;
    }
  };

  const getAlertTypeText = (alert: PriceAlert) => {
    switch (alert.alertType) {
      case 'below':
        return `When price drops below ${formatPrice(alert.targetPrice, alert.currency)}`;
      case 'above':
        return `When price goes above ${formatPrice(alert.targetPrice, alert.currency)}`;
      case 'change':
        return `When price changes by ${alert.changePercentage}%`;
      default:
        return 'Price alert';
    }
  };

  const getAlertStatus = (alert: PriceAlert) => {
    if (!alert.isActive && alert.triggeredAt) {
      return { color: 'success' as const, label: 'Triggered' };
    }
    if (!alert.isActive) {
      return { color: 'default' as const, label: 'Inactive' };
    }
    return { color: 'primary' as const, label: 'Active' };
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Bell size={24} />
              <Typography variant="h6" fontWeight={600}>
                Price Alerts
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => setShowCreateDialog(true)}
                variant="outlined"
                size="small"
              >
                New Alert
              </Button>
              <IconButton onClick={onClose}>
                <X size={20} />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {alerts.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <Bell size={48} color="#ccc" />
              <Typography variant="h6" color="text.secondary" mt={2}>
                No price alerts set
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Create alerts to get notified when prices change
              </Typography>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => setShowCreateDialog(true)}
                variant="contained"
                sx={{ mt: 2 }}
              >
                Create Your First Alert
              </Button>
            </Box>
          ) : (
            <List>
              {alerts.map((alert, index) => {
                const status = getAlertStatus(alert);
                return (
                  <React.Fragment key={alert.id}>
                    <ListItem sx={{ alignItems: 'flex-start', py: 2 }}>
                      <ListItemAvatar>
                        <Avatar
                          src={alert.productImage}
                          variant="rounded"
                          sx={{ width: 60, height: 60 }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {alert.productTitle}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                              {getAlertTypeIcon(alert.alertType)}
                              <Typography variant="body2" color="text.secondary">
                                {getAlertTypeText(alert)}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="body2">
                                Current: {formatPrice(alert.currentPrice, alert.currency)}
                              </Typography>
                              <Chip
                                label={status.label}
                                size="small"
                                color={status.color}
                                variant={alert.isActive ? 'filled' : 'outlined'}
                              />
                            </Box>
                            
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                Notifications:
                              </Typography>
                              {alert.notificationMethods.email && (
                                <Chip label="Email" size="small" variant="outlined" />
                              )}
                              {alert.notificationMethods.push && (
                                <Chip label="Push" size="small" variant="outlined" />
                              )}
                              {alert.notificationMethods.sms && (
                                <Chip label="SMS" size="small" variant="outlined" />
                              )}
                            </Box>

                            <Typography variant="caption" color="text.secondary">
                              Created {new Date(alert.createdAt).toLocaleDateString()}
                              {alert.triggeredAt && (
                                <> • Triggered {new Date(alert.triggeredAt).toLocaleDateString()}</>
                              )}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
                          <FormControlLabel
                            control={
                              <Switch
                                checked={alert.isActive}
                                onChange={(e) => handleToggleAlert(alert.id, e.target.checked)}
                                size="small"
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditAlert(alert)}
                            >
                              <Edit size={14} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteAlert(alert.id)}
                              color="error"
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Box>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < alerts.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Alert Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingAlert(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAlert ? 'Edit Price Alert' : 'Create Price Alert'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Alert Type */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={newAlert.alertType}
                label="Alert Type"
                onChange={(e) => setNewAlert({ ...newAlert, alertType: e.target.value as any })}
              >
                <MenuItem value="below">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingDown size={16} color="#4caf50" />
                    Price drops below target
                  </Box>
                </MenuItem>
                <MenuItem value="above">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendingUp size={16} color="#f44336" />
                    Price goes above target
                  </Box>
                </MenuItem>
                <MenuItem value="change">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Target size={16} color="#ff9800" />
                    Price changes by percentage
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Target Price or Percentage */}
            {newAlert.alertType === 'change' ? (
              <TextField
                fullWidth
                label="Change Percentage"
                type="number"
                value={newAlert.changePercentage}
                onChange={(e) => setNewAlert({ ...newAlert, changePercentage: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
            ) : (
              <TextField
                fullWidth
                label="Target Price"
                type="number"
                value={newAlert.targetPrice}
                onChange={(e) => setNewAlert({ ...newAlert, targetPrice: parseFloat(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {currency === 'ETH' ? 'ETH' : '$'}
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            )}

            {currentPrice && newAlert.alertType !== 'change' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Current price: {formatPrice(currentPrice, currency)}
              </Alert>
            )}

            {/* Notification Methods */}
            <Typography variant="subtitle2" gutterBottom>
              Notification Methods
            </Typography>
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newAlert.notificationMethods.email}
                    onChange={(e) => setNewAlert({
                      ...newAlert,
                      notificationMethods: {
                        ...newAlert.notificationMethods,
                        email: e.target.checked,
                      },
                    })}
                  />
                }
                label="Email notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newAlert.notificationMethods.push}
                    onChange={(e) => setNewAlert({
                      ...newAlert,
                      notificationMethods: {
                        ...newAlert.notificationMethods,
                        push: e.target.checked,
                      },
                    })}
                  />
                }
                label="Push notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newAlert.notificationMethods.sms}
                    onChange={(e) => setNewAlert({
                      ...newAlert,
                      notificationMethods: {
                        ...newAlert.notificationMethods,
                        sms: e.target.checked,
                      },
                    })}
                  />
                }
                label="SMS notifications"
              />
            </Box>

            <Alert severity="info">
              You'll receive notifications when the price condition is met. 
              Alerts are checked every hour.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCreateDialog(false);
            setEditingAlert(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateAlert}
            variant="contained"
            disabled={
              (newAlert.alertType !== 'change' && newAlert.targetPrice <= 0) ||
              (newAlert.alertType === 'change' && newAlert.changePercentage <= 0) ||
              (!newAlert.notificationMethods.email && !newAlert.notificationMethods.push && !newAlert.notificationMethods.sms)
            }
          >
            {editingAlert ? 'Update Alert' : 'Create Alert'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PriceAlerts;
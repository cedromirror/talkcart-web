import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  PersonAdd as PersonAddIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface VendorAnalytics {
  total_vendors: number;
  active_vendors: number;
  kyc_approved: number;
  suspended_vendors: number;
  new_vendors: number;
  total_revenue: number;
  total_orders: number;
  avg_revenue_per_vendor: number;
  vendor_growth_rate: number;
}

interface VendorSummary {
  total_vendors: number;
  active_vendors: number;
  kyc_approved: number;
  recent_signups: number;
  approval_rate: number;
}

interface VendorDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

export default function VendorDashboard({ timeRange = '30d', onRefresh }: VendorDashboardProps) {
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [analyticsRes, summaryRes] = await Promise.all([
        AdminApi.getVendorAnalytics(timeRange),
        AdminApi.getVendorSummary()
      ]);

      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
      
      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch vendor dashboard data:', err);
      setError('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vendor Analytics Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const data = analytics || summary;
  if (!data) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Vendor Analytics Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Total Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <PeopleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Vendors
                  </Typography>
                  <Typography variant="h4">
                    {data.total_vendors || 0}
                  </Typography>
                  {analytics?.new_vendors !== undefined && (
                    <Typography variant="caption" color="success.main">
                      +{analytics.new_vendors} new ({timeRange})
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'success.main',
                    color: 'white'
                  }}
                >
                  <CheckCircleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Vendors
                  </Typography>
                  <Typography variant="h4">
                    {data.active_vendors || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.total_vendors > 0 
                      ? formatPercentage((data.active_vendors / data.total_vendors) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* KYC Approved */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'info.main',
                    color: 'white'
                  }}
                >
                  <AssessmentIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    KYC Approved
                  </Typography>
                  <Typography variant="h4">
                    {data.kyc_approved || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary?.approval_rate !== undefined 
                      ? formatPercentage(summary.approval_rate)
                      : data.total_vendors > 0 
                        ? formatPercentage((data.kyc_approved / data.total_vendors) * 100)
                        : '0%'} approval rate
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue or Suspended */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: analytics?.total_revenue ? 'warning.main' : 'error.main',
                    color: 'white'
                  }}
                >
                  {analytics?.total_revenue ? <MoneyIcon /> : <BlockIcon />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {analytics?.total_revenue ? 'Total Revenue' : 'Suspended'}
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.total_revenue 
                      ? formatCurrency(analytics.total_revenue)
                      : (analytics?.suspended_vendors || 0)}
                  </Typography>
                  {analytics?.avg_revenue_per_vendor && (
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(analytics.avg_revenue_per_vendor)} avg/vendor
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Vendor Growth Rate */}
        {analytics?.vendor_growth_rate !== undefined && (
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Vendor Growth Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {formatPercentage(analytics.vendor_growth_rate)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(analytics.vendor_growth_rate, 100)} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Activity */}
        {summary?.recent_signups !== undefined && (
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PersonAddIcon color="success" />
                    <Typography variant="body2" color="text.secondary">
                      Recent Signups (24h)
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {summary.recent_signups}
                  </Typography>
                  <Chip 
                    label={summary.recent_signups > 0 ? 'Active Growth' : 'No New Signups'}
                    color={summary.recent_signups > 0 ? 'success' : 'default'}
                    size="small"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Total Orders */}
        {analytics?.total_orders !== undefined && (
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AssessmentIcon color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Total Orders ({timeRange})
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {analytics.total_orders.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics.total_vendors > 0 
                      ? (analytics.total_orders / analytics.total_vendors).toFixed(1)
                      : '0'} orders per vendor
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

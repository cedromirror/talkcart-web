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
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  Verified as VerifiedIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface UserAnalytics {
  total_users: number;
  active_users: number;
  new_users: number;
  suspended_users: number;
  user_growth_rate: number;
  kyc_distribution: Record<string, number>;
  role_distribution: Record<string, number>;
  growth_chart: Array<{ _id: string; count: number }>;
  time_range: string;
}

interface UserSummary {
  total_users: number;
  active_users: number;
  kyc_approved: number;
  recent_signups: number;
  vendor_users: number;
  approval_rate: number;
}

interface UserDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

export default function UserDashboard({ timeRange = '30d', onRefresh }: UserDashboardProps) {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [analyticsRes, summaryRes] = await Promise.all([
        AdminApi.getUserAnalytics(timeRange),
        AdminApi.getUserSummary()
      ]);

      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
      
      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch user dashboard data:', err);
      setError('Failed to load user data');
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Analytics Dashboard
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
          User Analytics Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Total Users */}
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
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {data.total_users || 0}
                  </Typography>
                  {analytics?.new_users !== undefined && (
                    <Typography variant="caption" color="success.main">
                      +{analytics.new_users} new ({timeRange})
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users */}
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
                  <VerifiedIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                  <Typography variant="h4">
                    {data.active_users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.total_users > 0 
                      ? formatPercentage((data.active_users / data.total_users) * 100)
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
                    {summary?.kyc_approved || analytics?.kyc_distribution?.approved || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary?.approval_rate !== undefined
                      ? formatPercentage(summary.approval_rate)
                      : data.total_users > 0
                        ? formatPercentage(((summary?.kyc_approved || analytics?.kyc_distribution?.approved || 0) / data.total_users) * 100)
                        : '0%'} approval rate
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Suspended Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'error.main',
                    color: 'white'
                  }}
                >
                  <BlockIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Suspended
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.suspended_users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.total_users > 0 
                      ? formatPercentage(((analytics?.suspended_users || 0) / data.total_users) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* User Growth Rate */}
        {analytics?.user_growth_rate !== undefined && (
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      User Growth Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {formatPercentage(analytics.user_growth_rate)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(Math.abs(analytics.user_growth_rate), 100)} 
                    sx={{ height: 8, borderRadius: 4 }}
                    color={analytics.user_growth_rate >= 0 ? 'success' : 'error'}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Signups */}
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

        {/* Vendor Users */}
        {summary?.vendor_users !== undefined && (
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AssessmentIcon color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Vendor Users
                    </Typography>
                  </Stack>
                  <Typography variant="h5">
                    {summary.vendor_users.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.total_users > 0 
                      ? formatPercentage((summary.vendor_users / data.total_users) * 100)
                      : '0%'} of all users
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

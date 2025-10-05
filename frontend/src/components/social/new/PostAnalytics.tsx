import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  useTheme,
  alpha,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { 
  BarChart, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share, 
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
  Clock,
} from 'lucide-react';

interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  reach: number;
  impressions: number;
  saves: number;
  clicks: number;
}

interface TimeRange {
  label: string;
  value: '24h' | '7d' | '30d' | 'all';
}

export const PostAnalytics: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [loading, setLoading] = useState(false);

  const timeRanges: TimeRange[] = [
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: 'All', value: 'all' },
  ];

  // Mock analytics data
  const analyticsData: Record<string, AnalyticsData> = {
    '24h': {
      views: 1240,
      likes: 320,
      comments: 42,
      shares: 28,
      engagementRate: 3.2,
      reach: 980,
      impressions: 1450,
      saves: 15,
      clicks: 87,
    },
    '7d': {
      views: 8920,
      likes: 2150,
      comments: 287,
      shares: 156,
      engagementRate: 4.1,
      reach: 6750,
      impressions: 10200,
      saves: 98,
      clicks: 542,
    },
    '30d': {
      views: 34500,
      likes: 9800,
      comments: 1240,
      shares: 650,
      engagementRate: 3.8,
      reach: 28700,
      impressions: 42100,
      saves: 420,
      clicks: 2150,
    },
    'all': {
      views: 125600,
      likes: 42300,
      comments: 5680,
      shares: 2980,
      engagementRate: 4.2,
      reach: 98500,
      impressions: 156800,
      saves: 1890,
      clicks: 8750,
    },
  };

  const currentData = analyticsData[timeRange];

  // Format large numbers (e.g., 1.2K, 3.4M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon, 
    color,
    change
  }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string;
    change?: number;
  }) => (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 2, 
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        '&:hover': {
          borderColor: alpha(color, 0.5),
          bgcolor: alpha(color, 0.02)
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {formatNumber(value)}
          </Typography>
          {change !== undefined && (
            <Chip 
              label={`${change > 0 ? '+' : ''}${change}%`}
              size="small"
              color={change > 0 ? 'success' : change < 0 ? 'error' : 'default'}
              sx={{ 
                height: 20, 
                fontSize: '0.7rem',
                fontWeight: 600
              }} 
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        bgcolor: 'background.paper'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChart3 size={20} color={theme.palette.primary.main} />
            <Typography variant="h6" fontWeight={700}>
              Post Analytics
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {timeRanges.map((range) => (
              <Chip
                key={range.value}
                label={range.label}
                size="small"
                onClick={() => setTimeRange(range.value)}
                sx={{ 
                  height: 24, 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  bgcolor: timeRange === range.value 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : 'transparent',
                  color: timeRange === range.value 
                    ? 'primary.main' 
                    : 'text.secondary',
                  '&:hover': {
                    bgcolor: timeRange === range.value 
                      ? alpha(theme.palette.primary.main, 0.2) 
                      : alpha(theme.palette.grey[300], 0.3)
                  }
                }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
          <MetricCard 
            title="Views" 
            value={currentData.views} 
            icon={<Eye size={18} />} 
            color={theme.palette.info.main}
            change={timeRange === '7d' ? 12 : timeRange === '30d' ? 8 : undefined}
          />
          
          <MetricCard 
            title="Likes" 
            value={currentData.likes} 
            icon={<Heart size={18} />} 
            color={theme.palette.error.main}
            change={timeRange === '7d' ? 5 : timeRange === '30d' ? 3 : undefined}
          />
          
          <MetricCard 
            title="Comments" 
            value={currentData.comments} 
            icon={<MessageSquare size={18} />} 
            color={theme.palette.primary.main}
            change={timeRange === '7d' ? 18 : timeRange === '30d' ? 12 : undefined}
          />
          
          <MetricCard 
            title="Shares" 
            value={currentData.shares} 
            icon={<Share size={18} />} 
            color={theme.palette.success.main}
            change={timeRange === '7d' ? 22 : timeRange === '30d' ? 15 : undefined}
          />
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp size={18} color={theme.palette.warning.main} />
              <Typography variant="subtitle2" fontWeight={600}>
                Engagement Overview
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {currentData.engagementRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Engagement Rate
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600}>
                  {formatNumber(currentData.reach)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reach
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={600}>
                  {formatNumber(currentData.impressions)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Impressions
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Bookmark size={16} color={theme.palette.secondary.main} />
                <Typography variant="body2" fontWeight={600}>
                  Saves
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {formatNumber(currentData.saves)}
              </Typography>
            </CardContent>
          </Card>
          
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BarChart size={16} color={theme.palette.info.main} />
                <Typography variant="body2" fontWeight={600}>
                  CTR
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {(currentData.clicks / currentData.views * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </CardContent>
    </Card>
  );
};

// Placeholder for Bookmark icon since it wasn't imported
const Bookmark = ({ size, color }: { size: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color || "none"} stroke={color || "currentColor"} strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export default PostAnalytics;
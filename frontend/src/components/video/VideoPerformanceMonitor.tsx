import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Alert,
  Collapse,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Activity,
  Wifi,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Signal,
  Cpu,
  HardDrive,
  Battery,
} from 'lucide-react';
import { getVideoMaintenanceManager } from '@/utils/videoMaintenance';
import { getVideoQualityManager } from '@/utils/videoQualityManager';

interface VideoPerformanceMonitorProps {
  videoId: string;
  videoElement?: HTMLVideoElement | null;
  compact?: boolean;
  showDetails?: boolean;
  onPerformanceIssue?: (issue: string, severity: 'low' | 'medium' | 'high') => void;
}

interface PerformanceMetrics {
  fps: number;
  droppedFrames: number;
  bufferHealth: number;
  bandwidth: number;
  latency: number;
  memoryUsage: number;
  cpuUsage: number;
  qualityLevel: string;
  networkType: string;
  playbackErrors: number;
  bufferingEvents: number;
  averageLoadTime: number;
}

export const VideoPerformanceMonitor: React.FC<VideoPerformanceMonitorProps> = ({
  videoId,
  videoElement,
  compact = false,
  showDetails = false,
  onPerformanceIssue,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    droppedFrames: 0,
    bufferHealth: 0,
    bandwidth: 0,
    latency: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    qualityLevel: 'Unknown',
    networkType: 'Unknown',
    playbackErrors: 0,
    bufferingEvents: 0,
    averageLoadTime: 0,
  });
  
  const [expanded, setExpanded] = useState(!compact);
  const [alerts, setAlerts] = useState<Array<{ message: string; severity: 'low' | 'medium' | 'high'; timestamp: number }>>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const metricsHistory = useRef<PerformanceMetrics[]>([]);
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);
  const performanceObserver = useRef<PerformanceObserver | null>(null);

  // Initialize monitoring
  useEffect(() => {
    if (videoElement && videoId) {
      startMonitoring();
      return () => stopMonitoring();
    }
  }, [videoElement, videoId]);

  const startMonitoring = () => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Start metrics collection
    monitoringInterval.current = setInterval(() => {
      collectMetrics();
    }, 1000);

    // Start performance observation
    if (typeof window !== 'undefined' && window.PerformanceObserver) {
      try {
        performanceObserver.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.includes(videoId)) {
              updatePerformanceMetrics(entry);
            }
          });
        });

        performanceObserver.current.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('Performance observer not available:', error);
      }
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }

    if (performanceObserver.current) {
      performanceObserver.current.disconnect();
      performanceObserver.current = null;
    }
  };

  const collectMetrics = () => {
    if (!videoElement) return;

    const maintenanceManager = getVideoMaintenanceManager();
    const qualityManager = getVideoQualityManager();
    const qualityStats = qualityManager.getQualityStats();
    const performanceSummary = maintenanceManager.getPerformanceSummary();

    // Collect video-specific metrics
    const videoMetrics = getVideoMetrics(videoElement);
    const networkMetrics = getNetworkMetrics();
    const systemMetrics = getSystemMetrics();

    const newMetrics: PerformanceMetrics = {
      ...videoMetrics,
      ...networkMetrics,
      ...systemMetrics,
      qualityLevel: qualityStats.currentQuality?.label || 'Auto',
      playbackErrors: performanceSummary.totalErrors || 0,
      averageLoadTime: performanceSummary.avgLoadTime || 0,
    };

    setMetrics(newMetrics);
    
    // Store in history
    metricsHistory.current.push(newMetrics);
    if (metricsHistory.current.length > 60) { // Keep last 60 seconds
      metricsHistory.current.shift();
    }

    // Check for performance issues
    checkPerformanceIssues(newMetrics);
  };

  const getVideoMetrics = (video: HTMLVideoElement) => {
    let fps = 0;
    let droppedFrames = 0;
    let bufferHealth = 0;

    try {
      // Get video playback quality if available
      if ('getVideoPlaybackQuality' in video) {
        const quality = (video as any).getVideoPlaybackQuality();
        fps = quality.totalVideoFrames / (video.currentTime || 1);
        droppedFrames = quality.droppedVideoFrames;
      }

      // Calculate buffer health
      const buffered = video.buffered;
      if (buffered.length > 0) {
        const currentTime = video.currentTime;
        const bufferedEnd = buffered.end(buffered.length - 1);
        const bufferAhead = bufferedEnd - currentTime;
        bufferHealth = Math.min(1, Math.max(0, bufferAhead / 10)); // 10 seconds is full health
      }
    } catch (error) {
      console.warn('Error collecting video metrics:', error);
    }

    return { fps, droppedFrames, bufferHealth };
  };

  const getNetworkMetrics = () => {
    let bandwidth = 0;
    let latency = 0;
    let networkType = 'Unknown';

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      bandwidth = connection.downlink || 0;
      latency = connection.rtt || 0;
      networkType = connection.effectiveType || 'Unknown';
    }

    return { bandwidth, latency, networkType };
  };

  const getSystemMetrics = () => {
    let memoryUsage = 0;
    let cpuUsage = 0;

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }

    // CPU usage (rough approximation)
    const start = performance.now();
    let iterations = 0;
    const maxTime = 1;

    while (performance.now() - start < maxTime) {
      iterations++;
    }

    cpuUsage = Math.min(100, Math.max(0, 100 - (iterations / 10000)));

    return { memoryUsage, cpuUsage, bufferingEvents: 0 }; // bufferingEvents would be tracked separately
  };

  const updatePerformanceMetrics = (entry: PerformanceEntry) => {
    // Update metrics based on performance entries
    console.log('Performance entry:', entry);
  };

  const checkPerformanceIssues = (currentMetrics: PerformanceMetrics) => {
    const issues: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> = [];

    // Check buffer health
    if (currentMetrics.bufferHealth < 0.2) {
      issues.push({
        message: 'Low buffer health - video may stutter',
        severity: 'high'
      });
    } else if (currentMetrics.bufferHealth < 0.5) {
      issues.push({
        message: 'Buffer health below optimal',
        severity: 'medium'
      });
    }

    // Check dropped frames
    if (currentMetrics.droppedFrames > 10) {
      issues.push({
        message: 'High number of dropped frames detected',
        severity: 'high'
      });
    }

    // Check memory usage
    if (currentMetrics.memoryUsage > 500) {
      issues.push({
        message: 'High memory usage detected',
        severity: 'medium'
      });
    }

    // Check network conditions
    if (currentMetrics.bandwidth < 1) {
      issues.push({
        message: 'Low bandwidth may affect video quality',
        severity: 'medium'
      });
    }

    if (currentMetrics.latency > 200) {
      issues.push({
        message: 'High network latency detected',
        severity: 'low'
      });
    }

    // Update alerts
    const newAlerts = issues.map(issue => ({
      ...issue,
      timestamp: Date.now()
    }));

    setAlerts(prev => {
      const combined = [...prev, ...newAlerts];
      // Keep only recent alerts (last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return combined.filter(alert => alert.timestamp > fiveMinutesAgo);
    });

    // Notify parent component
    issues.forEach(issue => {
      onPerformanceIssue?.(issue.message, issue.severity);
    });
  };

  const getHealthColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'success';
    if (value >= thresholds.fair) return 'warning';
    return 'error';
  };

  const getHealthIcon = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return <CheckCircle size={16} color="#4caf50" />;
    if (value >= thresholds.fair) return <AlertTriangle size={16} color="#ff9800" />;
    return <AlertTriangle size={16} color="#f44336" />;
  };

  const getOverallHealth = () => {
    const scores = [
      metrics.bufferHealth * 100,
      Math.max(0, 100 - metrics.droppedFrames),
      Math.min(100, metrics.bandwidth * 20),
      Math.max(0, 100 - metrics.memoryUsage / 5),
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const overallHealth = getOverallHealth();

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title="Video Performance">
          <Chip
            icon={getHealthIcon(overallHealth, { good: 80, fair: 60 })}
            label={`${Math.round(overallHealth)}%`}
            size="small"
            color={getHealthColor(overallHealth, { good: 80, fair: 60 }) as any}
            onClick={() => setExpanded(!expanded)}
          />
        </Tooltip>
        
        {alerts.length > 0 && (
          <Tooltip title={`${alerts.length} performance issues`}>
            <Chip
              icon={<AlertTriangle size={14} />}
              label={alerts.length}
              size="small"
              color="warning"
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Activity size={20} />
            <Typography variant="h6">Performance Monitor</Typography>
            <Chip
              label={isMonitoring ? 'Live' : 'Stopped'}
              size="small"
              color={isMonitoring ? 'success' : 'default'}
            />
          </Box>
          
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        </Box>

        {/* Overall Health */}
        <Box mb={2}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Overall Health</Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(overallHealth)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={overallHealth}
            color={getHealthColor(overallHealth, { good: 80, fair: 60 }) as any}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Collapse in={expanded}>
          {/* Alerts */}
          {alerts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Performance Issues Detected:
              </Typography>
              <List dense>
                {alerts.slice(-3).map((alert, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText
                      primary={alert.message}
                      secondary={new Date(alert.timestamp).toLocaleTimeString()}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* Metrics Grid */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Buffer Health */}
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <HardDrive size={20} color={getHealthColor(metrics.bufferHealth * 100, { good: 80, fair: 50 }) === 'success' ? '#4caf50' : getHealthColor(metrics.bufferHealth * 100, { good: 80, fair: 50 }) === 'warning' ? '#ff9800' : '#f44336'} />
                </Box>
                <Typography variant="h6" color={`${getHealthColor(metrics.bufferHealth * 100, { good: 80, fair: 50 })}.main`}>
                  {Math.round(metrics.bufferHealth * 100)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Buffer Health
                </Typography>
              </Box>
            </Grid>

            {/* Network */}
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Wifi size={20} color={metrics.bandwidth > 5 ? '#4caf50' : metrics.bandwidth > 2 ? '#ff9800' : '#f44336'} />
                </Box>
                <Typography variant="h6" color={metrics.bandwidth > 5 ? 'success.main' : metrics.bandwidth > 2 ? 'warning.main' : 'error.main'}>
                  {metrics.bandwidth.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mbps
                </Typography>
              </Box>
            </Grid>

            {/* Memory */}
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Monitor size={20} color={metrics.memoryUsage < 200 ? '#4caf50' : metrics.memoryUsage < 400 ? '#ff9800' : '#f44336'} />
                </Box>
                <Typography variant="h6" color={metrics.memoryUsage < 200 ? 'success.main' : metrics.memoryUsage < 400 ? 'warning.main' : 'error.main'}>
                  {metrics.memoryUsage}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  MB Memory
                </Typography>
              </Box>
            </Grid>

            {/* Quality */}
            <Grid item xs={6} md={3}>
              <Box textAlign="center">
                <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                  <Eye size={20} color="#2196f3" />
                </Box>
                <Typography variant="h6" color="primary">
                  {metrics.qualityLevel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Quality
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Detailed Metrics */}
          {showDetails && (
            <Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Detailed Metrics
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Zap size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Frame Rate"
                        secondary={`${Math.round(metrics.fps)} fps`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <TrendingDown size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Dropped Frames"
                        secondary={metrics.droppedFrames}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Clock size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Load Time"
                        secondary={`${Math.round(metrics.averageLoadTime)}ms`}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Signal size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Network Type"
                        secondary={metrics.networkType}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Clock size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Latency"
                        secondary={`${metrics.latency}ms`}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Cpu size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary="CPU Usage"
                        secondary={`${Math.round(metrics.cpuUsage)}%`}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default VideoPerformanceMonitor;
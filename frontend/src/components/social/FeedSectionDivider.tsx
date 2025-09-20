import React from 'react';
import {
  Box,
  Typography,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import { Users, TestTube, Sparkles } from 'lucide-react';

interface FeedSectionDividerProps {
  type: 'real' | 'mock';
  count: number;
  title?: string;
  description?: string;
}

const FeedSectionDivider: React.FC<FeedSectionDividerProps> = ({
  type,
  count,
  title,
  description,
}) => {
  const theme = useTheme();

  const config = {
    real: {
      icon: <Users size={20} />,
      title: title || 'Real User Posts',
      description: description || 'Authentic posts from community members',
      color: theme.palette.success.main,
      bgColor: theme.palette.mode === 'dark' 
        ? 'rgba(76, 175, 80, 0.1)' 
        : 'rgba(76, 175, 80, 0.05)',
    },
    mock: {
      icon: <TestTube size={20} />,
      title: title || 'Demo Content',
      description: description || 'Sample posts for demonstration purposes',
      color: theme.palette.warning.main,
      bgColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 152, 0, 0.1)' 
        : 'rgba(255, 152, 0, 0.05)',
    },
  };

  const currentConfig = config[type];

  return (
    <Box
      sx={{
        my: 4,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background glow effect */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: 60,
          background: `linear-gradient(90deg, transparent 0%, ${currentConfig.bgColor} 50%, transparent 100%)`,
          borderRadius: 4,
          zIndex: 0,
        }}
      />

      {/* Divider lines */}
      <Divider 
        sx={{ 
          flex: 1, 
          borderColor: currentConfig.color,
          opacity: 0.3,
          zIndex: 1,
        }} 
      />

      {/* Center content */}
      <Box
        sx={{
          mx: 3,
          px: 3,
          py: 1.5,
          backgroundColor: theme.palette.background.paper,
          borderRadius: 3,
          border: `2px solid ${currentConfig.color}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
          zIndex: 2,
          boxShadow: `0 4px 20px ${currentConfig.color}25`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: currentConfig.color,
            color: 'white',
          }}
        >
          {currentConfig.icon}
        </Box>

        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                color: currentConfig.color,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {currentConfig.title}
            </Typography>
            <Chip
              label={`${count} posts`}
              size="small"
              sx={{
                backgroundColor: currentConfig.color,
                color: 'white',
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          </Box>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {currentConfig.description}
          </Typography>
        </Box>

        {/* Sparkle decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            color: currentConfig.color,
            animation: 'sparkle 2s ease-in-out infinite',
            '@keyframes sparkle': {
              '0%, 100%': {
                opacity: 0.5,
                transform: 'scale(1) rotate(0deg)',
              },
              '50%': {
                opacity: 1,
                transform: 'scale(1.2) rotate(180deg)',
              },
            },
          }}
        >
          <Sparkles size={16} />
        </Box>
      </Box>

      {/* Divider lines */}
      <Divider 
        sx={{ 
          flex: 1, 
          borderColor: currentConfig.color,
          opacity: 0.3,
          zIndex: 1,
        }} 
      />
    </Box>
  );
};

export default FeedSectionDivider;
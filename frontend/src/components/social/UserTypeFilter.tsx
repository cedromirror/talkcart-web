import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Divider,
  useTheme,
} from '@mui/material';
import { Filter, Users, UserCheck } from 'lucide-react';

export type UserFilterType = 'all' | 'real' | 'mock';

interface UserTypeFilterProps {
  activeFilter: UserFilterType;
  onFilterChange: (filter: UserFilterType) => void;
  mockUserCount: number;
  realUserCount: number;
  showMockUsers: boolean;
  onToggleMockUsers: (show: boolean) => void;
}

const UserTypeFilter: React.FC<UserTypeFilterProps> = ({
  activeFilter,
  onFilterChange,
  mockUserCount,
  realUserCount,
  showMockUsers,
  onToggleMockUsers,
}) => {
  const theme = useTheme();

  const filterOptions = [
    {
      value: 'all' as UserFilterType,
      label: 'All Users',
      icon: <Users size={16} />,
      count: mockUserCount + realUserCount,
      color: theme.palette.primary.main,
    },
    {
      value: 'real' as UserFilterType,
      label: 'Real Users',
      icon: <UserCheck size={16} />,
      count: realUserCount,
      color: theme.palette.success.main,
    },
    {
      value: 'mock' as UserFilterType,
      label: 'Demo Users',
      icon: <Filter size={16} />,
      count: mockUserCount,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Card 
      sx={{ 
        mb: 3, 
        borderRadius: 3,
        background: theme.palette.mode === 'dark' 
          ? 'rgba(30, 41, 59, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid',
        borderColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.08)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
          : '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
    >
      <CardContent sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          {/* Filter Options */}
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary'
              }}
            >
              <Filter size={18} />
              Filter by user type:
            </Typography>
            
            <Box display="flex" gap={1} flexWrap="wrap">
              {filterOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {option.icon}
                      <Typography variant="body2" fontWeight={600}>
                        {option.label}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          ml: 0.5,
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          fontWeight: 600,
                        }}
                      >
                        {option.count}
                      </Typography>
                    </Box>
                  }
                  variant={activeFilter === option.value ? 'filled' : 'outlined'}
                  clickable
                  onClick={() => onFilterChange(option.value)}
                  sx={{
                    borderRadius: 3,
                    height: 36,
                    ...(activeFilter === option.value && {
                      backgroundColor: option.color,
                      color: 'white',
                      '& .MuiChip-label': {
                        color: 'white',
                      },
                      '&:hover': {
                        backgroundColor: option.color,
                        opacity: 0.9,
                      },
                    }),
                    ...((activeFilter !== option.value) && {
                      borderColor: option.color,
                      color: option.color,
                      '&:hover': {
                        backgroundColor: `${option.color}15`,
                        borderColor: option.color,
                      },
                    }),
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Toggle Switch */}
          <Box display="flex" alignItems="center" gap={2}>
            <Divider orientation="vertical" flexItem />
            <FormControlLabel
              control={
                <Switch
                  checked={showMockUsers}
                  onChange={(e) => onToggleMockUsers(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  Show demo content
                </Typography>
              }
              sx={{
                m: 0,
                '& .MuiFormControlLabel-label': {
                  color: 'text.secondary',
                },
              }}
            />
          </Box>
        </Box>

        {/* Filter Description */}
        {activeFilter !== 'all' && (
          <Box mt={2} pt={2} borderTop="1px solid" borderColor="divider">
            <Typography variant="body2" color="text.secondary">
              {activeFilter === 'real' && (
                <>
                  Showing posts from <strong>real users</strong> only. These are authentic posts from actual community members.
                </>
              )}
              {activeFilter === 'mock' && (
                <>
                  Showing posts from <strong>demo users</strong> only. These are sample posts for demonstration purposes.
                </>
              )}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UserTypeFilter;
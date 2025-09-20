import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  useTheme,
  SelectChangeEvent,
} from '@mui/material';
import {
  Globe,
  Users,
  Lock,
  Info,
} from 'lucide-react';

interface PostPrivacySelectorProps {
  value: 'public' | 'followers' | 'private';
  onChange: (privacy: 'public' | 'followers' | 'private') => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  showDescription?: boolean;
}

/**
 * PostPrivacySelector component allows users to choose post visibility
 */
export const PostPrivacySelector: React.FC<PostPrivacySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'medium',
  showDescription = true
}) => {
  const theme = useTheme();

  const privacyOptions = [
    {
      value: 'public',
      label: 'Public',
      icon: <Globe size={16} />,
      description: 'Everyone can see this post',
      color: theme.palette.success.main,
      chipColor: 'success' as const
    },
    {
      value: 'followers',
      label: 'Followers',
      icon: <Users size={16} />,
      description: 'Only your followers can see this post',
      color: theme.palette.info.main,
      chipColor: 'info' as const
    },
    {
      value: 'private',
      label: 'Private',
      icon: <Lock size={16} />,
      description: 'Only you can see this post',
      color: theme.palette.warning.main,
      chipColor: 'warning' as const
    }
  ];

  const selectedOption = privacyOptions.find(option => option.value === value);

  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as 'public' | 'followers' | 'private');
  };

  return (
    <Box>
      <FormControl size={size} disabled={disabled} fullWidth>
        <Select
          value={value}
          onChange={handleChange}
          displayEmpty
          renderValue={(selected) => {
            const option = privacyOptions.find(opt => opt.value === selected);
            if (!option) return null;
            
            return (
              <Box display="flex" alignItems="center" gap={1}>
                {option.icon}
                <Typography variant="body2">
                  {option.label}
                </Typography>
                <Chip
                  label={option.label}
                  size="small"
                  color={option.chipColor}
                  variant="outlined"
                />
              </Box>
            );
          }}
          sx={{
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }
          }}
        >
          {privacyOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Box 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    backgroundColor: `${option.color}20`,
                    color: option.color
                  }}
                >
                  {option.icon}
                </Box>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={500}>
                    {option.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
                <Chip
                  label={option.label}
                  size="small"
                  color={option.chipColor}
                  variant="outlined"
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showDescription && selectedOption && (
        <Box 
          display="flex" 
          alignItems="center" 
          gap={1} 
          mt={1}
          p={1.5}
          sx={{
            backgroundColor: `${selectedOption.color}10`,
            borderRadius: 1,
            border: `1px solid ${selectedOption.color}30`
          }}
        >
          <Info size={14} color={selectedOption.color} />
          <Typography variant="caption" color="text.secondary">
            {selectedOption.description}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PostPrivacySelector;
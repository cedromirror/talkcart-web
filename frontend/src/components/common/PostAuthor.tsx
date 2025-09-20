import React from 'react';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import { Verified } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from './UserAvatar';

interface PostAuthorProps {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  size?: 'small' | 'medium' | 'large';
  showRole?: boolean;
  onAuthorClick?: () => void;
  sx?: any;
}

const PostAuthor: React.FC<PostAuthorProps> = ({
  author,
  createdAt,
  size = 'medium',
  showRole = false,
  onAuthorClick,
  sx,
}) => {
  const theme = useTheme();

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={sx}>
      <UserAvatar
        src={author.avatar}
        alt={author.displayName}
        size={size}
        isVerified={author.isVerified}
        onClick={onAuthorClick}
      />
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              cursor: onAuthorClick ? 'pointer' : 'default',
              '&:hover': onAuthorClick ? {
                color: theme.palette.primary.main
              } : undefined,
            }}
            onClick={onAuthorClick}
          >
            {author.displayName}
          </Typography>
          
          {author.isVerified && (
            <Verified 
              size={16} 
              style={{ color: theme.palette.primary.main }} 
            />
          )}
        </Stack>
        
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            @{author.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeAgo}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};

export default PostAuthor;
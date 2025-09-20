import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { VideoIcon } from 'lucide-react';
import { EnhancedVideoUpload } from './EnhancedVideoUpload';
import { useQueryClient } from '@tanstack/react-query';

interface QuickVideoPostButtonProps {
  position?: 'fixed' | 'relative';
  bottom?: number;
  right?: number;
}

export const QuickVideoPostButton: React.FC<QuickVideoPostButtonProps> = ({
  position = 'fixed',
  bottom = 80,
  right = 24,
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  const handleVideoUploaded = (videoPost: any) => {
    // Refresh the feed
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    queryClient.refetchQueries({ queryKey: ['posts'] });
    
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip title="Share a video" placement="left">
        <Fab
          color="primary"
          onClick={() => setOpen(true)}
          sx={{
            position,
            bottom,
            right,
            background: 'linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #FF5252 30%, #26A69A 90%)',
            },
            zIndex: 1000,
            ...(isMobile && {
              width: 48,
              height: 48,
            }),
          }}
        >
          <VideoIcon size={isMobile ? 20 : 24} />
        </Fab>
      </Tooltip>

      <Dialog 
        open={open} 
        onClose={handleCancel}
        maxWidth="lg" 
        fullWidth
        fullScreen
      >
        <EnhancedVideoUpload
          onVideoUploaded={handleVideoUploaded}
          onCancel={handleCancel}
        />
      </Dialog>
    </>
  );
};
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Paper,
  IconButton,
} from '@mui/material';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface EnhancedVideoUploadProps {
  onVideoUploaded: (videoData: any) => void;
  onCancel: () => void;
}

export const EnhancedVideoUpload: React.FC<EnhancedVideoUploadProps> = ({
  onVideoUploaded,
  onCancel,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    // Mock upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast.success('Video uploaded successfully!');
          onVideoUploaded({
            id: 'mock-video-id',
            url: URL.createObjectURL(file),
            title: file.name,
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Upload Video
        </Typography>
        <IconButton onClick={onCancel}>
          <X size={20} />
        </IconButton>
      </Box>

      <Paper
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
        }}
      >
        {uploading ? (
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <Typography variant="body1" gutterBottom>
              Uploading video... {progress}%
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        ) : (
          <>
            <Upload size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Upload your video
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Drag and drop or click to select a video file
            </Typography>
            <Button
              variant="contained"
              component="label"
              startIcon={<Upload size={20} />}
            >
              Select Video
              <input
                type="file"
                accept="video/*"
                hidden
                onChange={handleFileSelect}
              />
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};
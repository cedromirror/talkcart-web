import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import {
  VideoIcon,
  Upload,
  Edit3,
  Share2,
  CheckCircle,
  Clock,
  Users,
  Heart,
  MessageCircle,
} from 'lucide-react';

export const VideoPostDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    'Select Video',
    'Add Description',
    'Share Settings',
    'Upload & Post'
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      setIsComplete(true);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setIsComplete(false);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <VideoIcon size={48} color="#1976d2" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Choose Your Video
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select from your device or drag & drop
            </Typography>
            <Box sx={{ mt: 2, p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
              <Typography variant="body2">
                📹 my_awesome_video.mp4 (15.2 MB)
              </Typography>
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ py: 3 }}>
            <Edit3 size={32} color="#1976d2" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Add Description
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2">
                "Check out this amazing video: my_awesome_video 🎥"
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Auto-generated, fully editable)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="#awesome" size="small" color="primary" variant="outlined" />
              <Chip label="#video" size="small" color="primary" variant="outlined" />
              <Chip label="#content" size="small" color="primary" variant="outlined" />
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ py: 3 }}>
            <Users size={32} color="#1976d2" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Share Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Privacy</Typography>
                  <Typography variant="body2" color="text.secondary">Public</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Comments</Typography>
                  <Typography variant="body2" color="text.secondary">Enabled</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Upload size={32} color="#1976d2" style={{ marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Upload & Share
            </Typography>
            <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, p: 1, mb: 2 }}>
              <Box sx={{ width: '75%', bgcolor: 'primary.main', height: 8, borderRadius: 1 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Uploading... 75% complete
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  if (isComplete) {
    return (
      <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle size={64} color="#4caf50" style={{ marginBottom: 16 }} />
          <Typography variant="h5" gutterBottom color="success.main">
            Video Posted Successfully! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Your video is now live and ready to be discovered
          </Typography>
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Post Stats (Live Demo)
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Heart size={20} color="#e91e63" />
                <Typography variant="body2">24 likes</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <MessageCircle size={20} color="#2196f3" />
                <Typography variant="body2">8 comments</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Share2 size={20} color="#ff9800" />
                <Typography variant="body2">3 shares</Typography>
              </Box>
            </Box>
          </Box>

          <Button 
            variant="outlined" 
            onClick={handleReset}
            sx={{ mt: 3 }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          📹 Video Post Creation Demo
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>New Simplified Process:</strong> Create video posts in just 4 easy steps!
          </Typography>
        </Alert>

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 200 }}>
          {renderStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep(activeStep - 1)}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            startIcon={activeStep === steps.length - 1 ? <Upload size={16} /> : undefined}
          >
            {activeStep === steps.length - 1 ? 'Upload Video' : 'Next'}
          </Button>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
          <Typography variant="body2" color="success.dark">
            ✅ <strong>Improvements Made:</strong>
          </Typography>
          <Typography variant="body2" color="success.dark" sx={{ mt: 1 }}>
            • Simplified 4-step process • Auto-generated descriptions • Real-time validation • Mobile-friendly design • Quick upload option
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import Layout from '@/components/layout/Layout';
import { VideoSoundTest } from '@/components/video/VideoSoundTest';

const VideoTestPage: React.FC = () => {
  // Using a sample video URL for testing
  const testVideoUrl = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Video Sound Test
        </Typography>
        
        <Typography variant="body1" gutterBottom>
          This page tests video sound functionality. Click the play button to start the video with sound.
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <VideoSoundTest videoUrl={testVideoUrl} />
        </Box>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Instructions:
          </Typography>
          <Typography variant="body1" component="div">
            <ol>
              <li>Click the Play button to start the video</li>
              <li>The video should play with sound by default</li>
              <li>Use the Mute/Unmute button to toggle sound</li>
              <li>If sound is not working, check your browser settings and volume</li>
            </ol>
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};

export default VideoTestPage;
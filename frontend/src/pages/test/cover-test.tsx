import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import Layout from '@/components/layout/Layout';
import CoverPictureManager from '@/components/profile/CoverPictureManager';
import { useAuth } from '@/contexts/AuthContext';

const CoverTestPage: React.FC = () => {
    const { user } = useAuth();

    const handleCoverUpdate = (coverUrl: string) => {
        console.log('Cover updated:', coverUrl);
    };

    if (!user) {
        return (
            <Layout>
                <Container maxWidth="md" sx={{ py: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Please sign in to test cover pictures
                    </Typography>
                </Container>
            </Layout>
        );
    }

    return (
        <Layout>
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Cover Picture Test
                </Typography>

                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Cover Picture Manager
                    </Typography>
                    <Box sx={{ border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                        <CoverPictureManager
                            user={user}
                            onCoverUpdate={handleCoverUpdate}
                            isOwnProfile={true}
                            height={200}
                        />
                    </Box>
                </Paper>

                <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Current User Data
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(user, null, 2)}
                    </Typography>
                </Paper>
            </Container>
        </Layout>
    );
};

export default CoverTestPage;
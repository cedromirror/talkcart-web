import React from 'react';
import { Container, Box } from '@mui/material';
import CallNotificationTest from '@/components/calls/CallNotificationTest';

const CallNotificationsTestPage: React.FC = () => {
    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <CallNotificationTest />
            </Box>
        </Container>
    );
};

export default CallNotificationsTestPage;
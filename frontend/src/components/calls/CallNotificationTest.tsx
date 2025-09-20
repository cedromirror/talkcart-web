import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Stack,
    Alert,
    Chip,
    Divider,
    useTheme
} from '@mui/material';
import {
    Phone,
    Video,
    Bell,
    Volume2,
    Vibrate,
    TestTube
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import { Call } from '@/services/callService';

const CallNotificationTest: React.FC = () => {
    const theme = useTheme();
    const [isTestingRingtone, setIsTestingRingtone] = useState(false);
    const [isTestingVibration, setIsTestingVibration] = useState(false);
    const [isTestingNotification, setIsTestingNotification] = useState(false);
    const [isTestingFullAlert, setIsTestingFullAlert] = useState(false);
    const [permissions, setPermissions] = useState({
        notification: 'default' as NotificationPermission,
        audio: false
    });
    const [support, setSupport] = useState({
        notifications: false,
        vibration: false,
        audio: false
    });

    React.useEffect(() => {
        // Check support and permissions on mount
        const supportStatus = notificationService.isSupported();
        const permissionStatus = notificationService.getPermissionStatus();

        setSupport(supportStatus);
        setPermissions(permissionStatus);
    }, []);

    const createMockCall = (type: 'audio' | 'video'): Call => ({
        callId: `test-call-${Date.now()}`,
        conversationId: 'test-conversation',
        type,
        status: 'incoming',
        initiator: {
            id: 'test-user',
            displayName: 'John Doe',
            avatar: '/default-avatar.png'
        },
        participants: [],
        startedAt: new Date(),
        metadata: {}
    });

    const handleTestRingtone = async () => {
        setIsTestingRingtone(true);
        try {
            await notificationService.startRingtone({
                loop: false,
                duration: 3000 // 3 seconds
            });
        } catch (error) {
            console.error('Failed to test ringtone:', error);
        } finally {
            setTimeout(() => setIsTestingRingtone(false), 3000);
        }
    };

    const handleTestVibration = () => {
        setIsTestingVibration(true);
        notificationService.startVibration([200, 100, 200, 100, 200]);
        setTimeout(() => setIsTestingVibration(false), 1000);
    };

    const handleTestNotification = async () => {
        setIsTestingNotification(true);
        try {
            const mockCall = createMockCall('audio');
            await notificationService.showIncomingCallNotification(mockCall);
        } catch (error) {
            console.error('Failed to test notification:', error);
        } finally {
            setIsTestingNotification(false);
        }
    };

    const handleTestFullAlert = async () => {
        setIsTestingFullAlert(true);
        try {
            const mockCall = createMockCall('video');
            await notificationService.startIncomingCallAlert(mockCall);

            // Stop after 5 seconds
            setTimeout(() => {
                notificationService.stopIncomingCallAlert();
                setIsTestingFullAlert(false);
            }, 5000);
        } catch (error) {
            console.error('Failed to test full alert:', error);
            setIsTestingFullAlert(false);
        }
    };

    const handleRequestPermissions = async () => {
        try {
            const results = await notificationService.requestPermissions();
            setPermissions(results);
        } catch (error) {
            console.error('Failed to request permissions:', error);
        }
    };

    const getStatusColor = (granted: boolean, supported: boolean) => {
        if (!supported) return 'error';
        if (granted) return 'success';
        return 'warning';
    };

    const getStatusText = (granted: boolean, supported: boolean) => {
        if (!supported) return 'Not Supported';
        if (granted) return 'Granted';
        return 'Not Granted';
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TestTube size={32} color={theme.palette.primary.main} />
                Call Notification Test
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Test the call notification system including ringtones, vibrations, and browser notifications.
            </Typography>

            {/* Permission Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Permission Status
                    </Typography>

                    <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Bell size={20} />
                                <Typography>Notifications</Typography>
                            </Box>
                            <Chip
                                label={getStatusText(permissions.notification === 'granted', support.notifications)}
                                color={getStatusColor(permissions.notification === 'granted', support.notifications)}
                                size="small"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Volume2 size={20} />
                                <Typography>Audio</Typography>
                            </Box>
                            <Chip
                                label={getStatusText(permissions.audio, support.audio)}
                                color={getStatusColor(permissions.audio, support.audio)}
                                size="small"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Vibrate size={20} />
                                <Typography>Vibration</Typography>
                            </Box>
                            <Chip
                                label={support.vibration ? 'Available' : 'Not Available'}
                                color={support.vibration ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>
                    </Stack>

                    {(permissions.notification !== 'granted' || !permissions.audio) && (
                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleRequestPermissions}
                                sx={{ mr: 2 }}
                            >
                                Request Permissions
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Test Controls */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Test Individual Components
                    </Typography>

                    <Stack spacing={2}>
                        <Button
                            variant="outlined"
                            startIcon={<Volume2 size={20} />}
                            onClick={handleTestRingtone}
                            disabled={isTestingRingtone || !support.audio}
                            fullWidth
                        >
                            {isTestingRingtone ? 'Playing Ringtone...' : 'Test Ringtone (3s)'}
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<Vibrate size={20} />}
                            onClick={handleTestVibration}
                            disabled={isTestingVibration || !support.vibration}
                            fullWidth
                        >
                            {isTestingVibration ? 'Vibrating...' : 'Test Vibration'}
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<Bell size={20} />}
                            onClick={handleTestNotification}
                            disabled={isTestingNotification || permissions.notification !== 'granted'}
                            fullWidth
                        >
                            {isTestingNotification ? 'Showing Notification...' : 'Test Notification'}
                        </Button>

                        <Divider sx={{ my: 2 }} />

                        <Button
                            variant="contained"
                            startIcon={<Phone size={20} />}
                            onClick={handleTestFullAlert}
                            disabled={isTestingFullAlert}
                            size="large"
                            sx={{
                                backgroundColor: theme.palette.success.main,
                                '&:hover': {
                                    backgroundColor: theme.palette.success.dark
                                }
                            }}
                        >
                            {isTestingFullAlert ? 'Testing Full Alert... (5s)' : 'Test Full Incoming Call Alert'}
                        </Button>
                    </Stack>

                    {isTestingFullAlert && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Testing full incoming call alert with notification, ringtone, and vibration.
                            This will stop automatically after 5 seconds.
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Instructions
                    </Typography>

                    <Typography variant="body2" color="text.secondary" component="div">
                        <ol>
                            <li>First, grant the necessary permissions using the "Request Permissions" button</li>
                            <li>Test individual components to ensure they work correctly</li>
                            <li>Use "Test Full Incoming Call Alert" to simulate a real incoming call</li>
                            <li>The full test will show a notification, play a ringtone, and vibrate (if supported)</li>
                            <li>On mobile devices, you should feel vibration and hear the ringtone</li>
                            <li>The browser notification should appear even if the tab is not active</li>
                        </ol>
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};

export default CallNotificationTest;
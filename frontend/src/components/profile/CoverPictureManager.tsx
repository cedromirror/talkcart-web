import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    useTheme,
    IconButton,
    Tooltip,
} from '@mui/material';
import { Camera, Trash2, Upload, Edit } from 'lucide-react';
import { User } from '@/types';
import ProfilePictureUpload from './ProfilePictureUpload';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface CoverPictureManagerProps {
    user: User;
    onCoverUpdate: (coverUrl: string) => void;
    isOwnProfile?: boolean;
    height?: number;
}

const CoverPictureManager: React.FC<CoverPictureManagerProps> = ({
    user,
    onCoverUpdate,
    isOwnProfile = false,
    height = 200,
}) => {
    const theme = useTheme();
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleUploadSuccess = useCallback((coverUrl: string) => {
        onCoverUpdate(coverUrl);
        setUploadDialogOpen(false);
        toast.success('Cover picture updated successfully!');
    }, [onCoverUpdate]);

    const handleRemoveCover = async () => {
        try {
            setIsRemoving(true);

            // Update profile with empty cover
            const response = await api.auth.updateProfile({ cover: '' });

            if (response.success) {
                onCoverUpdate('');
                setRemoveDialogOpen(false);
                toast.success('Cover picture removed successfully!');
            } else {
                throw new Error(response.message || 'Failed to remove cover picture');
            }
        } catch (error: any) {
            console.error('Failed to remove cover:', error);
            toast.error(error.message || 'Failed to remove cover picture');
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <Box sx={{ position: 'relative' }}>
            {/* Cover Photo */}
            <Box
                sx={{
                    height,
                    background: user.cover
                        ? `url(${user.cover})`
                        : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    borderRadius: '8px 8px 0 0',
                }}
            >
                {/* Cover overlay for better text readability */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px 8px 0 0',
                    }}
                />

                {/* Edit Controls - Only show for own profile */}
                {isOwnProfile && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                            display: 'flex',
                            gap: 1,
                        }}
                    >
                        <Tooltip title="Change cover picture">
                            <IconButton
                                onClick={() => setUploadDialogOpen(true)}
                                sx={{
                                    bgcolor: 'rgba(0, 0, 0, 0.6)',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: 'rgba(0, 0, 0, 0.8)',
                                    },
                                }}
                            >
                                <Camera size={20} />
                            </IconButton>
                        </Tooltip>

                        {user.cover && (
                            <Tooltip title="Remove cover picture">
                                <IconButton
                                    onClick={() => setRemoveDialogOpen(true)}
                                    sx={{
                                        bgcolor: 'rgba(220, 53, 69, 0.8)',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'rgba(220, 53, 69, 1)',
                                        },
                                    }}
                                >
                                    <Trash2 size={20} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
            </Box>

            {/* Upload Dialog */}
            <Dialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Upload size={20} />
                        Update Cover Picture
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        For best results, use an image that's at least 1200x400 pixels.
                        The image will be cropped to fit the cover area.
                    </Alert>
                    <ProfilePictureUpload
                        user={user}
                        onUploadSuccess={handleUploadSuccess}
                        size={400}
                        showUploadButton={false}
                        allowRemove={false}
                        aspectRatio={3} // 3:1 ratio for cover photos
                        uploadType="cover"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Remove Confirmation Dialog */}
            <Dialog
                open={removeDialogOpen}
                onClose={() => setRemoveDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Remove Cover Picture</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to remove your cover picture? This action cannot be undone.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Your profile will display the default gradient background instead.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRemoveDialogOpen(false)}
                        disabled={isRemoving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRemoveCover}
                        color="error"
                        variant="contained"
                        disabled={isRemoving}
                        startIcon={isRemoving ? <CircularProgress size={16} /> : <Trash2 size={16} />}
                    >
                        {isRemoving ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CoverPictureManager;
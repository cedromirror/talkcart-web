import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Gift,
  Heart,
  Star,
  Crown,
  Zap,
  Sparkles,
  Send,
  X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface GiftPanelProps {
  streamId: string;
  streamerId: string;
  isOpen: boolean;
  onClose: () => void;
  onGiftSent?: (gift: any) => void;
}

interface GiftType {
  id: string;
  name: string;
  price: number;
  emoji: string;
  color: string;
}

const GiftPanel: React.FC<GiftPanelProps> = ({
  streamId,
  streamerId,
  isOpen,
  onClose,
  onGiftSent,
}) => {
  const queryClient = useQueryClient();
  const [selectedGift, setSelectedGift] = useState<GiftType | null>(null);
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch gift types
  const { data: giftTypesData, isLoading } = useQuery({
    queryKey: ['gift-types'],
    queryFn: () => api.streams.getGiftTypes(),
  });

  const giftTypes = giftTypesData?.data?.giftTypes || [];

  // Send gift mutation
  const sendGiftMutation = useMutation({
    mutationFn: ({ giftType, message, isAnonymous }: { giftType: string; message: string; isAnonymous: boolean }) =>
      api.streams.sendGift(streamId, giftType, { message, isAnonymous }),
    onSuccess: (data) => {
      toast.success('Gift sent successfully! 🎁');
      setMessage('');
      setSelectedGift(null);
      setShowConfirmation(false);
      onClose();
      if (onGiftSent) {
        onGiftSent(data.data?.gift);
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['stream-gifts', streamId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send gift');
    },
  });

  const handleGiftSelect = (gift: GiftType) => {
    setSelectedGift(gift);
    setShowConfirmation(true);
  };

  const handleSendGift = () => {
    if (!selectedGift) return;
    
    sendGiftMutation.mutate({
      giftType: selectedGift.id,
      message,
      isAnonymous,
    });
  };

  const handleClose = () => {
    setSelectedGift(null);
    setMessage('');
    setIsAnonymous(false);
    setShowConfirmation(false);
    onClose();
  };

  return (
    <>
      {/* Main Gift Panel Dialog */}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gift size={24} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            Send a Gift
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                Show your appreciation with a virtual gift!
              </Typography>

              <Grid container spacing={2}>
                {giftTypes.map((gift: GiftType) => (
                  <Grid item xs={6} sm={4} md={3} key={gift.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          background: 'rgba(255, 255, 255, 0.2)',
                        },
                      }}
                      onClick={() => handleGiftSelect(gift)}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h3" sx={{ mb: 1 }}>
                          {gift.emoji}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {gift.name}
                        </Typography>
                        <Chip
                          label={`$${gift.price}`}
                          size="small"
                          sx={{
                            mt: 1,
                            backgroundColor: gift.color,
                            color: 'white',
                            fontWeight: 'bold',
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Gift Confirmation Dialog */}
      <Dialog
        open={showConfirmation}
        onX={() => setShowConfirmation(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">{selectedGift?.emoji}</Typography>
            <Box>
              <Typography variant="h6">Send {selectedGift?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                ${selectedGift?.price}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice..."
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
              }
              label="Send anonymously"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Your gift will be displayed in the stream chat and help support the creator!
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowConfirmation(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendGift}
            disabled={sendGiftMutation.isPending}
            startIcon={sendGiftMutation.isPending ? <CircularProgress size={16} /> : <Send size={16} />}
            sx={{
              background: selectedGift?.color,
              '&:hover': {
                background: selectedGift?.color,
                opacity: 0.8,
              },
            }}
          >
            {sendGiftMutation.isPending ? 'Sending...' : `Send Gift ($${selectedGift?.price})`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GiftPanel;

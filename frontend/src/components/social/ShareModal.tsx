import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Checkbox,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon,
  Share as ShareIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useShareInteractions } from '@/hooks/useShareInteractions';
import toast from 'react-hot-toast';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  post: {
    _id: string;
    id?: string;
    title?: string;
    content: string;
    author: {
      username: string;
      displayName?: string;
      avatar?: string;
    };
  };
  initialShareCount: number;
}

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  isFollowing?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  post,
  initialShareCount,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'external' | 'followers' | 'users'>('external');
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const {
    shareCount,
    isSharePending,
    handleShare,
    handleShareWithFollowers,
    handleShareWithUsers,
  } = useShareInteractions({
    initialShareCount,
    postId: post._id || post.id || '',
    onShareUpdate: (count) => {
      console.log('Share count updated:', count);
    },
  });

  const postUrl = `${window.location.origin}/post/${post._id || post.id}`;
  const shareText = `Check out this post by @${post.author.username}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success('Link copied to clipboard!', { icon: '📋' });
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleExternalShare = async (platform: string) => {
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      default:
        return;
    }

    // Open share URL in new window
    window.open(shareUrl, '_blank', 'width=600,height=400');
    
    // Track the share
    await handleShare(new MouseEvent('click') as any, platform);
  };

  const handleFollowersShare = async () => {
    await handleShareWithFollowers(message);
    setMessage('');
    onClose();
  };

  const handleUsersShare = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    await handleShareWithUsers(selectedUsers, message);
    setSelectedUsers([]);
    setMessage('');
    onClose();
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const externalPlatforms = [
    { name: 'Facebook', icon: FacebookIcon, color: '#1877F2', key: 'facebook' },
    { name: 'Twitter', icon: TwitterIcon, color: '#1DA1F2', key: 'twitter' },
    { name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2', key: 'linkedin' },
    { name: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366', key: 'whatsapp' },
    { name: 'Telegram', icon: TelegramIcon, color: '#0088CC', key: 'telegram' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" component="div">
          Share Post
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 0, pb: 1 }}>
        {/* Tab Navigation */}
        <Box sx={{ px: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={activeTab === 'external' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<ShareIcon />}
              onClick={() => setActiveTab('external')}
            >
              External
            </Button>
            <Button
              variant={activeTab === 'followers' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<PeopleIcon />}
              onClick={() => setActiveTab('followers')}
            >
              Followers
            </Button>
            <Button
              variant={activeTab === 'users' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={() => setActiveTab('users')}
            >
              Specific Users
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* External Sharing */}
        {activeTab === 'external' && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Share to social platforms
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2, mb: 3 }}>
              {externalPlatforms.map((platform) => {
                const IconComponent = platform.icon;
                return (
                  <Button
                    key={platform.key}
                    variant="outlined"
                    startIcon={<IconComponent />}
                    onClick={() => handleExternalShare(platform.key)}
                    disabled={isSharePending}
                    sx={{
                      borderColor: platform.color,
                      color: platform.color,
                      '&:hover': {
                        borderColor: platform.color,
                        backgroundColor: alpha(platform.color, 0.1),
                      },
                    }}
                  >
                    {platform.name}
                  </Button>
                );
              })}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Copy link
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                value={postUrl}
                InputProps={{
                  readOnly: true,
                  sx: { fontSize: '0.875rem' },
                }}
              />
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={handleCopyLink}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Copy
              </Button>
            </Box>
          </Box>
        )}

        {/* Share with Followers */}
        {activeTab === 'followers' && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Share with your followers
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This post will appear in your followers' feeds with your message.
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
        )}

        {/* Share with Specific Users */}
        {activeTab === 'users' && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Share with specific users
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
            />

            {selectedUsers.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Selected users:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {selectedUsers.map((userId) => (
                    <Chip
                      key={userId}
                      label={`User ${userId.substring(0, 8)}...`}
                      size="small"
                      onDelete={() => handleUserToggle(userId)}
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Mock user list - in real app, this would be populated from API */}
            <Typography variant="caption" color="text.secondary">
              Select users to share with (demo list):
            </Typography>
            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
              {['user1', 'user2', 'user3'].map((userId) => (
                <ListItem
                  key={userId}
                  dense
                  button
                  onClick={() => handleUserToggle(userId)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {userId.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`Demo ${userId}`}
                    secondary={`@${userId}`}
                  />
                  <Checkbox
                    checked={selectedUsers.includes(userId)}
                    onChange={() => handleUserToggle(userId)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        {activeTab === 'followers' && (
          <Button
            variant="contained"
            onClick={handleFollowersShare}
            disabled={isSharePending}
            startIcon={isSharePending ? <CircularProgress size={16} /> : <PeopleIcon />}
          >
            {isSharePending ? 'Sharing...' : 'Share with Followers'}
          </Button>
        )}
        
        {activeTab === 'users' && (
          <Button
            variant="contained"
            onClick={handleUsersShare}
            disabled={isSharePending || selectedUsers.length === 0}
            startIcon={isSharePending ? <CircularProgress size={16} /> : <PersonAddIcon />}
          >
            {isSharePending ? 'Sharing...' : `Share with ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ShareModal;
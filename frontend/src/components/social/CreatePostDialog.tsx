import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  SelectChangeEvent,
} from '@mui/material';
import { X, ImageIcon, Video, Upload, Globe2, UserCheck, Lock, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export const CreatePostDialog: React.FC<CreatePostDialogProps> = ({
  open,
  onClose,
  onPostCreated,
}) => {
  const theme = useTheme();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [privacy, setPrivacy] = useState<'public' | 'followers' | 'private'>('public');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detectedHashtags, setDetectedHashtags] = useState<string[]>([]);
  const [detectedMentions, setDetectedMentions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setSubmitting(true);
    try {
      // Collect full Cloudinary media object(s)
      let mediaArray: any[] = [];
      
      // Upload media if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResponse = await api.media.upload(selectedFile, 'post');
        if (!uploadResponse?.success || !uploadResponse?.data) {
          throw new Error('Failed to upload media');
        }
        const uploaded = uploadResponse.data;
        mediaArray = [
          {
            public_id: uploaded.public_id,
            secure_url: uploaded.secure_url || uploaded.url,
            url: uploaded.url,
            resource_type: uploaded.resource_type,
            format: uploaded.format,
            width: uploaded.width,
            height: uploaded.height,
            bytes: uploaded.bytes,
            duration: uploaded.duration,
          },
        ];
        setUploading(false);
      }
      
      // Create post data matching backend validation
      const postData = {
        content: content.trim(),
        type: postType,
        ...(mediaArray.length > 0 ? { media: mediaArray } : {}),
        privacy: privacy
      };
      
      // Create the post
      const response = await api.posts.create(postData);
      
      if (response.success) {
        toast.success('Post created successfully!');
        setContent('');
        setSelectedFile(null);
        setPostType('text');
        setPrivacy('public');
        setDetectedHashtags([]);
        setDetectedMentions([]);
        onPostCreated?.();
        onClose();
      } else {
        throw new Error(response.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (type: 'image' | 'video') => {
    setPostType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect post type based on file
      if (file.type.startsWith('image/')) {
        setPostType('image');
      } else if (file.type.startsWith('video/')) {
        setPostType('video');
      }
    }
  };

  const handleClose = () => {
    setContent('');
    setSelectedFile(null);
    setPostType('text');
    setPrivacy('public');
    setDetectedHashtags([]);
    setDetectedMentions([]);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Create Post</Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Post Type Selector - icon-only horizontal toggle */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup
            value={postType}
            exclusive
            onChange={(e, value) => value && setPostType(value)}
            aria-label="post type"
            size="small"
          >
            <ToggleButton value="text" aria-label="text post">
              <Type size={18} />
            </ToggleButton>
            <ToggleButton value="image" aria-label="image post">
              <ImageIcon size={18} />
            </ToggleButton>
            <ToggleButton value="video" aria-label="video post">
              <Video size={18} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => {
            if (e.target.value.length <= 500) {
              const newContent = e.target.value;
              setContent(newContent);
              
              // Detect hashtags
              const hashtagMatches = newContent.match(/#(\w+)/g) || [];
              setDetectedHashtags(hashtagMatches);
              
              // Detect mentions
              const mentionMatches = newContent.match(/@(\w+)/g) || [];
              setDetectedMentions(mentionMatches);
            }
          }}
          variant="outlined"
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 500 }}
        />

        {/* Detected hashtags and mentions */}
        {(detectedHashtags.length > 0 || detectedMentions.length > 0) && (
          <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 1 }}>
            <Typography variant="caption" fontWeight={500} color="text.secondary" gutterBottom>
              Detected in your post:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {detectedHashtags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                  color="primary"
                />
              ))}
              {detectedMentions.map((mention) => (
                <Chip
                  key={mention}
                  label={mention}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                  color="secondary"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* File Upload Section */}
        {(postType === 'image' || postType === 'video') && (
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept={postType === 'image' ? 'image/*' : 'video/*'}
            />
            
            {selectedFile ? (
              <Box sx={{ 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Typography variant="body2">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedFile(null)}
                  color="error"
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                startIcon={postType === 'image' ? <ImageIcon size={16} /> : <Video size={16} />}
                onClick={() => handleFileSelect(postType)}
                sx={{ py: 2 }}
              >
                Select {postType === 'image' ? 'Image' : 'Video'}
              </Button>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<ImageIcon size={16} />}
              size="small"
              variant="outlined"
              onClick={() => handleFileSelect('image')}
            >
              Add Image
            </Button>
            <Button
              startIcon={<Video size={16} />}
              size="small"
              variant="outlined"
              onClick={() => handleFileSelect('video')}
            >
              Add Video
            </Button>
          </Box>
          <Typography variant="caption" color={content.length > 450 ? 'error' : 'text.secondary'}>
            {content.length}/500
          </Typography>
        </Box>
        
        {/* Suggested hashtags */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Hashtags:
          </Typography>
          {['#Web3', '#NFT', '#Crypto', '#DeFi', '#Blockchain'].map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              onClick={() => setContent(prev => `${prev} ${tag} `)}
              sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Suggested mentions */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            Mention:
          </Typography>
          {['@john', '@sarah', '@crypto_expert', '@web3dev', '@nftcollector'].map((mention) => (
            <Chip
              key={mention}
              label={mention}
              size="small"
              onClick={() => setContent(prev => `${prev} ${mention} `)}
              sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
              color="secondary"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Privacy Selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Privacy</InputLabel>
          <Select
            value={privacy}
            label="Privacy"
            onChange={(e: SelectChangeEvent) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
          >
            <MenuItem value="public">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Globe2 size={16} style={{ marginRight: 8 }} />
                <Typography>Public</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="followers">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UserCheck size={16} style={{ marginRight: 8 }} />
                <Typography>Followers Only</Typography>
              </Box>
            </MenuItem>
            <MenuItem value="private">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ marginRight: 8 }} />
                <Typography>Private</Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={submitting || uploading}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={!content.trim() || submitting || uploading}
          startIcon={
            (submitting || uploading) ? (
              <CircularProgress size={16} />
            ) : null
          }
        >
          {uploading ? 'Uploading...' : submitting ? 'Posting...' : 'Post'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
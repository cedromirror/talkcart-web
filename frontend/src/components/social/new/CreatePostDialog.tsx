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
  Divider,
} from '@mui/material';
import { X, ImageIcon, Video, Type, Hash, AtSign, Music, Play, Globe2, UserCheck, Lock } from 'lucide-react';
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
    if (!content.trim()) {
      toast.error('Please enter some content for your post');
      return;
    }
    
    setSubmitting(true);
    try {
      // Collect media if selected
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
      
      // Create post data
      const postData = {
        content: content.trim(),
        type: postType,
        ...(mediaArray.length > 0 ? { media: mediaArray } : {}),
        privacy: privacy
      };
      
      // Create the post
      const response = await api.posts.create(postData) as any;
      
      if (response?.success) {
        toast.success('Post created successfully!');
        resetForm();
        onPostCreated?.();
        onClose();
      } else {
        throw new Error(response?.message || 'Failed to create post');
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
      // Reset the file input to allow selecting the same file again
      fileInputRef.current.value = '';
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (50MB limit for videos, 10MB for images)
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        toast.error(`${file.type.startsWith('video/') ? 'Video' : 'Image'} size should be less than ${maxSizeMB}MB`);
        return;
      }
      
      setSelectedFile(file);
      // Auto-detect post type based on file
      if (file.type.startsWith('image/')) {
        setPostType('image');
      } else if (file.type.startsWith('video/')) {
        setPostType('video');
      }
    }
  };

  const resetForm = () => {
    setContent('');
    setSelectedFile(null);
    setPostType('text');
    setPrivacy('public');
    setDetectedHashtags([]);
    setDetectedMentions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Update hashtags and mentions when content changes
  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Detect hashtags
    const hashtagMatches = value.match(/#(\w+)/g) || [];
    setDetectedHashtags(hashtagMatches);
    
    // Detect mentions
    const mentionMatches = value.match(/@(\w+)/g) || [];
    setDetectedMentions(mentionMatches);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableEnforceFocus  // Prevents focus trapping issues
      hideBackdrop={false}  // Ensure backdrop is properly handled
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>Create Post</Typography>
          <IconButton onClick={handleClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ minHeight: 400, py: 2 }}>
        {/* Preview area for media */}
        <Box sx={{ 
          mb: 2, 
          height: 200, 
          bgcolor: alpha(theme.palette.divider, 0.1), 
          borderRadius: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {selectedFile ? (
            postType === 'image' ? (
              <Box
                component="img"
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : postType === 'video' ? (
              <Box sx={{ 
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <video
                  src={URL.createObjectURL(selectedFile)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  muted
                  loop
                />
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    bgcolor: 'rgba(255,255,255,0.7)',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Play size={16} color="black" />
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Unsupported file type
              </Typography>
            )
          ) : (
            <Typography variant="body2" color="text.secondary">
              {postType === 'text' 
                ? 'Text posts will appear in your feed' 
                : `Select a ${postType} to preview`}
            </Typography>
          )}
        </Box>
        
        {/* Post Type Selector */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={postType}
            exclusive
            onChange={(e, value) => {
              if (value) {
                setPostType(value);
                // Only auto-open file selector if user didn't click directly on a button
                // This prevents double-triggering when buttons have their own onClick handlers
              }
            }}
            aria-label="post type"
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderColor: theme.palette.primary.main,
                }
              }
            }}
          >
            <ToggleButton value="text" aria-label="text post">
              <Type size={16} />
              <Typography variant="caption" sx={{ ml: 0.5 }}>Text</Typography>
            </ToggleButton>
            <ToggleButton 
              value="image" 
              aria-label="image post"
              onClick={() => handleFileSelect('image')}
            >
              <ImageIcon size={16} />
              <Typography variant="caption" sx={{ ml: 0.5 }}>Photo</Typography>
            </ToggleButton>
            <ToggleButton 
              value="video" 
              aria-label="video post"
              onClick={() => handleFileSelect('video')}
            >
              <Video size={16} />
              <Typography variant="caption" sx={{ ml: 0.5 }}>Video</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Content input */}
        <TextField
          autoFocus
          multiline
          rows={3}
          fullWidth
          placeholder="What's happening?"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          variant="outlined"
          sx={{ mb: 1 }}
          inputProps={{ maxLength: 500 }}
        />

        {/* Character counter */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Typography variant="caption" color={content.length > 450 ? 'error' : 'text.secondary'}>
            {content.length}/500
          </Typography>
        </Box>

        {/* Detected hashtags and mentions */}
        {(detectedHashtags.length > 0 || detectedMentions.length > 0) && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={500} color="primary.main" gutterBottom>
              Detected in your post:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {detectedHashtags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: 'primary.main',
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}
                />
              ))}
              {detectedMentions.map((mention) => (
                <Chip
                  key={mention}
                  label={mention}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                    color: 'secondary.main',
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}
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
                p: 1.5, 
                border: `1px solid ${theme.palette.divider}`, 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: alpha(theme.palette.background.default, 0.3)
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {postType === 'image' ? <ImageIcon size={16} /> : <Video size={16} />}
                  <Box>
                    <Typography variant="body2" fontWeight={500} noWrap maxWidth={200}>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={() => setSelectedFile(null)}
                  color="error"
                  variant="text"
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
                sx={{ py: 1.5, borderRadius: 2, borderStyle: 'dashed' }}
              >
                Select {postType === 'image' ? 'Image' : 'Video'}
              </Button>
            )}
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Privacy Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Lock size={16} />
          <Typography variant="subtitle2" fontWeight={500}>
            Privacy
          </Typography>
        </Box>
        <FormControl fullWidth size="small">
          <Select
            value={privacy}
            onChange={(e: SelectChangeEvent) => setPrivacy(e.target.value as 'public' | 'followers' | 'private')}
            sx={{ borderRadius: 2 }}
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
      
      <DialogActions sx={{ px: 2, pb: 2, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={submitting || uploading}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={!content.trim() || submitting || uploading}
          startIcon={
            (submitting || uploading) ? (
              <CircularProgress size={16} color="inherit" />
            ) : null
          }
          sx={{ 
            borderRadius: 2, 
            px: 3,
            fontWeight: 600
          }}
        >
          {uploading ? 'Uploading...' : submitting ? 'Posting...' : 'Post'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
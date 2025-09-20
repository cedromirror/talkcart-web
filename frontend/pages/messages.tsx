import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Badge,
  InputAdornment,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  Send,
  Image,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  AlertCircle,
  Mic,
  ChevronRight,
  Plus,
  CheckCheck,
  Reply,
  X
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import useMessages from '@/hooks/useMessages';
import useCall from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import CallInterface from '@/components/calls/CallInterface';
import EnhancedMessageBubbleV2 from '@/components/messaging/EnhancedMessageBubbleV2';
import VoiceMessageBubble from '@/components/messaging/VoiceMessageBubble';
import ForwardMessageDialog from '@/components/messaging/ForwardMessageDialog';

const MessagesPage: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    createConversation,
    setActiveConversation,
    markAllAsRead,
    sendTypingIndicator,
    addReaction,
    typingUsers,
    editMessage,
    deleteMessage,
    forwardMessage
  } = useMessages();

  const {
    currentCall,
    incomingCall,
    isCallActive,
    isAudioEnabled,
    isVideoEnabled,
    localStream,
    remoteStreams,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleAudio,
    toggleVideo,
    clearIncomingCall
  } = useCall();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = ['😀', '😂', '😍', '👍', '🎉', '🙏', '🔥', '✨', '❤️'];

  // File inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Thumbnails cache for videos (public_id -> url)
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});

  // New conversation dialog state
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Forward message dialog state
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<string | null>(null);

  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

  // Call handlers
  const handleAudioCall = async () => {
    if (!user || !isAuthenticated) {
      console.error('User not authenticated');
      alert('Please log in to make calls');
      return;
    }

    if (activeConversation) {
      try {
        console.log('User:', user);
        console.log('Active conversation:', activeConversation);
        console.log('Token in localStorage:', localStorage.getItem('token') ? 'exists' : 'missing');
        await initiateCall(activeConversation.id, 'audio');
      } catch (error) {
        console.error('Failed to initiate audio call:', error);
        alert(`Failed to initiate call: ${error.message}`);
      }
    }
  };

  const handleVideoCall = async () => {
    if (!user || !isAuthenticated) {
      console.error('User not authenticated');
      alert('Please log in to make calls');
      return;
    }

    if (activeConversation) {
      try {
        console.log('User:', user);
        console.log('Active conversation:', activeConversation);
        console.log('Token in localStorage:', localStorage.getItem('token') ? 'exists' : 'missing');
        await initiateCall(activeConversation.id, 'video');
      } catch (error) {
        console.error('Failed to initiate video call:', error);
        alert(`Failed to initiate call: ${error.message}`);
      }
    }
  };

  const handleAcceptCall = async () => {
    if (incomingCall) {
      try {
        await acceptCall(incomingCall.callId);
      } catch (error) {
        console.error('Failed to accept call:', error);
      }
    }
  };

  const handleDeclineCall = async () => {
    if (incomingCall) {
      try {
        await declineCall(incomingCall.callId);
      } catch (error) {
        console.error('Failed to decline call:', error);
      }
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const participantNames = conversation.participants.map(p =>
      p.displayName.toLowerCase() + ' ' + p.username.toLowerCase()
    ).join(' ');

    const groupName = conversation.isGroup && conversation.groupName
      ? conversation.groupName.toLowerCase()
      : '';

    const searchText = searchQuery.toLowerCase();

    return participantNames.includes(searchText) || groupName.includes(searchText);
  });

  // Handle conversation selection
  const handleSelectConversation = (conversation: any) => {
    setActiveConversation(conversation);
    // fetchMessages will be called automatically when activeConversation changes
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!activeConversation) return;

    // Send typing indicator if not already typing
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 2000);
  };

  // Handle message send
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !activeConversation) return;

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      sendTypingIndicator(false);
    }

    // Send message with reply if applicable
    sendMessage(messageText, 'text', undefined, replyToMessage?.id);
    setMessageText('');
    setShowEmojiPicker(false);
    setReplyToMessage(null); // Clear reply after sending
  };

  // Handle reply to message
  const handleReplyToMessage = (message: any) => {
    setReplyToMessage(message);
    // Focus on message input (you can add a ref to the input if needed)
  };

  // Handle forward message
  const handleForwardMessage = (messageId: string) => {
    setMessageToForward(messageId);
    setForwardDialogOpen(true);
  };

  // Handle forward dialog submit
  const handleForwardSubmit = async (conversationIds: string[], message?: string) => {
    if (!messageToForward) return false;

    try {
      const success = await forwardMessage(messageToForward, conversationIds, message);
      if (success) {
        setForwardDialogOpen(false);
        setMessageToForward(null);
      }
      return success;
    } catch (error) {
      console.error('Forward error:', error);
      return false;
    }
  };

  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // Emoji helpers
  const handleAddEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  // Media upload helper
  // Simple frontend validation rules
  const MAX_IMAGE_MB = 20;
  const MAX_VIDEO_MB = 200;
  const MAX_AUDIO_MB = 50;
  const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/webm', 'video/avi', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg'];
  const AUDIO_TYPES = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm'];

  const validateFile = (file: File, kind: 'image' | 'video' | 'audio') => {
    const sizeMB = file.size / (1024 * 1024);
    const mime = file.type;
    if (kind === 'image') {
      if (!IMAGE_TYPES.includes(mime)) throw new Error('Unsupported image type. Use JPG, PNG, GIF, or WebP.');
      if (sizeMB > MAX_IMAGE_MB) throw new Error(`Image exceeds ${MAX_IMAGE_MB}MB.`);
    }
    if (kind === 'video') {
      if (!VIDEO_TYPES.includes(mime)) throw new Error('Unsupported video type. Use MP4, MOV, WEBM, AVI.');
      if (sizeMB > MAX_VIDEO_MB) throw new Error(`Video exceeds ${MAX_VIDEO_MB}MB.`);
    }
    if (kind === 'audio') {
      if (!AUDIO_TYPES.includes(mime)) throw new Error('Unsupported audio type. Use MP3, WAV, AAC, OGG, or WEBM.');
      if (sizeMB > MAX_AUDIO_MB) throw new Error(`Audio exceeds ${MAX_AUDIO_MB}MB.`);
    }
  };

  const uploadAndSendMedia = async (file: File, kind: 'image' | 'video' | 'audio') => {
    try {
      validateFile(file, kind);
      setUploadProgress(0);
      setUploadingMedia(true);
      const response = await api.media.upload(file, 'post', { onProgress: setUploadProgress });
      const fileData = (response as any)?.data ?? response;
      const inner = fileData?.data ?? fileData;
      if (!inner?.secure_url) throw new Error('Upload failed');

      // Build media payload for messages API
      const mediaPayload: any = {
        public_id: inner.public_id,
        secure_url: inner.secure_url,
        url: inner.url || inner.secure_url,
        resource_type: inner.resource_type || kind,
        format: inner.format,
        bytes: inner.bytes,
      };

      // If video, try to prefetch a thumbnail
      if (kind === 'video' && inner.public_id && !videoThumbs[inner.public_id]) {
        try {
          const thumbRes: any = await api.media.getVideoThumbnail(inner.public_id, { width: 480, height: 270 });
          const url = thumbRes?.data?.thumbnail_url;
          if (url) setVideoThumbs(v => ({ ...v, [inner.public_id]: url }));
        } catch { }
      }

      // If audio, request an optimized mp3 URL for better compatibility
      if (kind === 'audio' && inner.public_id) {
        try {
          console.log('Requesting audio optimization for:', inner.public_id);
          const optRes: any = await api.media.getOptimizedAudio(inner.public_id, { format: 'mp3', quality: 'auto' });
          const optUrl = optRes?.data?.optimized_url;
          if (optUrl) {
            console.log('Using optimized audio URL:', optUrl);
            mediaPayload.url = optUrl;
          } else {
            console.log('No optimized URL returned, using original URL');
          }
        } catch (error: any) {
          console.warn('Audio optimization failed, using original URL:', error.message);
          // Continue with original URL if optimization fails
        }
      }

      await sendMessage(kind === 'audio' ? '' : (messageText || ''), kind, mediaPayload);
      if (kind !== 'audio') setMessageText('');
    } catch (err: any) {
      console.error('Media send error:', err);
      alert(err.message || 'Failed to send media');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  // Image/video file select handlers
  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndSendMedia(f, 'image');
    if (e.target) e.target.value = '';
  };
  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndSendMedia(f, 'video');
    if (e.target) e.target.value = '';
  };
  const handleSelectAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAndSendMedia(f, 'audio');
    if (e.target) e.target.value = '';
  };

  // Voice recording using MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadAndSendMedia(file, 'audio');
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic permission / record error:', err);
      alert('Microphone access denied or not available');
    }
  };

  const stopRecording = () => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== 'inactive') {
      r.stop();
      setIsRecording(false);
    }
  };

  // Format time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for conversation
  const formatConversationDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      // Mark all messages as read when opening conversation
      markAllAsRead();
    }
  }, [activeConversation, markAllAsRead]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login?redirect=/messages';
    }
  }, [authLoading, isAuthenticated]);

  // Search users for new conversation
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchedUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await fetch(`http://localhost:8000/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success) {
        // Filter out current user from results
        const filteredUsers = data.data.users.filter((u: any) => u.id !== user?.id);
        setSearchedUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchedUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Handle user search input change
  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    searchUsers(value);
  };

  // Handle creating new conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const participantIds = selectedUsers.map(u => u.id);
      const newConversation = await createConversation(participantIds);

      if (newConversation) {
        setActiveConversation(newConversation);
        setNewConversationOpen(false);
        setSelectedUsers([]);
        setUserSearchQuery('');
        setSearchedUsers([]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation');
    }
  };

  // Get other participant(s) for display
  const getConversationName = (conversation: any) => {
    if (conversation.isGroup && conversation.groupName) {
      return conversation.groupName;
    }

    // For direct messages, show the other person's name
    const otherParticipant = conversation.participants?.find(p => p.id !== user?.id);
    return otherParticipant?.displayName || otherParticipant?.username || 'Unknown User';
  };

  // Get avatar for conversation
  const getConversationAvatar = (conversation: any) => {
    if (conversation.isGroup && conversation.groupAvatar) {
      return conversation.groupAvatar;
    }

    // For direct messages, show the other person's avatar
    const otherParticipant = conversation.participants?.find(p => p.id !== user?.id);
    return otherParticipant?.avatar;
  };

  // Check if user is online
  const isUserOnline = (conversation: any) => {
    if (conversation.isGroup) return false;

    const otherParticipant = conversation.participants?.find(p => p.id !== user?.id);
    return otherParticipant?.isOnline || false;
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Loading...</Typography>
            <Typography variant="body2" color="text.secondary">Checking authentication</Typography>
          </Box>
        </Container>
      </Layout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Authentication Required</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Please log in to access messages and make calls
            </Typography>
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1, mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => window.location.href = '/auth/login?redirect=/messages'}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)' }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            display: 'flex',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Conversations List */}
          <Box
            sx={{
              width: 320,
              borderRight: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Messages
              </Typography>
              <TextField
                fullWidth
                placeholder="Search conversations..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {loading && !activeConversation ? (
                <Box sx={{ p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <AlertCircle size={24} color={theme.palette.error.main} />
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {error}
                  </Typography>
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No conversations found
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredConversations.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      alignItems="flex-start"
                      onClick={() => handleSelectConversation(conversation)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundColor: activeConversation?.id === conversation.id
                          ? alpha(theme.palette.primary.main, 0.08)
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        },
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          color="success"
                          invisible={!isUserOnline(conversation)}
                        >
                          <Avatar
                            src={getConversationAvatar(conversation)}
                            alt={getConversationName(conversation)}
                            sx={{ width: 48, height: 48 }}
                          />
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            component="div"
                            variant="subtitle1"
                            fontWeight={600}
                            noWrap
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span>{getConversationName(conversation)}</span>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {conversation.lastMessage && formatConversationDate(conversation.lastMessage.createdAt)}
                            </Typography>
                          </Typography>
                        }
                        secondary={
                          <Typography
                            component="div"
                            variant="body2"
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{
                                maxWidth: 180,
                                fontWeight: conversation.unreadCount > 0 ? 600 : 400,
                                color: conversation.unreadCount > 0 ? 'text.primary' : 'text.secondary',
                              }}
                            >
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </Typography>
                            {conversation.unreadCount > 0 && (
                              <Chip
                                label={conversation.unreadCount}
                                color="primary"
                                size="small"
                                sx={{
                                  height: 20,
                                  minWidth: 20,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Typography>
                        }
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setNewConversationOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                New Conversation
              </Button>
            </Box>
          </Box>

          {/* Messages Area */}
          {activeConversation ? (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Conversation Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color="success"
                    invisible={!isUserOnline(activeConversation)}
                  >
                    <Avatar
                      src={getConversationAvatar(activeConversation)}
                      alt={getConversationName(activeConversation)}
                      sx={{ width: 40, height: 40 }}
                    />
                  </Badge>
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {getConversationName(activeConversation)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(() => {
                        const typingUsersList = (typingUsers?.[activeConversation.id] || [])
                          .map(userId => {
                            const participant = activeConversation.participants?.find(p => p.id === userId);
                            return participant?.displayName || participant?.username || 'Someone';
                          })
                          .filter(name => name !== 'Someone');

                        if (typingUsersList.length > 0) {
                          return `${typingUsersList.join(', ')} ${typingUsersList.length === 1 ? 'is' : 'are'} typing...`;
                        }

                        return isUserOnline(activeConversation) ? 'Online' : 'Offline';
                      })()}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton
                    onClick={handleAudioCall}
                    disabled={isCallActive}
                    sx={{
                      color: theme.palette.success.main,
                      '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) }
                    }}
                  >
                    <Phone size={20} />
                  </IconButton>
                  <IconButton
                    onClick={handleVideoCall}
                    disabled={isCallActive}
                    sx={{
                      color: theme.palette.primary.main,
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) }
                    }}
                  >
                    <Video size={20} />
                  </IconButton>
                  <IconButton>
                    <Info size={20} />
                  </IconButton>
                  <IconButton>
                    <MoreVertical size={20} />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flexGrow: 1,
                  p: 3,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <AlertCircle size={48} color={theme.palette.error.main} />
                    <Typography color="error" variant="body1" sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary" variant="body1">
                      No messages yet
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                      Send a message to start the conversation
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.id;
                    const sender = activeConversation?.participants.find((p: any) => p.id === message.senderId);

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                          mb: 2,
                        }}
                      >
                        <EnhancedMessageBubbleV2
                          message={{
                            ...message,
                            isOwn: isCurrentUser,
                            sender: sender || {
                              id: message.senderId,
                              displayName: 'Unknown',
                              username: 'unknown',
                              avatar: null,
                              isVerified: false
                            },
                            reactions: message.reactions || []
                          }}
                          showAvatar={!activeConversation?.isGroup || !isCurrentUser}
                          onReply={() => {
                            handleReplyToMessage(message);
                          }}
                          onForward={() => {
                            handleForwardMessage(message.id);
                          }}
                          onEdit={async (messageId: string, newContent: string) => {
                            if (isCurrentUser) {
                              try {
                                await editMessage?.(messageId, newContent);
                                return true;
                              } catch (error) {
                                console.error('Failed to edit message:', error);
                                return false;
                              }
                            }
                            return false;
                          }}
                          onDelete={async (messageId: string) => {
                            if (isCurrentUser) {
                              try {
                                await deleteMessage?.(messageId);
                                return true;
                              } catch (error) {
                                console.error('Failed to delete message:', error);
                                return false;
                              }
                            }
                            return false;
                          }}
                          onReaction={async (messageId: string, emoji: string) => {
                            try {
                              await addReaction(messageId, emoji);
                              return true;
                            } catch (error) {
                              console.error('Failed to add reaction:', error);
                              return false;
                            }
                          }}
                        />
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                {/* Hidden file inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleSelectImage} style={{ display: 'none' }} />
                <input ref={videoInputRef} type="file" accept="video/*" onChange={handleSelectVideo} style={{ display: 'none' }} />
                <input ref={audioFileInputRef} type="file" accept="audio/*" onChange={handleSelectAudioFile} style={{ display: 'none' }} />

                {/* Emoji picker (emoji-mart) with simple fallback */}
                {showEmojiPicker && (
                  <Paper elevation={3} style={{ position: 'absolute', bottom: 64, right: 64, padding: 8, zIndex: 2 }}>
                    <Box sx={{ width: 300 }}>
                      <Picker
                        data={data}
                        onEmojiSelect={(e: any) => {
                          const native = e?.native || e?.unified ? String.fromCodePoint(...e.unified.split('-').map((u: string) => parseInt(u, 16))) : '';
                          if (native) handleAddEmoji(native);
                        }}
                        theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
                        previewPosition="none"
                      />
                      {/* Fallback quick emojis in case Picker fails to render */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxWidth: 240, mt: 1 }}>
                        {commonEmojis.map((e) => (
                          <Button key={e} size="small" onClick={() => handleAddEmoji(e)}>{e}</Button>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                )}
                <IconButton onClick={() => imageInputRef.current?.click()} disabled={uploadingMedia}>
                  <Paperclip size={20} />
                </IconButton>
                <IconButton onClick={() => videoInputRef.current?.click()} disabled={uploadingMedia}>
                  <Image size={20} />
                </IconButton>
                {uploadingMedia && (
                  <Box sx={{ width: 120, mx: 1 }}>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>Uploading {uploadProgress}%</Box>
                    <Box sx={{ height: 6, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ width: `${uploadProgress}%`, height: '100%', bgcolor: 'primary.main', transition: 'width 120ms linear' }} />
                    </Box>
                  </Box>
                )}

                {/* Reply Preview */}
                {replyToMessage && (
                  <Box sx={{ mx: 2, mb: 1 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Reply size={16} color={theme.palette.primary.main} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          Replying to {replyToMessage.sender?.displayName || 'Unknown'}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {replyToMessage.content}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={handleCancelReply}
                        sx={{ color: 'text.secondary' }}
                      >
                        <X size={16} />
                      </IconButton>
                    </Paper>
                  </Box>
                )}

                <TextField
                  fullWidth
                  placeholder={replyToMessage ? "Type your reply..." : "Type a message..."}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  variant="outlined"
                  size="small"
                  multiline
                  maxRows={4}
                  sx={{
                    mx: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    }
                  }}
                />
                <IconButton onClick={() => (isRecording ? stopRecording() : startRecording())} disabled={uploadingMedia}>
                  <Badge color="error" variant={isRecording ? 'dot' : 'standard'} overlap="circular">
                    <Mic size={20} color={isRecording ? theme.palette.error.main : undefined} />
                  </Badge>
                </IconButton>
                <IconButton onClick={() => setShowEmojiPicker(v => !v)}>
                  <Smile size={20} />
                </IconButton>
                <IconButton
                  color="primary"
                  type="submit"
                  disabled={!messageText.trim()}
                >
                  <Send size={20} />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <ChevronRight size={40} color={theme.palette.primary.main} />
              </Box>
              <Typography variant="h6" gutterBottom>
                Select a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                Choose a conversation from the list or start a new one to begin messaging
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>

      {/* Call Components */}
      <IncomingCallModal
        call={incomingCall}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />

      <CallInterface
        call={currentCall}
        localStream={localStream}
        remoteStreams={remoteStreams}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
      />

      {/* New Conversation Dialog */}
      <Dialog
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Start New Conversation</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Autocomplete
              multiple
              options={searchedUsers}
              value={selectedUsers}
              onChange={(event, newValue) => setSelectedUsers(newValue)}
              inputValue={userSearchQuery}
              onInputChange={(event, newInputValue) => handleUserSearchChange(newInputValue)}
              getOptionLabel={(option) => option.displayName || option.username}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={option.avatar}
                    sx={{ width: 32, height: 32 }}
                  >
                    {option.displayName?.[0] || option.username?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {option.displayName || option.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      @{option.username}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    avatar={<Avatar src={option.avatar}>{option.displayName?.[0] || option.username?.[0]}</Avatar>}
                    label={option.displayName || option.username}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search users"
                  placeholder="Type to search for users..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {searchingUsers && <CircularProgress size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={searchingUsers}
              noOptionsText={userSearchQuery ? "No users found" : "Type to search for users"}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewConversationOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            variant="contained"
            disabled={selectedUsers.length === 0}
          >
            Start Conversation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        open={forwardDialogOpen}
        onClose={() => {
          setForwardDialogOpen(false);
          setMessageToForward(null);
        }}
        onForward={handleForwardSubmit}
        conversations={conversations}
        loading={loading}
      />
    </Layout>
  );
};

export default MessagesPage;
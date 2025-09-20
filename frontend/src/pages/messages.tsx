import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    TextField,
    IconButton,
    Avatar,
    Badge,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    Divider,
    InputAdornment,
    Chip,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Tooltip,
    useTheme,
    useMediaQuery,
    Drawer,
    AppBar,
    Toolbar,
    Fab,
    alpha,
} from '@mui/material';
import {
    Send as SendIcon,
    Search as SearchIcon,
    AttachFile as AttachFileIcon,
    EmojiEmotions as EmojiIcon,
    MoreVert as MoreVertIcon,
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    Phone as PhoneIcon,
    VideoCall as VideoCallIcon,
    Info as InfoIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import CallManager from '@/components/calls/CallManager';
import {
    ModernMessageBubble,
    ModernVoiceMessageBubble,
    ModernConversationList,
    ModernMessageInput
} from '@/components/messaging';
import { UserAvatar } from '@/components/common';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const MessagesPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { user } = useAuth();
    const {
        conversations,
        activeConversation,
        messages,
        loading,
        sending,
        error,
        hasMore,
        typingUsers,
        searchResults,
        searching,
        fetchConversations,
        setActiveConversation,
        fetchMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        markAsRead,
        addReaction,
        forwardMessage,
        searchMessages,
        sendTypingIndicator,
        createConversation,
    } = useMessages();

    const { isConnected } = useSocket();

    // Local state
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
        messageId: string;
    } | null>(null);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Load conversations on mount
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Load messages when active conversation changes
    useEffect(() => {
        if (activeConversation) {
            fetchMessages();
            if (isMobile) {
                setMobileDrawerOpen(false);
            }
        }
    }, [activeConversation, fetchMessages, isMobile]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);



    // Handle send message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || sending) return;

        // Stop typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        sendTypingIndicator(false);

        const content = messageInput.trim();
        setMessageInput('');

        const success = await sendMessage(content);
        if (success) {
            scrollToBottom();
        }
    };

    // Handle key press in message input
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle conversation selection
    const handleConversationSelect = (conversation: any) => {
        setActiveConversation(conversation);
        setShowSearch(false);
        setSearchQuery('');
    };

    // Handle search
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            await searchMessages(searchQuery);
            setShowSearch(true);
        } catch (error) {
            toast.error('Search failed');
        }
    };

    // Handle message context menu
    const handleMessageContextMenu = (event: React.MouseEvent, messageId: string) => {
        event.preventDefault();
        setContextMenu({
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            messageId,
        });
    };

    const handleContextMenuClose = () => {
        setContextMenu(null);
    };

    // Handle message actions
    const handleEditMessage = async (messageId: string, newContent: string) => {
        await editMessage(messageId, newContent);
        handleContextMenuClose();
    };

    const handleDeleteMessage = async (messageId: string) => {
        await deleteMessage(messageId);
        handleContextMenuClose();
    };

    const handleReactToMessage = async (messageId: string, emoji: string) => {
        await addReaction(messageId, emoji);
    };

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (!activeConversation) return;

        // Send typing indicator
        sendTypingIndicator(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing indicator after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(false);
        }, 3000);
    }, [activeConversation, sendTypingIndicator]);

    // Stop typing when component unmounts
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (activeConversation) {
                sendTypingIndicator(false);
            }
        };
    }, [activeConversation, sendTypingIndicator]);

    // Format conversation display name
    const getConversationDisplayName = (conversation: any) => {
        if (conversation.isGroup) {
            return conversation.groupName || 'Group Chat';
        }
        const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
        return otherParticipant?.displayName || otherParticipant?.username || 'Unknown User';
    };

    // Get conversation avatar
    const getConversationAvatar = (conversation: any) => {
        if (conversation.isGroup) {
            return conversation.groupAvatar;
        }
        const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
        return otherParticipant?.avatar;
    };

    // Check if user is online
    const isUserOnline = (conversation: any) => {
        if (conversation.isGroup) return false;
        const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
        return otherParticipant?.isOnline || false;
    };

    // Render conversation list
    const renderConversationList = () => (
        <ModernConversationList
            conversations={showSearch ? searchResults.map((item: any) => item.conversation) : conversations}
            activeConversationId={activeConversation?.id}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onConversationSelect={handleConversationSelect}
            onNewConversation={() => setShowNewConversation(true)}
            loading={loading && conversations.length === 0}
            currentUserId={user?.id}
        />
    );

    // Render message thread
    const renderMessageThread = () => {
        if (!activeConversation) {
            return (
                <Box
                    sx={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <Typography variant="h6" color="text.secondary">
                        Select a conversation to start messaging
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setShowNewConversation(true)}
                    >
                        Start New Conversation
                    </Button>
                </Box>
            );
        }

        const displayName = getConversationDisplayName(activeConversation);
        const avatar = getConversationAvatar(activeConversation);
        const online = isUserOnline(activeConversation);
        const typingUsersList = (typingUsers[activeConversation.id] || [])
            .map(userId => {
                const participant = activeConversation.participants?.find(p => p.id === userId);
                return participant?.displayName || participant?.username || 'Someone';
            })
            .filter(name => name !== 'Someone');

        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Chat header */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        borderRadius: 0,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '100%',
                            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.01)} 0%, ${alpha(theme.palette.secondary.main, 0.01)} 100%)`,
                            pointerEvents: 'none'
                        }
                    }}
                >
                    {isMobile && (
                        <IconButton onClick={() => setMobileDrawerOpen(true)}>
                            <ArrowBackIcon />
                        </IconButton>
                    )}

                    <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                        color="success"
                        invisible={!online}
                        sx={{
                            '& .MuiBadge-badge': {
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                border: `3px solid ${theme.palette.background.paper}`,
                                boxShadow: `0 0 0 1px ${alpha(theme.palette.success.main, 0.3)}`
                            }
                        }}
                    >
                        <UserAvatar
                            src={avatar}
                            alt={displayName}
                            size="large"
                            isOnline={online}
                            sx={{
                                width: 52,
                                height: 52,
                                border: `3px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                boxShadow: `0 4px 12px ${alpha(theme.palette.grey[500], 0.15)}`,
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </Badge>

                    <Box sx={{ flex: 1, position: 'relative', zIndex: 1 }}>
                        <Typography
                            variant="h6"
                            fontWeight="600"
                            sx={{
                                color: theme.palette.text.primary,
                                mb: 0.5
                            }}
                        >
                            {displayName}
                        </Typography>
                        {online && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: theme.palette.success.main,
                                        animation: 'pulse 2s infinite',
                                        '@keyframes pulse': {
                                            '0%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                            '100%': { opacity: 1 }
                                        }
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    color="success.main"
                                    fontWeight="500"
                                    sx={{ fontSize: '0.8rem' }}
                                >
                                    Online
                                </Typography>
                            </Box>
                        )}
                        {typingUsersList.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <Box sx={{ display: 'flex', gap: 0.3 }}>
                                    {[0, 1, 2].map((i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                width: 4,
                                                height: 4,
                                                borderRadius: '50%',
                                                bgcolor: theme.palette.primary.main,
                                                animation: 'typing 1.4s ease-in-out infinite',
                                                animationDelay: `${i * 0.2}s`,
                                                '@keyframes typing': {
                                                    '0%, 60%, 100%': { transform: 'translateY(0)' },
                                                    '30%': { transform: 'translateY(-4px)' }
                                                }
                                            }}
                                        />
                                    ))}
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="primary.main"
                                    fontWeight="500"
                                    sx={{ fontSize: '0.8rem' }}
                                >
                                    {typingUsersList.join(', ')} {typingUsersList.length === 1 ? 'is' : 'are'} typing...
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5, position: 'relative', zIndex: 1 }}>
                        <Tooltip title="Voice Call">
                            <IconButton
                                sx={{
                                    bgcolor: alpha(theme.palette.success.main, 0.1),
                                    color: theme.palette.success.main,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.success.main, 0.2),
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            >
                                <PhoneIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Video Call">
                            <IconButton
                                sx={{
                                    bgcolor: alpha(theme.palette.info.main, 0.1),
                                    color: theme.palette.info.main,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.info.main, 0.2),
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            >
                                <VideoCallIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Conversation Info">
                            <IconButton
                                sx={{
                                    bgcolor: alpha(theme.palette.text.secondary, 0.1),
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.text.secondary, 0.2),
                                        color: theme.palette.text.primary,
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            >
                                <InfoIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Paper>

                {/* Messages area */}
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        background: theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(theme.palette.grey[900], 0.98)} 100%)`
                            : `linear-gradient(135deg, ${alpha(theme.palette.grey[50], 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                        backgroundImage: theme.palette.mode === 'dark'
                            ? `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%),
                               radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.03)} 0%, transparent 50%)`
                            : `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.02)} 0%, transparent 50%),
                               radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.02)} 0%, transparent 50%)`,
                        position: 'relative',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='${encodeURIComponent(alpha(theme.palette.divider, 0.02))}' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            pointerEvents: 'none',
                            zIndex: 0
                        },
                        '& > *': {
                            position: 'relative',
                            zIndex: 1
                        }
                    }}
                >
                    {loading && messages.length === 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <Box
                                    key={message.id}
                                    onContextMenu={(e) => handleMessageContextMenu(e, message.id)}
                                    sx={{ mb: 1 }}
                                >
                                    {message.type === 'audio' ? (
                                        <ModernVoiceMessageBubble
                                            audioUrl={message.media?.[0]?.url || ''}
                                            filename={message.media?.[0]?.filename || 'Voice Message'}
                                            duration={message.media?.[0]?.duration}
                                            fileSize={message.media?.[0]?.fileSize}
                                            isOwn={message.isOwn}
                                            timestamp={message.createdAt}
                                            onDownload={() => console.log('Download voice message')}
                                            onDelete={() => handleDeleteMessage(message.id)}
                                            onForward={() => console.log('Forward voice message')}
                                        />
                                    ) : (
                                        <ModernMessageBubble
                                            message={message}
                                            onReaction={(messageId, emoji) => handleReactToMessage(messageId, emoji)}
                                            onEdit={(messageId, content) => handleEditMessage(messageId, content)}
                                            onDelete={(messageId) => handleDeleteMessage(messageId)}
                                        />
                                    )}
                                </Box>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </Box>

                {/* Modern Message Input */}
                <ModernMessageInput
                    value={messageInput}
                    onChange={(value) => {
                        setMessageInput(value);
                        handleTyping();
                    }}
                    onSend={handleSendMessage}
                    onTyping={handleTyping}
                    placeholder="Type a message..."
                    disabled={sending}
                    sending={sending}
                    onFileUpload={(files) => {
                        // Handle file upload
                        console.log('Files selected:', files);
                    }}
                    onVoiceRecord={(audioBlob) => {
                        // Handle voice recording
                        console.log('Voice recorded:', audioBlob);
                    }}
                    showTypingIndicator={typingUsers[activeConversation?.id]?.length > 0}
                    typingUsers={typingUsers[activeConversation?.id]?.map(userId => {
                        const participant = activeConversation?.participants?.find(p => p.id === userId);
                        return participant?.displayName || participant?.username || 'Someone';
                    }).filter(name => name !== 'Someone') || []}
                />
            </Box>
        );
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Mobile app bar */}
            {isMobile && (
                <AppBar
                    position="static"
                    elevation={0}
                    sx={{
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        color: theme.palette.text.primary
                    }}
                >
                    <Toolbar>
                        <Typography
                            variant="h6"
                            sx={{
                                flex: 1,
                                fontWeight: 600,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}
                        >
                            Messages
                        </Typography>
                    </Toolbar>
                </AppBar>
            )}

            {/* Main content */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    overflow: 'hidden',
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.grey[100]} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
                    position: 'relative'
                }}
            >
                {isMobile ? (
                    <>
                        {/* Mobile drawer for conversations */}
                        <Drawer
                            anchor="left"
                            open={mobileDrawerOpen}
                            onClose={() => setMobileDrawerOpen(false)}
                            PaperProps={{
                                sx: {
                                    width: '85%',
                                    maxWidth: 420,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
                                    backdropFilter: 'blur(20px)',
                                    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: `0 8px 32px ${alpha(theme.palette.grey[500], 0.15)}`
                                },
                            }}
                        >
                            {renderConversationList()}
                        </Drawer>

                        {/* Mobile message thread */}
                        <Box sx={{ flex: 1 }}>
                            {renderMessageThread()}
                        </Box>

                        {/* Mobile FAB for new conversation */}
                        {!activeConversation && (
                            <Fab
                                color="primary"
                                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                                onClick={() => setShowNewConversation(true)}
                            >
                                <AddIcon />
                            </Fab>
                        )}
                    </>
                ) : (
                    <>
                        {/* Desktop layout */}
                        <Paper
                            elevation={0}
                            sx={{
                                width: 380,
                                borderRadius: 0,
                                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.main, 0.01)} 100%)`,
                                backdropFilter: 'blur(20px)',
                                borderRight: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                                boxShadow: `inset -1px 0 0 ${alpha(theme.palette.primary.main, 0.05)}`,
                                position: 'relative',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: 1,
                                    height: '100%',
                                    background: `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.1)} 50%, transparent 100%)`,
                                    pointerEvents: 'none'
                                }
                            }}
                        >
                            {renderConversationList()}
                        </Paper>

                        <Box
                            sx={{
                                flex: 1,
                                position: 'relative',
                                background: 'transparent'
                            }}
                        >
                            {renderMessageThread()}
                        </Box>
                    </>
                )}
            </Box>

            {/* Context menu */}
            <Menu
                open={contextMenu !== null}
                onClose={handleContextMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        minWidth: 180,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.grey[500], 0.15)}`,
                        '& .MuiMenuItem-root': {
                            borderRadius: 2,
                            mx: 1,
                            my: 0.5,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                transform: 'translateX(4px)'
                            }
                        }
                    }
                }}
            >
                <MenuItem onClick={() => console.log('Reply')}>Reply</MenuItem>
                <MenuItem onClick={() => console.log('Forward')}>Forward</MenuItem>
                <MenuItem onClick={() => console.log('Edit')}>Edit</MenuItem>
                <MenuItem
                    onClick={() => console.log('Delete')}
                    sx={{
                        color: 'error.main',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.08)
                        }
                    }}
                >
                    Delete
                </MenuItem>
            </Menu>

            {/* Error display */}
            {error && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        zIndex: 1000,
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            p: 2,
                            bgcolor: 'error.main',
                            color: 'error.contrastText',
                        }}
                    >
                        <Typography variant="body2">{error}</Typography>
                    </Paper>
                </Box>
            )}

            {/* Call Manager */}
            {selectedConversation && (
                <CallManager conversationId={selectedConversation.id} />
            )}
        </Box>
    );
};

export default MessagesPage;
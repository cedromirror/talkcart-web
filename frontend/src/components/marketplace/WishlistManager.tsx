import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField,
  Alert,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import { 
  Heart, 
  X, 
  Share2, 
  ShoppingCart, 
  Eye, 
  MoreVertical, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Users, 
  Lock 
} from 'lucide-react';

interface WishlistManagerProps {
  open: boolean;
  onClose: () => void;
  onAddToCart?: (productId: string) => void;
  onShare?: (wishlist: Wishlist) => void;
}

export interface WishlistItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  seller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isAvailable: boolean;
  priceChanged: boolean;
  originalPrice?: number;
  addedAt: string;
  category: string;
  isNFT: boolean;
}

export interface Wishlist {
  id: string;
  name: string;
  description?: string;
  privacy: 'public' | 'private' | 'friends';
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
  followers: number;
  isDefault: boolean;
}

const WishlistManager: React.FC<WishlistManagerProps> = ({
  open,
  onClose,
  onAddToCart,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedWishlist, setSelectedWishlist] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState('');
  const [newWishlistDescription, setNewWishlistDescription] = useState('');
  const [newWishlistPrivacy, setNewWishlistPrivacy] = useState<'public' | 'private' | 'friends'>('private');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // No mock data - should fetch real wishlists from backend
  const wishlists: Wishlist[] = [
    {
      id: '1',
      name: 'My Favorites',
      description: 'Items I really want to buy',
      privacy: 'private',
      isDefault: true,
      followers: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z',
      items: [
        {
          id: 'item1',
          productId: 'prod1',
          title: 'Digital Art Collection - Cyberpunk Dreams',
          price: 0.4,
          currency: 'ETH',
          image: '/api/placeholder/150/150',
          seller: {
            id: 'seller1',
            name: 'Digital Artist Pro',
            avatar: '/api/placeholder/32/32',
          },
          isAvailable: true,
          priceChanged: true,
          originalPrice: 0.5,
          addedAt: '2024-01-15T00:00:00Z',
          category: 'Digital Art',
          isNFT: true,
        },
        {
          id: 'item2',
          productId: 'prod2',
          title: 'Vintage Camera Collection - Leica M6',
          price: 1250,
          currency: 'USD',
          image: '/api/placeholder/150/150',
          seller: {
            id: 'seller2',
            name: 'Vintage Collector',
            avatar: '/api/placeholder/32/32',
          },
          isAvailable: true,
          priceChanged: false,
          addedAt: '2024-01-10T00:00:00Z',
          category: 'Photography',
          isNFT: false,
        },
      ],
    },
    {
      id: '2',
      name: 'NFT Collection Goals',
      description: 'NFTs I want to collect',
      privacy: 'public',
      isDefault: false,
      followers: 23,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-18T00:00:00Z',
      items: [
        {
          id: 'item3',
          productId: 'prod3',
          title: 'Rare Pixel Art Avatar #1234',
          price: 2.5,
          currency: 'ETH',
          image: '/api/placeholder/150/150',
          seller: {
            id: 'seller3',
            name: 'Pixel Master',
            avatar: '/api/placeholder/32/32',
          },
          isAvailable: false,
          priceChanged: false,
          addedAt: '2024-01-12T00:00:00Z',
          category: 'NFTs',
          isNFT: true,
        },
      ],
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateWishlist = () => {
    // In real app, this would make an API call
    console.log('Creating wishlist:', {
      name: newWishlistName,
      description: newWishlistDescription,
      privacy: newWishlistPrivacy,
    });
    setShowCreateDialog(false);
    setNewWishlistName('');
    setNewWishlistDescription('');
    setNewWishlistPrivacy('private');
  };

  const handleRemoveItem = (wishlistId: string, itemId: string) => {
    console.log('Removing item:', itemId, 'from wishlist:', wishlistId);
    setMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleMoveItem = (itemId: string, targetWishlistId: string) => {
    console.log('Moving item:', itemId, 'to wishlist:', targetWishlistId);
    setMenuAnchor(null);
    setSelectedItem(null);
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return <Globe size={16} />;
      case 'friends':
        return <Users size={16} />;
      default:
        return <Lock size={16} />;
    }
  };

  const renderWishlistItems = (wishlist: Wishlist) => {
    if (wishlist.items.length === 0) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
          }}
        >
          <Heart size={48} color="#ccc" />
          <Typography variant="h6" color="text.secondary" mt={2}>
            No items in this wishlist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start adding items you love!
          </Typography>
        </Box>
      );
    }

    return (
      <List>
        {wishlist.items.map((item, index) => (
          <React.Fragment key={item.id}>
            <ListItem sx={{ alignItems: 'flex-start', py: 2 }}>
              <ListItemAvatar>
                <Avatar
                  src={item.image}
                  variant="rounded"
                  sx={{ width: 60, height: 60 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.title}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        by {item.seller.name}
                      </Typography>
                      {item.isNFT && (
                        <Chip label="NFT" size="small" color="primary" />
                      )}
                      {!item.isAvailable && (
                        <Chip label="Unavailable" size="small" color="error" />
                      )}
                    </Box>
                  </Box>
                }
                secondary={
                  <Box mt={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={item.priceChanged ? 'success.main' : 'text.primary'}
                      >
                        {formatPrice(item.price, item.currency)}
                      </Typography>
                      {item.priceChanged && item.originalPrice && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textDecoration: 'line-through' }}
                        >
                          {formatPrice(item.originalPrice, item.currency)}
                        </Typography>
                      )}
                    </Box>
                    
                    {item.priceChanged && (
                      <Alert severity="success" sx={{ py: 0, mb: 1 }}>
                        <Typography variant="caption">
                          Price dropped! Save {formatPrice((item.originalPrice || 0) - item.price, item.currency)}
                        </Typography>
                      </Alert>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<ShoppingCart size={14} />}
                    onClick={() => onAddToCart?.(item.productId)}
                    disabled={!item.isAvailable}
                  >
                    Add to Cart
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setMenuAnchor(e.currentTarget);
                      setSelectedItem(item.id);
                    }}
                  >
                    <MoreVertical size={16} />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < wishlist.items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Heart size={24} />
              <Typography variant="h6" fontWeight={600}>
                My Wishlists
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => setShowCreateDialog(true)}
                variant="outlined"
                size="small"
              >
                New List
              </Button>
              <IconButton onClick={onClose}>
                <X size={20} />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Wishlist Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {wishlists.map((wishlist, index) => (
                <Tab
                  key={wishlist.id}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      {getPrivacyIcon(wishlist.privacy)}
                      <span>{wishlist.name}</span>
                      <Chip
                        label={wishlist.items.length}
                        size="small"
                        color="primary"
                        sx={{ minWidth: 'auto', height: 18 }}
                      />
                    </Box>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {/* Wishlist Content */}
          <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
            {mockWishlists.map((wishlist, index) => (
              <div
                key={wishlist.id}
                role="tabpanel"
                hidden={activeTab !== index}
              >
                {activeTab === index && (
                  <Box>
                    {/* Wishlist Header */}
                    <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="h6" fontWeight={600}>
                          {wishlist.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {wishlist.privacy === 'public' && (
                            <Chip
                              icon={<Users size={12} />}
                              label={`${wishlist.followers} followers`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <IconButton size="small" onClick={() => onShare?.(wishlist)}>
                            <Share2 size={16} />
                          </IconButton>
                        </Box>
                      </Box>
                      {wishlist.description && (
                        <Typography variant="body2" color="text.secondary">
                          {wishlist.description}
                        </Typography>
                      )}
                      <Box display="flex" alignItems="center" gap={2} mt={1}>
                        <Typography variant="caption" color="text.secondary">
                          {wishlist.items.length} items
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated {new Date(wishlist.updatedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Wishlist Items */}
                    {renderWishlistItems(wishlist)}
                  </Box>
                )}
              </div>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Create Wishlist Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Wishlist</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Wishlist Name"
            value={newWishlistName}
            onChange={(e) => setNewWishlistName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            multiline
            rows={3}
            value={newWishlistDescription}
            onChange={(e) => setNewWishlistDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Privacy"
            value={newWishlistPrivacy}
            onChange={(e) => setNewWishlistPrivacy(e.target.value as any)}
          >
            <MenuItem value="private">
              <Box display="flex" alignItems="center" gap={1}>
                <Lock size={16} />
                Private - Only you can see
              </Box>
            </MenuItem>
            <MenuItem value="friends">
              <Box display="flex" alignItems="center" gap={1}>
                <Users size={16} />
                Friends - Friends can see
              </Box>
            </MenuItem>
            <MenuItem value="public">
              <Box display="flex" alignItems="center" gap={1}>
                <Globe size={16} />
                Public - Everyone can see
              </Box>
            </MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateWishlist}
            variant="contained"
            disabled={!newWishlistName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Item Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => console.log('View product')}>
          <ListItemIcon>
            <Eye size={16} />
          </ListItemIcon>
          <ListItemText>View Product</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => console.log('Share item')}>
          <ListItemIcon>
            <Share2 size={16} />
          </ListItemIcon>
          <ListItemText>Share Item</ListItemText>
        </MenuItem>
        <Divider />
        {wishlists.length > 1 && (
          <MenuItem onClick={() => console.log('Move to another list')}>
            <ListItemIcon>
              <Edit size={16} />
            </ListItemIcon>
            <ListItemText>Move to Another List</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => selectedItem && wishlists[activeTab] && handleRemoveItem(wishlists[activeTab].id, selectedItem)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Trash2 size={16} color="currentColor" />
          </ListItemIcon>
          <ListItemText>Remove from List</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default WishlistManager;
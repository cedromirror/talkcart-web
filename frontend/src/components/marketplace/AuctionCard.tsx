import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Alert,
  Fade,
} from '@mui/material';
import {
  Clock,
  Gavel,
  TrendingUp,
  User,
  Eye,
  Heart,
  Share2,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/router';
import FollowButton from '@/components/common/FollowButton';

interface AuctionCardProps {
  auction: AuctionItem;
  onPlaceBid?: (auctionId: string, bidAmount: number) => void;
  onToggleFavorite?: (auctionId: string) => void;
  onShare?: (auction: AuctionItem) => void;
  variant?: 'default' | 'detailed';
}

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  seller: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
    rating: number;
  };
  currentBid: number;
  minBid: number;
  buyNowPrice?: number;
  currency: string;
  startTime: string;
  endTime: string;
  bidCount: number;
  watchers: number;
  views: number;
  isWatched: boolean;
  isNFT: boolean;
  reserveMet: boolean;
  reservePrice?: number;
  bids: AuctionBid[];
  condition: string;
  tags: string[];
}

export interface AuctionBid {
  id: string;
  bidder: {
    id: string;
    username: string;
    avatar?: string;
  };
  amount: number;
  timestamp: string;
  isWinning: boolean;
}

const AuctionCard: React.FC<AuctionCardProps> = ({
  auction,
  onPlaceBid,
  onToggleFavorite,
  onShare,
  variant = 'default',
}) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [bidAmount, setBidAmount] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(auction.endTime).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [auction.endTime]);

  const handlePlaceBid = () => {
    const amount = parseFloat(bidAmount);
    if (amount >= getMinimumBid()) {
      onPlaceBid?.(auction.id, amount);
      setBidAmount('');
    }
  };

  const handleCardClick = () => {
    router.push(`/marketplace/auction/${auction.id}`);
  };

  const getMinimumBid = () => {
    return auction.currentBid > 0 ? auction.currentBid + 1 : auction.minBid;
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'ETH') {
      return `${price} ETH`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const getTimeLeftString = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h`;
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    } else if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else if (timeLeft.seconds > 0) {
      return `${timeLeft.seconds}s`;
    } else {
      return 'Ended';
    }
  };

  const isAuctionEnded = () => {
    return new Date() > new Date(auction.endTime);
  };

  const getProgressPercentage = () => {
    const now = new Date().getTime();
    const start = new Date(auction.startTime).getTime();
    const end = new Date(auction.endTime).getTime();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  return (
    <Card
      sx={{
        height: variant === 'detailed' ? 'auto' : 450,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height={variant === 'detailed' ? 300 : 200}
          image={auction.images[0] || '/placeholder-auction.jpg'}
          alt={auction.title}
          sx={{
            objectFit: 'cover',
            transition: 'transform 0.3s ease',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />

        {/* Auction Status Badges */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          <Chip
            icon={<Gavel size={12} />}
            label="AUCTION"
            size="small"
            color="warning"
            sx={{ fontWeight: 600, fontSize: '0.7rem' }}
          />
          {auction.isNFT && (
            <Chip
              label="NFT"
              size="small"
              sx={{
                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          )}
          {!auction.reserveMet && auction.reservePrice && (
            <Chip
              label="RESERVE"
              size="small"
              color="error"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        {/* Time Left */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: isAuctionEnded() ? 'error.main' : 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Clock size={12} />
          <Typography variant="caption" fontWeight={600}>
            {getTimeLeftString()}
          </Typography>
        </Box>

        {/* Quick Stats */}
        <Fade in={isHovered}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              gap: 1,
            }}
          >
            <Chip
              icon={<Eye size={12} />}
              label={auction.watchers}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
            <Chip
              icon={<Gavel size={12} />}
              label={auction.bidCount}
              size="small"
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
          </Box>
        </Fade>
      </Box>

      <CardContent sx={{ p: 2 }}>
        {/* Seller Info */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Avatar src={auction.seller.avatar} sx={{ width: 24, height: 24 }}>
            {auction.seller.displayName[0]}
          </Avatar>
          <Typography variant="caption" color="text.secondary">
            {auction.seller.displayName}
          </Typography>
          {auction.seller.isVerified && (
            <Chip label="✓" size="small" color="primary" sx={{ minWidth: 'auto', px: 0.5 }} />
          )}
          <Box ml="auto">
            <FollowButton
              user={auction.seller}
              variant="button"
              size="small"
              context="marketplace"
            />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle2"
          fontWeight={600}
          gutterBottom
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.2,
            minHeight: '2.4em',
          }}
        >
          {auction.title}
        </Typography>

        {/* Current Bid */}
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary">
            Current Bid
          </Typography>
          <Typography variant="h6" color="primary" fontWeight={700}>
            {formatPrice(auction.currentBid, auction.currency)}
          </Typography>
          {auction.bidCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Auction Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Math.round(getProgressPercentage())}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={getProgressPercentage()}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>

        {variant === 'detailed' && (
          <>
            {/* Recent Bids */}
            {auction.bids.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Recent Bids
                </Typography>
                <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
                  {auction.bids.slice(0, 3).map((bid, index) => (
                    <React.Fragment key={bid.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar src={bid.bidder.avatar} sx={{ width: 32, height: 32 }}>
                            {bid.bidder.username[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">
                                {formatPrice(bid.amount, auction.currency)}
                              </Typography>
                              {bid.isWinning && (
                                <Chip
                                  label="Winning"
                                  size="small"
                                  color="success"
                                  sx={{ fontSize: '0.6rem', height: 18 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              by {bid.bidder.username} • {new Date(bid.timestamp).toLocaleTimeString()}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < auction.bids.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}

            {/* Bid Input */}
            {!isAuctionEnded() && (
              <Box mb={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Your Bid"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {auction.currency === 'ETH' ? 'ETH' : '$'}
                      </InputAdornment>
                    ),
                  }}
                  helperText={`Minimum bid: ${formatPrice(getMinimumBid(), auction.currency)}`}
                />
              </Box>
            )}
          </>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1}>
          {!isAuctionEnded() ? (
            <>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Gavel size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  if (variant === 'detailed') {
                    handlePlaceBid();
                  } else {
                    handleCardClick();
                  }
                }}
                disabled={variant === 'detailed' && (!bidAmount || parseFloat(bidAmount) < getMinimumBid())}
              >
                {variant === 'detailed' ? 'Place Bid' : 'Bid Now'}
              </Button>
              {auction.buyNowPrice && (
                <Button
                  variant="outlined"
                  startIcon={<Zap size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle buy now
                  }}
                >
                  Buy Now
                </Button>
              )}
            </>
          ) : (
            <Button
              fullWidth
              variant="outlined"
              disabled
            >
              Auction Ended
            </Button>
          )}
        </Box>

        {/* Buy Now Price */}
        {auction.buyNowPrice && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary">
              Buy Now: {formatPrice(auction.buyNowPrice, auction.currency)}
            </Typography>
          </Box>
        )}

        {/* Reserve Notice */}
        {!auction.reserveMet && auction.reservePrice && (
          <Alert severity="info" sx={{ mt: 1 }}>
            <Typography variant="caption">
              Reserve price not yet met
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionCard;
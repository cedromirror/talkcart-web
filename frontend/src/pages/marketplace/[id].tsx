import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
    Avatar,
    Divider,
    Stack,
    Alert,
    Skeleton,
    useTheme,
} from '@mui/material';
import {
    ShoppingCart,
    Wallet,
    Eye,
    TrendingUp,
    Verified,
    ArrowLeft,
    Tag as TagIcon,
    Calendar,
    Package
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '@/components/layout/Layout';
import BuyModal from '@/components/marketplace/BuyModal';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    category: string;
    tags: string[];
    vendor: {
        id: string;
        username: string;
        displayName: string;
        avatar: string;
        isVerified: boolean;
        walletAddress: string;
    };
    isNFT: boolean;
    contractAddress?: string;
    tokenId?: string;
    stock: number;
    sales: number;
    views: number;
    rating: number;
    reviewCount: number;
    featured: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const ProductDetailPage: React.FC = () => {
    const theme = useTheme();
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buyOpen, setBuyOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
        if (!id || typeof id !== 'string') return;

        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.marketplace.getProduct(id);

                if (response.success) {
                    setProduct(response.data);
                } else {
                    setError(response.error || 'Product not found');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load product');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    const formatPrice = (price: number, currency: string) => {
        if (currency === 'ETH') {
            return `${price} ETH`;
        } else if (currency === 'USD') {
            return `$${price.toFixed(2)}`;
        }
        return `${price} ${currency}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <Layout>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Skeleton variant="text" height={60} sx={{ mb: 2 }} />
                            <Skeleton variant="text" height={40} sx={{ mb: 2 }} />
                            <Skeleton variant="text" height={30} width="60%" sx={{ mb: 3 }} />
                            <Skeleton variant="rectangular" height={120} sx={{ mb: 3 }} />
                            <Skeleton variant="rectangular" height={50} />
                        </Grid>
                    </Grid>
                </Container>
            </Layout>
        );
    }

    if (error || !product) {
        return (
            <Layout>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error || 'Product not found'}
                    </Alert>
                    <Button
                        component={Link}
                        href="/marketplace"
                        startIcon={<ArrowLeft size={20} />}
                        variant="outlined"
                    >
                        Back to Marketplace
                    </Button>
                </Container>
            </Layout>
        );
    }

    const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0 && !product.isNFT;
    const canBuy = product.isActive && !isOutOfStock;

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                {/* Back Button */}
                <Button
                    component={Link}
                    href="/marketplace"
                    startIcon={<ArrowLeft size={20} />}
                    variant="outlined"
                    sx={{ mb: 3 }}
                >
                    Back to Marketplace
                </Button>

                <Grid container spacing={4}>
                    {/* Product Images */}
                    <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: 2 }}>
                            <Box sx={{ position: 'relative', height: 400 }}>
                                <Image
                                    src={product.images[selectedImageIndex]?.secure_url || product.images[selectedImageIndex]?.url || 'https://via.placeholder.com/400x400?text=No+Image'}
                                    alt={product.name}
                                    fill
                                    style={{ objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                                />
                                {product.featured && (
                                    <Chip
                                        label="Featured"
                                        color="primary"
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            left: 16,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}
                                {product.isNFT && (
                                    <Chip
                                        label="NFT"
                                        color="secondary"
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}
                            </Box>

                            {/* Image Thumbnails */}
                            {product.images.length > 1 && (
                                <Box sx={{ p: 2, display: 'flex', gap: 1, overflowX: 'auto' }}>
                                    {product.images.map((image, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                width: 60,
                                                height: 60,
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                border: selectedImageIndex === index ? 2 : 1,
                                                borderColor: selectedImageIndex === index ? 'primary.main' : 'divider',
                                                flexShrink: 0
                                            }}
                                            onClick={() => setSelectedImageIndex(index)}
                                        >
                                            <Image
                                                src={image?.secure_url || image?.url || 'https://via.placeholder.com/60x60?text=No+Image'}
                                                alt={`${product.name} ${index + 1}`}
                                                width={60}
                                                height={60}
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Card>
                    </Grid>

                    {/* Product Details */}
                    <Grid item xs={12} md={6}>
                        <Stack spacing={3}>
                            {/* Title and Price */}
                            <Box>
                                <Typography variant="h4" component="h1" gutterBottom>
                                    {product.name}
                                </Typography>
                                <Typography variant="h5" color="primary" fontWeight="bold">
                                    {formatPrice(product.price, product.currency)}
                                </Typography>
                            </Box>

                            {/* Vendor Info */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                    src={product.vendor.avatar}
                                    alt={product.vendor.displayName}
                                    sx={{ width: 48, height: 48 }}
                                />
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="medium">
                                            {product.vendor.displayName}
                                        </Typography>
                                        {product.vendor.isVerified && (
                                            <Verified size={16} color={theme.palette.primary.main} />
                                        )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        @{product.vendor.username}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Stats */}
                            <Box sx={{ display: 'flex', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Eye size={16} color={theme.palette.text.secondary} />
                                    <Typography variant="body2" color="text.secondary">
                                        {product.views} views
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TrendingUp size={16} color={theme.palette.text.secondary} />
                                    <Typography variant="body2" color="text.secondary">
                                        {product.sales} sold
                                    </Typography>
                                </Box>
                                {!product.isNFT && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Package size={16} color={theme.palette.text.secondary} />
                                        <Typography variant="body2" color="text.secondary">
                                            {product.stock} in stock
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Category and Tags */}
                            <Box>
                                <Chip
                                    label={product.category}
                                    variant="outlined"
                                    sx={{ mr: 1, mb: 1 }}
                                />
                                {product.tags.map((tag, index) => (
                                    <Chip
                                        key={index}
                                        label={tag}
                                        size="small"
                                        variant="outlined"
                                        sx={{ mr: 1, mb: 1 }}
                                    />
                                ))}
                            </Box>

                            {/* Description */}
                            <Card variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Description
                                </Typography>
                                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {product.description}
                                </Typography>
                            </Card>

                            {/* NFT Details */}
                            {product.isNFT && product.contractAddress && (
                                <Card variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        NFT Details
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                        <strong>Contract:</strong> {product.contractAddress}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Token ID:</strong> {product.tokenId}
                                    </Typography>
                                </Card>
                            )}

                            {/* Stock Warning */}
                            {isOutOfStock && (
                                <Alert severity="warning">
                                    This item is currently out of stock
                                </Alert>
                            )}

                            {/* Buy Button */}
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={product.isNFT ? <Wallet size={20} /> : <ShoppingCart size={20} />}
                                disabled={!canBuy}
                                onClick={() => setBuyOpen(true)}
                                sx={{ py: 1.5 }}
                            >
                                {!canBuy
                                    ? (isOutOfStock ? 'Out of Stock' : 'Unavailable')
                                    : (product.isNFT ? 'Buy NFT' : 'Buy Now')
                                }
                            </Button>

                            {/* Additional Info */}
                            <Divider />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Calendar size={16} color={theme.palette.text.secondary} />
                                <Typography variant="body2" color="text.secondary">
                                    Listed on {formatDate(product.createdAt)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            {/* Buy Modal */}
            <BuyModal
                open={buyOpen}
                onClose={() => setBuyOpen(false)}
                product={product}
            />
        </Layout>
    );
};

export default ProductDetailPage;
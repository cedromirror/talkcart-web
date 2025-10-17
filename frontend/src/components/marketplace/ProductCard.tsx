import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Eye,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import OptimizedImage from '@/components/media/OptimizedImage';
import { convertUsdToCurrency, convertCurrencyToUsd, formatCurrencyAmount } from '@/utils/currencyConverter';
import { getUserCurrency } from '@/utils/userCurrencyDetector';
import dynamic from 'next/dynamic';
const ChatbotButton = dynamic(() => import('./ChatbotButton'), { ssr: false });

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  isNFT: boolean;
  featured?: boolean;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: string;
  createdAt: string;
  discount?: number;
  freeShipping?: boolean;
  fastDelivery?: boolean;
  prime?: boolean;
}

interface ProductCardProps {
  product?: Product;
  loading?: boolean;
  userCurrency?: string; // Add user's preferred currency
  onCurrencyConverted?: (convertedPrice: number) => void; // Callback for converted price
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  loading = false,
  userCurrency, // Accept userCurrency as prop
  onCurrencyConverted,
}) => {
  console.log('ProductCard received product:', product);
  console.log('ProductCard loading state:', loading);
  
  const router = useRouter();
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('USD');

  // Detect user's currency when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const detectCurrency = async () => {
      try {
        console.log('Starting currency detection in ProductCard');
        const currency = await getUserCurrency();
        console.log('Detected currency:', currency);
        // Validate currency before setting state
        if (isMounted && currency && typeof currency === 'string' && currency.length === 3) {
          console.log('Setting detected currency:', currency.toUpperCase());
          setDetectedCurrency(currency.toUpperCase());
        } else if (isMounted) {
          // Fallback to USD if currency detection returns invalid data
          console.log('Invalid currency detected, using USD');
          setDetectedCurrency('USD');
        }
      } catch (error) {
        console.error('Error detecting currency:', error);
        // Use default currency if detection fails
        if (isMounted) {
          console.log('Error in currency detection, using USD');
          setDetectedCurrency('USD');
        }
      }
    };

    // Add a small delay to prevent blocking the main thread
    const timer = setTimeout(() => {
      console.log('Starting currency detection');
      detectCurrency();
    }, 100);

    return () => {
      console.log('Cleaning up currency detection useEffect');
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Use detected currency if no userCurrency prop is provided
  const effectiveUserCurrency = userCurrency || detectedCurrency;
  console.log('ProductCard: effectiveUserCurrency', effectiveUserCurrency);
  console.log('ProductCard: product.currency', product?.currency);
  console.log('ProductCard: currencies different', product?.currency !== effectiveUserCurrency);

  // Convert price to user's currency when product or userCurrency changes
  useEffect(() => {
    const convertPrice = async () => {
      if (!product) {
        setConvertedPrice(null);
        return;
      }

      // Debug logging
      console.log('Currency conversion debug:', {
        productCurrency: product.currency,
        userCurrency: effectiveUserCurrency,
        areCurrenciesDifferent: product.currency !== effectiveUserCurrency
      });

      // Only attempt conversion if currencies are different and both are valid
      if (product.currency && effectiveUserCurrency && product.currency !== effectiveUserCurrency) {
        setIsConverting(true);
        try {
          // If product is already in USD, convert to user's currency
          if (product.currency === 'USD') {
            const converted = await convertUsdToCurrency(product.price, effectiveUserCurrency);
            console.log('Converted from USD to user currency:', { original: product.price, converted, currency: effectiveUserCurrency });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          } 
          // If user wants USD but product is in another currency, convert to USD
          else if (effectiveUserCurrency === 'USD') {
            const converted = await convertCurrencyToUsd(product.price, product.currency);
            console.log('Converted to USD from product currency:', { original: product.price, converted, currency: product.currency });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          }
          // If both product and user currency are non-USD, convert through USD
          else {
            // First convert product currency to USD
            const inUsd = await convertCurrencyToUsd(product.price, product.currency);
            // Then convert USD to user's currency
            const converted = await convertUsdToCurrency(inUsd, effectiveUserCurrency);
            console.log('Converted through USD:', { 
              original: product.price, 
              inUsd: inUsd,
              converted: converted, 
              fromCurrency: product.currency,
              toCurrency: effectiveUserCurrency 
            });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          }
        } catch (error) {
          console.error('Error converting currency:', error);
          setConvertedPrice(null);
        } finally {
          setIsConverting(false);
        }
      } else {
        // Currencies are the same, set converted price to null to indicate no conversion needed
        console.log('Currencies are the same, setting converted price to null');
        setConvertedPrice(null);
      }
    };

    convertPrice();
  }, [product, effectiveUserCurrency, onCurrencyConverted]);

  // Loading skeleton
  if (loading || !product) {
    return (
      <Card
        sx={{
          height: 220,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Skeleton variant="rectangular" height={120} />
        <CardContent sx={{ flexGrow: 1, p: 1 }}>
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={28} />
        </CardContent>
      </Card>
    );
  }

  const getImageSrc = () => {
    if (!product.images || product.images.length === 0) {
      return '/images/placeholder-image.svg';
    }
    
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage.secure_url || firstImage.url || '/images/placeholder-image.svg';
  };

  // Handle navigation to product detail page
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if the click originated from the chat button
    if ((e.target as HTMLElement).closest('.chatbot-button-container')) {
      e.stopPropagation();
      return;
    }
    router.push(`/marketplace/${product.id}`);
  };

  // Handle chat button click
  const handleChatClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent card click handler from firing
    e.stopPropagation();
  };

  return (
    <Card
      sx={{
        height: 220,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      }}
      onClick={handleCardClick}
    >
      {/* Product Image - Fixed size container with exact dimensions */}
      <Box sx={{ 
        position: 'relative', 
        height: 160, 
        backgroundColor: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {!imageError ? (
          <OptimizedImage
            src={getImageSrc()}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
            onError={() => setImageError(true)}
            quality={80}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
            }}
          >
            <AlertCircle size={24} color={theme.palette.text.secondary} />
          </Box>
        )}

        {/* View Count */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            backgroundColor: alpha(theme.palette.common.black, 0.7),
            color: 'white',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.6rem',
          }}
        >
          <Eye size={10} />
          <Typography variant="caption" sx={{ color: 'white', fontSize: '0.6rem' }} component="span">
            {product.views || 0}
          </Typography>
        </Box>
        
        {/* Chatbot Button */}
        <Box 
          className="chatbot-button-container"
          sx={{ position: 'absolute', top: 4, right: 4 }}
          onClick={handleChatClick}
        >
          <ChatbotButton 
            productId={product.id}
            vendorId={product.vendor.id}
            productName={product.name}
          />
        </Box>
      </Box>

      {/* Price Only - Minimal display */}
      <CardContent sx={{ flexGrow: 1, p: 1, pt: 0.5 }}>
        <Box sx={{ mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            {/* For Rwanda users, show converted price as primary and original as secondary */}
            {effectiveUserCurrency === 'RWF' && convertedPrice !== null ? (
              <>
                {/* Converted price in RWF as primary (more prominent) */}
                <Typography 
                  variant="subtitle2" 
                  color="#B12704"
                  sx={{ 
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                  component="p"
                >
                  {isConverting 
                    ? `Converting...` 
                    : `${formatCurrencyAmount(convertedPrice, effectiveUserCurrency)}`}
                </Typography>
              </>
            ) : (
              <>
                {/* Converted price in user's currency - Make it more visible */}
                {convertedPrice !== null ? (
                  <Typography 
                    variant="subtitle2" 
                    color="#B12704"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                    component="p"
                  >
                    {isConverting 
                      ? `Converting...` 
                      : `${formatCurrencyAmount(convertedPrice, effectiveUserCurrency)}`}
                  </Typography>
                ) : product.currency !== effectiveUserCurrency ? (
                  <Typography 
                    variant="subtitle2" 
                    color="#B12704"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                    }}
                    component="p"
                  >
                    (Conversion failed)
                  </Typography>
                ) : (
                  // Show original price when currencies are the same
                  <Typography 
                    variant="subtitle2" 
                    color="#B12704"
                    sx={{ 
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                    component="p"
                  >
                    {product.currency === 'ETH' 
                      ? `${product.price} ETH` 
                      : product.currency === 'USD' 
                        ? `$${product.price.toFixed(2)}` 
                        : `${product.price} ${product.currency}`}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
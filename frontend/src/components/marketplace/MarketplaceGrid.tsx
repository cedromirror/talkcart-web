import React from 'react';
import { Grid, Box } from '@mui/material';
import ProductCard from '@/components/marketplace/ProductCard';

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

interface MarketplaceGridProps {
  products: Product[];
  loading?: boolean;
  userCurrency?: string;
}

const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  products,
  loading = false,
  userCurrency,
}) => {
  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={1}>
          {Array.from(new Array(12)).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              <ProductCard loading={true} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={1}>
        {products.map((product) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
            <ProductCard
              product={{
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                currency: product.currency,
                images: product.images,
                category: product.category,
                vendor: product.vendor,
                isNFT: product.isNFT,
                featured: product.featured ?? false,
                tags: product.tags,
                stock: product.stock ?? 0,
                rating: product.rating ?? 0,
                reviewCount: product.reviewCount ?? 0,
                sales: product.sales ?? 0,
                views: product.views ?? 0,
                availability: product.availability,
                createdAt: product.createdAt,
                discount: product.discount ?? 0,
                freeShipping: product.freeShipping ?? false,
                fastDelivery: product.fastDelivery ?? false,
                prime: product.prime ?? false,
              }}
              userCurrency={userCurrency}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MarketplaceGrid;
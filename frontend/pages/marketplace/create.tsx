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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowLeft, Upload, Plus, X } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { isAddress, getAddress } from 'ethers';

// Categories will be loaded from API

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'ETH', label: 'ETH' },
  { value: 'BTC', label: 'BTC' },
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT' },
];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  tags: string[];
  stock: string;
  isNFT: boolean;
  contractAddress: string;
  tokenId: string;
  images: any[];
}

const CreateProductPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    category: '',
    tags: [],
    stock: '1',
    isNFT: false,
    contractAddress: '',
    tokenId: '',
    images: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.marketplace.getCategories();
        if (res?.success) setCategories(res.data.categories || []);
      } catch (e) {
        console.warn('Failed to load categories', e);
        setCategories([]); // do not fallback to hardcoded
      }
    })();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=' + encodeURIComponent('/marketplace/create'));
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (field: keyof ProductForm) => (event: any) => {
    const value = event.target.value;
    setForm(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSwitchChange = (field: keyof ProductForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.checked }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreview(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to prevent memory leaks
    URL.revokeObjectURL(imagePreview[index]);

    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<any[]> => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    try {
      const response = await api.marketplace.uploadImages(imageFiles) as any;
      if (response.success) {
        return response.data.images;
      } else {
        throw new Error(response.error || 'Failed to upload images');
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic required fields
    if (!form.name.trim()) newErrors.name = 'Product name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.category) newErrors.category = 'Category is required';

    // Price: numeric, > 0, max 2 decimals for fiat, reasonable range
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      newErrors.price = 'Enter a valid price greater than 0';
    } else {
      if (['USD', 'USDC', 'USDT'].includes(form.currency)) {
        const decimalsOk = /^\d+(\.\d{1,2})?$/.test(String(form.price));
        if (!decimalsOk) newErrors.price = 'For USD/USDC/USDT, use up to 2 decimal places';
      }
      if (priceNum > 1_000_000_000) {
        newErrors.price = 'Price is too large';
      }
    }

    // Stock: integer >= 0 when not NFT
    if (!form.isNFT) {
      const stockNum = Number(form.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        newErrors.stock = 'Stock must be a whole number 0 or greater';
      }
      if (stockNum > 1_000_000) {
        newErrors.stock = 'Stock is too large';
      }
    }

    // NFT-specific: validate address checksum and tokenId numeric
    if (form.isNFT) {
      const addr = form.contractAddress.trim();
      if (!addr) {
        newErrors.contractAddress = 'Contract address is required for NFTs';
      } else if (!isAddress(addr)) {
        newErrors.contractAddress = 'Invalid Ethereum address (must be 0x-prefixed)';
      }

      const tokenIdStr = form.tokenId.trim();
      if (!tokenIdStr) {
        newErrors.tokenId = 'Token ID is required for NFTs';
      } else if (!/^\d+$/.test(tokenIdStr)) {
        newErrors.tokenId = 'Token ID must be a positive integer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Upload images first if any
      let uploadedImages: any[] = [];
      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages();
        if (imageFiles.length > 0 && uploadedImages.length === 0) {
          throw new Error('Failed to upload images');
        }
      }

      // Normalize/format values
      const normalizedPrice = Number(form.price);
      const normalizedStock = form.isNFT ? 1 : Number(form.stock);
      const checksumAddress = form.isNFT && isAddress(form.contractAddress.trim())
        ? getAddress(form.contractAddress.trim())
        : form.contractAddress.trim();

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: normalizedPrice,
        currency: form.currency,
        category: form.category,
        tags: form.tags,
        stock: normalizedStock,
        isNFT: form.isNFT,
        ...(form.isNFT && {
          contractAddress: checksumAddress,
          tokenId: form.tokenId.trim(),
        }),
        images: uploadedImages.map(img => ({
          url: img.secure_url || img.url,
          secure_url: img.secure_url,
          public_id: img.public_id,
          width: img.width,
          height: img.height
        })),
      };

      const response = await api.marketplace.createProduct(productData) as any;

      if (response.success) {
        toast.success('Product created successfully!');
        // Clean up preview URLs
        imagePreview.forEach(url => URL.revokeObjectURL(url));
        router.push(`/marketplace/${response.data.id}`);
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Selling disabled: do not gate by auth; page shows disabled message for everyone
  if (false && !isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">Please log in to create products</Typography>
        </Container>
      </Layout>
    );
  }

  // Selling disabled: replace form with info
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            onClick={handleBack}
            startIcon={<ArrowLeft size={20} />}
            sx={{ mb: 2 }}
          >
            Back to Marketplace
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Marketplace Selling Unavailable
          </Typography>
          <Typography variant="body1" color="text.secondary">
            User product listings are currently disabled. Please contact the administrators for partnerships.
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="info">
              Product creation is restricted. Only admin-posted products are shown in the marketplace.
            </Alert>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default CreateProductPage;
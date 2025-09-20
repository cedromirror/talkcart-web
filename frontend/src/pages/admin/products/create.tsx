import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Stack,
  Grid,
  IconButton,
  Paper,
  Chip,
  Avatar,
  Divider,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  X,
  Shield as SecurityIcon,
  CheckCircle as VerifiedIcon,
  Upload as UploadIcon,
  Image as ImageIcon,
  Camera,
  Smartphone,
  Monitor,
  Plus,
  ArrowBack,
  ArrowForward,
  Save,
  Preview
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Layout from '@/components/layout/Layout';
import api from '@/lib/api';
import { API_URL } from '@/config';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

function SortableThumb({ id, idx, src, onRemove }: { id: string; idx: number; src: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <Grid item xs={6} sm={4} md={3} ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Paper variant="outlined" sx={{ position: 'relative', p: 0.5, cursor: 'grab' }}>
        <img src={src} alt={`preview-${idx}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6 }} />
        <IconButton 
          size="small" 
          onClick={onRemove} 
          sx={{ 
            position: 'absolute', 
            top: 4, 
            right: 4, 
            bgcolor: 'rgba(0,0,0,0.7)', 
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
          }}
        >
          <X size={16} />
        </IconButton>
      </Paper>
    </Grid>
  );
}

const steps = ['Basic Info', 'Images & Media', 'Pricing & Category', 'Review & Publish'];

export default function AdminCreateProductPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Electronics');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [stock, setStock] = useState(1);
  const [images, setImages] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isNFT, setIsNFT] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);

  const categories = [
    'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
    'Books', 'Collectibles', 'Education', 'Accessories', 
    'Food & Beverages', 'Fitness', 'Other'
  ];

  const currencies = ['ETH', 'BTC', 'USD', 'USDC', 'USDT'];

  // Check if user is admin
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [user, router]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      const newFiles = [...files, ...selectedFiles].slice(0, 5); // Max 5 images
      setFiles(newFiles);
      
      // Create preview URLs
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const capturedFiles = Array.from(event.target.files || []);
    if (capturedFiles.length > 0) {
      const newFiles = [...files, ...capturedFiles].slice(0, 5);
      setFiles(newFiles);
      
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const uploadFilesIfAny = async (): Promise<{ url: string; secure_url: string }[]> => {
    const uploaded: { url: string; secure_url: string }[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_URL}/media/upload/single`, {
        method: 'POST',
        headers: typeof window !== 'undefined' ? { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } : undefined,
        body: form,
      });
      const data = await res.json();
      if (data?.success && data.data?.secure_url) {
        uploaded.push({ url: data.data.url || data.data.secure_url, secure_url: data.data.secure_url });
      }
    }
    return uploaded;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !price || !category) return;
    
    setSubmitting(true);
    try {
      const uploaded = await uploadFilesIfAny();
      const urlItems = images
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(url => ({ url, secure_url: url }));

      const payload: any = {
        name,
        description,
        price: Number(price),
        currency,
        category,
        tags,
        stock,
        images: [...uploaded, ...urlItems],
        isNFT,
        contractAddress: isNFT ? contractAddress : undefined,
        tokenId: isNFT ? tokenId : undefined,
        featured,
        isActive,
      };

      const res: any = await api.marketplace.createProduct(payload);
      if (res?.success) {
        router.push(`/admin/dashboard`);
      }
    } catch (err) {
      console.error('Create product failed', err);
      alert('Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return name.trim() && description.trim();
      case 1:
        return true; // Images are optional
      case 2:
        return price && category;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              Basic Product Information
            </Typography>
            <TextField
              label="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="Enter a descriptive product name"
              helperText="Choose a clear, searchable name for your product"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              multiline
              minRows={4}
              placeholder="Describe your product in detail. What makes it special?"
              helperText="Provide detailed information about features, benefits, and specifications"
            />
            <Box>
              <TextField
                label="Add Tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                fullWidth
                placeholder="Enter tags to help users find your product"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <Button onClick={addTag} disabled={!tagInput.trim() || tags.length >= 10}>
                      Add
                    </Button>
                  )
                }}
                helperText={`${tags.length}/10 tags added`}
              />
              {tags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              Product Images & Media
            </Typography>
            
            {/* URL Input */}
            <TextField
              label="Image URLs (Optional)"
              value={images}
              onChange={(e) => setImages(e.target.value)}
              fullWidth
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              helperText="Enter comma-separated URLs for existing images"
            />

            {/* File Upload Options */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 3,
                    textAlign: 'center',
                    bgcolor: 'primary.50',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'primary.100',
                      borderColor: 'primary.dark'
                    }
                  }}
                  component="label"
                >
                  <Stack spacing={2} alignItems="center">
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
                      <UploadIcon size={24} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                      Upload from Device
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Select images from your device
                    </Typography>
                    <Chip
                      label={`${files.length} files selected`}
                      color={files.length > 0 ? 'success' : 'default'}
                      variant="outlined"
                      icon={<Monitor size={16} />}
                    />
                  </Stack>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: 'secondary.main',
                    borderRadius: 3,
                    textAlign: 'center',
                    bgcolor: 'secondary.50',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'secondary.100',
                      borderColor: 'secondary.dark'
                    }
                  }}
                  component="label"
                >
                  <Stack spacing={2} alignItems="center">
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.main' }}>
                      <Camera size={24} />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600}>
                      Take Photo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use your device camera
                    </Typography>
                    <Chip
                      label="Mobile & Desktop"
                      color="secondary"
                      variant="outlined"
                      icon={<Smartphone size={16} />}
                    />
                  </Stack>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                  />
                </Paper>
              </Grid>
            </Grid>

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Image Previews (Drag to reorder)
                </Typography>
                <DndContext 
                  collisionDetection={closestCenter} 
                  onDragEnd={(e: DragEndEvent) => {
                    const { active, over } = e;
                    if (!over || active.id === over.id) return;
                    const oldIndex = Number(active.id);
                    const newIndex = Number(over.id);
                    setPreviewUrls((urls) => arrayMove(urls, oldIndex, newIndex));
                    setFiles((fs) => arrayMove(fs, oldIndex, newIndex));
                  }}
                >
                  <SortableContext items={previewUrls.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
                    <Grid container spacing={2}>
                      {previewUrls.map((src, idx) => (
                        <SortableThumb 
                          key={String(idx)} 
                          id={String(idx)} 
                          idx={idx} 
                          src={src} 
                          onRemove={() => {
                            const nf = files.filter((_, i) => i !== idx);
                            const np = previewUrls.filter((_, i) => i !== idx);
                            setFiles(nf);
                            setPreviewUrls(np);
                          }} 
                        />
                      ))}
                    </Grid>
                  </SortableContext>
                </DndContext>
              </Box>
            )}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              Pricing & Category
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  fullWidth
                  placeholder="0.00"
                  helperText="Set a competitive price for your product"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="currency">Currency</InputLabel>
                  <Select
                    labelId="currency"
                    label="Currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as string)}
                  >
                    {currencies.map((curr) => (
                      <MenuItem key={curr} value={curr}>
                        {curr} {curr === 'USD' ? '(US Dollar)' : curr === 'ETH' ? '(Ethereum)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="category">Category</InputLabel>
                  <Select
                    labelId="category"
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as string)}
                  >
                    {categories.map(c => (
                      <MenuItem key={c} value={c}>🏷️ {c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Stock Quantity"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  fullWidth
                  helperText="Number of items available"
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* NFT Section */}
            <Box>
              <FormControlLabel 
                control={
                  <Switch 
                    checked={isNFT} 
                    onChange={(e) => setIsNFT(e.target.checked)} 
                  />
                } 
                label="This is an NFT" 
              />
              {isNFT && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Alert severity="info">
                    NFT products require blockchain contract details
                  </Alert>
                  <TextField 
                    label="Contract Address" 
                    value={contractAddress} 
                    onChange={(e) => setContractAddress(e.target.value)} 
                    fullWidth 
                    placeholder="0x..."
                  />
                  <TextField 
                    label="Token ID" 
                    value={tokenId} 
                    onChange={(e) => setTokenId(e.target.value)} 
                    fullWidth 
                    placeholder="1"
                  />
                </Stack>
              )}
            </Box>

            {/* Admin Options */}
            <Divider />
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Admin Options
              </Typography>
              <Stack spacing={2}>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={featured} 
                      onChange={(e) => setFeatured(e.target.checked)} 
                    />
                  } 
                  label="Feature this product" 
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={isActive} 
                      onChange={(e) => setIsActive(e.target.checked)} 
                    />
                  } 
                  label="Activate immediately" 
                />
              </Stack>
            </Box>
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              Review & Publish
            </Typography>
            
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    {previewUrls.length > 0 ? (
                      <img 
                        src={previewUrls[0]} 
                        alt="Product preview" 
                        style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      <Box 
                        sx={{ 
                          width: '100%', 
                          height: 200, 
                          bgcolor: 'grey.100', 
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ImageIcon size={48} color="#ccc" />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Stack spacing={2}>
                      <Typography variant="h5" fontWeight={600}>
                        {name || 'Product Name'}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {description || 'Product description will appear here...'}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h4" color="primary.main" fontWeight={700}>
                          {price ? `${currency === 'USD' ? '$' : ''}${price} ${currency !== 'USD' ? currency : ''}` : 'Price not set'}
                        </Typography>
                        <Chip label={category} color="primary" variant="outlined" />
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={2}>
                        {featured && <Chip label="Featured" color="primary" size="small" />}
                        {isNFT && <Chip label="NFT" color="secondary" size="small" />}
                        <Chip 
                          label={isActive ? 'Active' : 'Draft'} 
                          color={isActive ? 'success' : 'default'} 
                          size="small" 
                        />
                      </Stack>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Alert severity="success">
              Your product is ready to be published! Review the details above and click "Create Product" to add it to the marketplace.
            </Alert>
          </Stack>
        );

      default:
        return null;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You don't have permission to access this page.
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout requireAuth>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Create New Product
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400}>
            Admin product creation with device integration
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
            <Chip
              icon={<SecurityIcon />}
              label="Admin Access"
              color="primary"
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<Camera />}
              label="Device Camera"
              color="secondary"
              variant="outlined"
              size="small"
            />
            <Chip
              icon={<Smartphone />}
              label="Mobile Friendly"
              color="success"
              variant="outlined"
              size="small"
            />
          </Stack>
        </Box>

        {/* Stepper */}
        <Card sx={{ mb: 4, borderRadius: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={onSubmit}>
              {renderStepContent(activeStep)}
              
              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  startIcon={<ArrowBack />}
                  variant="outlined"
                >
                  Back
                </Button>
                
                <Stack direction="row" spacing={2}>
                  {activeStep === steps.length - 1 && (
                    <Button
                      onClick={() => setPreviewDialog(true)}
                      startIcon={<Preview />}
                      variant="outlined"
                    >
                      Preview
                    </Button>
                  )}
                  
                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      disabled={submitting || !isStepValid(activeStep)}
                      startIcon={<Save />}
                      variant="contained"
                      size="large"
                    >
                      {submitting ? 'Creating...' : 'Create Product'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      disabled={!isStepValid(activeStep)}
                      endIcon={<ArrowForward />}
                      variant="contained"
                    >
                      Next
                    </Button>
                  )}
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Mobile FAB for camera */}
        {isMobile && activeStep === 1 && (
          <Fab
            color="secondary"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera />
          </Fab>
        )}
      </Container>
    </Layout>
  );
}
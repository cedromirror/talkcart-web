import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Stack,
  Grid,
  IconButton,
  Paper,
  Chip,
  Avatar,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  MobileStepper
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import {
  X,
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Save,
  Image as ImageIcon,
  Plus,
  Check,
  Smartphone,
  Monitor
} from 'lucide-react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api';
import { API_URL } from '@/config';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface MobileProductCreatorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (productId: string) => void;
  isAdmin?: boolean;
}

function SortableImageThumb({ id, idx, src, onRemove }: { id: string; idx: number; src: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners} sx={{ position: 'relative', minWidth: 120 }}>
      <Paper variant="outlined" sx={{ position: 'relative', p: 0.5, cursor: 'grab', borderRadius: 2 }}>
        <img 
          src={src} 
          alt={`preview-${idx}`} 
          style={{ 
            width: 120, 
            height: 120, 
            objectFit: 'cover', 
            borderRadius: 8,
            display: 'block'
          }} 
        />
        <IconButton 
          size="small" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          sx={{ 
            position: 'absolute', 
            top: 4, 
            right: 4, 
            bgcolor: 'rgba(0,0,0,0.7)', 
            color: 'white',
            width: 24,
            height: 24,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
          }}
        >
          <X size={12} />
        </IconButton>
      </Paper>
    </Box>
  );
}

const MobileProductCreator: React.FC<MobileProductCreatorProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  isAdmin = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('Electronics');
  const [stock, setStock] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isNFT, setIsNFT] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [featured, setFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    'Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 
    'Books', 'Collectibles', 'Education', 'Accessories', 
    'Food & Beverages', 'Fitness', 'Other'
  ];

  const currencies = ['ETH', 'BTC', 'USD', 'USDC', 'USDT'];
  const steps = ['Basic Info', 'Images', 'Pricing', 'Review'];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []) as File[];
    if (selectedFiles.length > 0) {
      const newFiles = [...files, ...selectedFiles].slice(0, 5);
      setFiles(newFiles);
      
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const capturedFiles = Array.from(event.target.files || []) as File[];
    if (capturedFiles.length > 0) {
      const newFiles = [...files, ...capturedFiles].slice(0, 5);
      setFiles(newFiles);
      
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const uploadFiles = async (): Promise<{ url: string; secure_url: string }[]> => {
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

  const handleSubmit = async () => {
    if (!name || !description || !price || !category) return;
    
    setSubmitting(true);
    try {
      const uploaded = await uploadFiles();

      const payload: any = {
        name,
        description,
        price: Number(price),
        currency,
        category,
        stock,
        images: uploaded,
        isNFT,
        contractAddress: isNFT ? contractAddress : undefined,
        tokenId: isNFT ? tokenId : undefined,
        ...(isAdmin && { featured, isActive }),
      };

      const res: any = isAdmin 
        ? await api.admin.products.createProduct(payload)
        : await api.marketplace.createProduct(payload);
      if (res?.success) {
        onSuccess?.(res.data.id || res.data._id);
        handleClose();
      }
    } catch (err) {
      console.error('Create product failed', err);
      alert('Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setActiveStep(0);
    setName('');
    setDescription('');
    setPrice('');
    setCurrency('USD');
    setCategory('Electronics');
    setStock(1);
    setFiles([]);
    setPreviewUrls([]);
    setIsNFT(false);
    setContractAddress('');
    setTokenId('');
    setFeatured(false);
    setIsActive(true);
    setSubmitting(false);
    onClose();
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
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
          <Stack spacing={3} sx={{ p: 2 }}>
            <TextField
              label="Product Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              placeholder="Enter product name"
              variant="outlined"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
              placeholder="Describe your product..."
              variant="outlined"
            />
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3} sx={{ p: 2 }}>
            <Typography variant="h6" textAlign="center">
              Add Product Images
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 2,
                    border: '2px dashed',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      bgcolor: 'primary.50'
                    }
                  }}
                  component="label"
                >
                  <Upload size={32} color={theme.palette.primary.main} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Upload
                  </Typography>
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
              
              <Grid item xs={6}>
                <Paper
                  sx={{
                    p: 2,
                    border: '2px dashed',
                    borderColor: 'secondary.main',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      bgcolor: 'secondary.50'
                    }
                  }}
                  component="label"
                >
                  <Camera size={32} color={theme.palette.secondary.main} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Camera
                  </Typography>
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

            {previewUrls.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Images ({previewUrls.length}/5)
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
                  <SortableContext items={previewUrls.map((_, i) => String(i))} strategy={horizontalListSortingStrategy}>
                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                      {previewUrls.map((src, idx) => (
                        <SortableImageThumb 
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
                    </Box>
                  </SortableContext>
                </DndContext>
              </Box>
            )}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3} sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label="Price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  fullWidth
                  placeholder="0.00"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as string)}
                    label="Currency"
                  >
                    {currencies.map((curr) => (
                      <MenuItem key={curr} value={curr}>
                        {curr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as string)}
                label="Category"
              >
                {categories.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Stock Quantity"
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              fullWidth
              inputProps={{ min: 0 }}
            />

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
              <Stack spacing={2}>
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
                />
              </Stack>
            )}

            {isAdmin && (
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
            )}
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3} sx={{ p: 2 }}>
            <Typography variant="h6" textAlign="center">
              Review Your Product
            </Typography>
            
            <Card variant="outlined">
              <CardContent>
                {previewUrls.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <img 
                      src={previewUrls[0]} 
                      alt="Product preview" 
                      style={{ 
                        width: '100%', 
                        height: 200, 
                        objectFit: 'cover', 
                        borderRadius: 8 
                      }}
                    />
                  </Box>
                )}
                
                <Typography variant="h6" gutterBottom>
                  {name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {description}
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight={600} gutterBottom>
                  {currency === 'USD' ? '$' : ''}{price} {currency !== 'USD' ? currency : ''}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={category} size="small" />
                  {isNFT && <Chip label="NFT" color="secondary" size="small" />}
                  {featured && <Chip label="Featured" color="primary" size="small" />}
                </Stack>
              </CardContent>
            </Card>

            <Alert severity="success">
              Ready to create your product!
            </Alert>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      fullScreen={isMobile}
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <X />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Create Product
          </Typography>
          {activeStep === steps.length - 1 && (
            <Button 
              color="inherit" 
              onClick={handleSubmit}
              disabled={submitting || !isStepValid(activeStep)}
              startIcon={<Save />}
            >
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <DialogContent sx={{ p: 0 }}>
        {isMobile ? (
          <MobileStepper
            variant="progress"
            steps={steps.length}
            position="static"
            activeStep={activeStep}
            sx={{ flexGrow: 1 }}
            nextButton={
              <Button
                size="small"
                onClick={handleNext}
                disabled={activeStep === steps.length - 1 || !isStepValid(activeStep)}
              >
                Next
                <ChevronRight />
              </Button>
            }
            backButton={
              <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
                <ChevronLeft />
                Back
              </Button>
            }
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>

      {!isMobile && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleBack} disabled={activeStep === 0}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isStepValid(activeStep)}
              variant="contained"
              startIcon={<Save />}
            >
              {submitting ? 'Creating...' : 'Create Product'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isStepValid(activeStep)}
              variant="contained"
            >
              Next
            </Button>
          )}
        </DialogActions>
      )}

      {/* Mobile Camera FAB */}
      {isMobile && activeStep === 1 && (
        <Fab
          color="secondary"
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera />
        </Fab>
      )}
    </Dialog>
  );
};

export default MobileProductCreator;
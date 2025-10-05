import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Truck,
  MapPin,
  Phone,
  Mail,
  Navigation,
  FileText,
  Download,
  Share2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface OrderItem {
  productId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

const OrderDetailsPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id } = router.query; // Changed from orderId to id
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (id) {
      fetchOrderDetails(id as string); // Changed from orderId to id
    }
  }, [user, id, router]); // Changed from orderId to id

  const fetchOrderDetails = async (orderId: string) => { // Parameter name unchanged for internal consistency
    try {
      setLoading(true);
      const response: any = await api.orders.getOrder(orderId);
      
      if (response.success) {
        setOrder(response.data);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'primary';
      case 'processing':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} />;
      case 'shipped':
        return <Truck size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  // Order status steps for progress visualization
  const getOrderStatusSteps = () => {
    const steps = [
      { label: 'Order Placed', status: 'pending', icon: <CheckCircle size={16} /> },
      { label: 'Processing', status: 'processing', icon: <Clock size={16} /> },
      { label: 'Shipped', status: 'shipped', icon: <Truck size={16} /> },
      { label: 'Delivered', status: 'delivered', icon: <CheckCircle size={16} /> },
    ];

    // Determine current step based on order status
    const currentStepIndex = steps.findIndex(step => step.status === order?.status);
    
    return { steps, currentStepIndex };
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading order details...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => router.push('/marketplace/dashboard')}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Order not found
          </Alert>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => router.push('/marketplace/dashboard')}
            variant="outlined"
          >
            Back to Dashboard
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => router.push('/marketplace/dashboard')} sx={{ mr: 2 }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Order Details
          </Typography>
          <Chip
            icon={getStatusIcon(order.status)}
            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            size="small"
            color={getStatusColor(order.status) as any}
            sx={{ ml: 2 }}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Order Items */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Order Items"
                subheader={`Order #${order.id}`}
                sx={{ pb: 1 }}
              />
              <CardContent>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 1, overflow: 'hidden' }}>
                  {order.items.map((item, index) => (
                    <React.Fragment key={item.productId}>
                      <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={item.image}
                            sx={{ width: 60, height: 60 }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/marketplace/${item.productId}`)}
                            >
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" color="text.secondary">
                                {item.description}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Category: {item.category}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Qty: {item.quantity}
                                </Typography>
                              </Box>
                            </React.Fragment>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="h6" fontWeight={600}>
                              {formatPrice(item.price * item.quantity, order.currency)}
                            </Typography>
                            <Tooltip title="View product">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/marketplace/${item.productId}`)}
                              >
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < order.items.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Typography variant="h5" fontWeight={700}>
                    Total: {formatPrice(order.totalAmount, order.currency)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Order Progress */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Order Progress"
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Stepper activeStep={getOrderStatusSteps().currentStepIndex} orientation="vertical">
                  {getOrderStatusSteps().steps.map((step, index) => (
                    <Step key={step.label} completed={index <= getOrderStatusSteps().currentStepIndex}>
                      <StepLabel 
                        StepIconComponent={() => step.icon}
                        sx={{ 
                          '& .MuiStepLabel-label': { 
                            fontWeight: index <= getOrderStatusSteps().currentStepIndex ? 600 : 400 
                          } 
                        }}
                      >
                        {step.label}
                      </StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.status === order.status ? `Updated: ${formatDate(order.updatedAt)}` : ''}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader
                title="Shipping Information"
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), mr: 2, mt: 0.5 }}>
                    <MapPin size={20} color={theme.palette.primary.main} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      Delivery Address
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.country}
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), mr: 2 }}>
                    <Phone size={20} color={theme.palette.info.main} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Contact
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.phone}
                    </Typography>
                  </Box>
                </Box>

                {order.trackingNumber && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), mr: 2 }}>
                        <Navigation size={20} color={theme.palette.success.main} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Tracking Information
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tracking Number: {order.trackingNumber}
                        </Typography>
                        {order.estimatedDelivery && (
                          <Typography variant="body2" color="text.secondary">
                            Estimated Delivery: {formatDate(order.estimatedDelivery)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Order Summary */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Order Summary"
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Order ID
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    #{order.id}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(order.createdAt)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(order.status)}
                    label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    size="small"
                    color={getStatusColor(order.status) as any}
                  />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {order.paymentMethod}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Chip
                    label={order.paymentStatus}
                    size="small"
                    color={order.paymentStatus === 'completed' ? 'success' : 'warning'}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader
                title="Actions"
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1 }}
                  disabled={order.status === 'cancelled' || order.status === 'delivered'}
                  startIcon={<Navigation size={16} />}
                  onClick={async () => {
                    try {
                      const response: any = await api.orders.getTrackingInfo(order.id);
                      if (response.success) {
                        // In a real implementation, you would display the tracking information
                        // For now, we'll just show a success message
                        alert(`Tracking information for order ${order.id}:\nTracking Number: ${response.data.trackingNumber}\nCarrier: ${response.data.carrier}\nStatus: ${response.data.status}`);
                      }
                    } catch (err: any) {
                      console.error('Failed to get tracking info:', err);
                      alert('Failed to get tracking information');
                    }
                  }}
                >
                  Track Order
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1 }}
                  disabled={order.status !== 'pending' && order.status !== 'processing'}
                  onClick={async () => {
                    try {
                      const response: any = await api.orders.cancelOrder(order.id);
                      if (response.success) {
                        // Refresh order details
                        fetchOrderDetails(order.id);
                      }
                    } catch (err: any) {
                      console.error('Failed to cancel order:', err);
                    }
                  }}
                  startIcon={<XCircle size={16} />}
                >
                  Cancel Order
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1 }}
                  startIcon={<Download size={16} />}
                >
                  Download Invoice
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push('/marketplace')}
                  startIcon={<Eye size={16} />}
                >
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default OrderDetailsPage;
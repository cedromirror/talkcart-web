import React, { useState } from 'react';
import { NextPage } from 'next';
import {
    Container,
    Typography,
    Box,
    Button,
    Alert,
    CircularProgress,
    Paper,
    Stack
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { api } from '@/lib/api';

const PaymentTest: NextPage = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const testPaymentIntent = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await api.payments.createIntent({
                amount: 25,
                currency: 'usd',
                items: [{
                    name: 'Test Product',
                    price: 25,
                    quantity: 1
                }],
                metadata: {
                    test: true,
                    source: 'payment-test-page'
                }
            });

            if (response.success) {
                setResult(response.data);
            } else {
                setError(response.message || 'Failed to create payment intent');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Payment System Test
                </Typography>

                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Test Stripe Payment Intent Creation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This test verifies that the backend payment endpoint is working correctly
                        and can create Stripe PaymentIntents with automatic payment methods enabled.
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={testPaymentIntent}
                        disabled={loading}
                        sx={{ mb: 2 }}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Test Payment Intent'}
                    </Button>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {result && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Payment Intent created successfully!
                        </Alert>
                    )}

                    {result && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Payment Intent Details:
                            </Typography>
                            <Stack spacing={1}>
                                <Typography><strong>Client Secret:</strong> {result.clientSecret?.substring(0, 50)}...</Typography>
                                <Typography><strong>Payment Intent ID:</strong> {result.id}</Typography>
                                <Typography><strong>Amount:</strong> ${(result.amountCents / 100).toFixed(2)}</Typography>
                                <Typography><strong>Currency:</strong> {result.currency?.toUpperCase()}</Typography>
                            </Stack>
                        </Box>
                    )}
                </Paper>

                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        What this test verifies:
                    </Typography>
                    <Stack spacing={1}>
                        <Typography>• Backend Stripe configuration is working</Typography>
                        <Typography>• Payment Intent creation endpoint responds correctly</Typography>
                        <Typography>• Automatic payment methods are enabled</Typography>
                        <Typography>• API communication between frontend and backend works</Typography>
                    </Stack>
                </Paper>
            </Container>
        </Layout>
    );
};

export default PaymentTest;
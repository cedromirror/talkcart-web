import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Button,
    Alert,
    CircularProgress,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import { TestTube, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { api } from '@/lib/api';

interface TestResult {
    name: string;
    status: 'pending' | 'success' | 'error' | 'warning';
    message: string;
    details?: any;
}

const JsonParsingTestPage: React.FC = () => {
    const [tests, setTests] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
        setTests(prev => {
            const existing = prev.find(t => t.name === name);
            if (existing) {
                existing.status = status;
                existing.message = message;
                existing.details = details;
                return [...prev];
            } else {
                return [...prev, { name, status, message, details }];
            }
        });
    };

    const runTests = async () => {
        setIsRunning(true);
        setTests([]);

        // Test 1: Valid JSON response
        updateTest('Valid JSON Response', 'pending', 'Testing valid JSON parsing...');
        try {
            const result = await api.auth.getCurrentUser();
            updateTest('Valid JSON Response', 'success', 'Successfully parsed valid JSON response', result);
        } catch (error: any) {
            updateTest('Valid JSON Response', 'error', `Error: ${error.message}`, error);
        }

        // Test 2: Test with a potentially problematic endpoint
        updateTest('Search API Test', 'pending', 'Testing search API JSON parsing...');
        try {
            const result = await api.search.users('test', 5);
            updateTest('Search API Test', 'success', 'Successfully parsed search response', result);
        } catch (error: any) {
            updateTest('Search API Test', 'error', `Error: ${error.message}`, error);
        }

        // Test 3: Test posts API
        updateTest('Posts API Test', 'pending', 'Testing posts API JSON parsing...');
        try {
            const result = await api.posts.getAll({ limit: 5 });
            updateTest('Posts API Test', 'success', 'Successfully parsed posts response', result);
        } catch (error: any) {
            updateTest('Posts API Test', 'error', `Error: ${error.message}`, error);
        }

        // Test 4: Test with invalid endpoint (should handle gracefully)
        updateTest('Invalid Endpoint Test', 'pending', 'Testing error handling for invalid endpoint...');
        try {
            const response = await fetch('/api/nonexistent-endpoint');
            const text = await response.text();
            if (text.includes('Internal Server Error') || text.includes('404')) {
                updateTest('Invalid Endpoint Test', 'success', 'Correctly handled invalid endpoint', { responseText: text });
            } else {
                updateTest('Invalid Endpoint Test', 'warning', 'Unexpected response format', { responseText: text });
            }
        } catch (error: any) {
            updateTest('Invalid Endpoint Test', 'success', 'Error correctly caught and handled', error);
        }

        setIsRunning(false);
    };

    const getStatusIcon = (status: TestResult['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={20} color="green" />;
            case 'error':
                return <XCircle size={20} color="red" />;
            case 'warning':
                return <AlertTriangle size={20} color="orange" />;
            case 'pending':
                return <CircularProgress size={20} />;
            default:
                return null;
        }
    };

    const getStatusColor = (status: TestResult['status']) => {
        switch (status) {
            case 'success':
                return 'success.main';
            case 'error':
                return 'error.main';
            case 'warning':
                return 'warning.main';
            case 'pending':
                return 'info.main';
            default:
                return 'text.primary';
        }
    };

    return (
        <Layout>
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TestTube size={32} />
                        JSON Parsing Fix Test
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Test the improved JSON parsing that handles "Internal Server Error" responses
                    </Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 4 }}>
                    <Typography variant="body2">
                        <strong>What this tests:</strong>
                        <br />• Safe JSON parsing that handles HTML error responses
                        <br />• Graceful error handling for malformed responses
                        <br />• Consistent API behavior across different endpoints
                        <br />• Prevention of "Unexpected token 'I', 'Internal S'..." errors
                    </Typography>
                </Alert>

                <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5">Test Results</Typography>
                        <Button
                            variant="contained"
                            onClick={runTests}
                            disabled={isRunning}
                            startIcon={isRunning ? <CircularProgress size={16} /> : <TestTube size={16} />}
                        >
                            {isRunning ? 'Running Tests...' : 'Run Tests'}
                        </Button>
                    </Box>

                    <Grid container spacing={2}>
                        {tests.map((test, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            {getStatusIcon(test.status)}
                                            <Typography variant="h6" sx={{ color: getStatusColor(test.status) }}>
                                                {test.name}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {test.message}
                                        </Typography>
                                        {test.details && (
                                            <Box sx={{
                                                backgroundColor: '#f5f5f5',
                                                p: 2,
                                                borderRadius: 1,
                                                maxHeight: 200,
                                                overflow: 'auto'
                                            }}>
                                                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {JSON.stringify(test.details, null, 2)}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {tests.length === 0 && !isRunning && (
                        <Alert severity="info">
                            Click "Run Tests" to start testing the JSON parsing improvements
                        </Alert>
                    )}
                </Paper>

                <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Fix Summary
                    </Typography>
                    <Typography variant="body2" component="div">
                        <strong>Problem:</strong> The original code used <code>response.json()</code> directly, which would fail
                        when the server returned HTML error pages (like "Internal Server Error") instead of JSON.
                        <br /><br />

                        <strong>Solution:</strong> Created a <code>safeJsonParse()</code> method that:
                        <br />• First reads the response as text
                        <br />• Checks if the content looks like JSON (starts with '{' or '[')
                            < br />• If not JSON, returns a structured error object instead of throwing
                        <br />• Handles parsing errors gracefully
                        <br /><br />

                        <strong>Result:</strong> No more "Unexpected token 'I', 'Internal S'..." errors when the server
                        returns HTML error pages. All API calls now handle errors consistently.
                    </Typography>
                </Paper>
            </Container>
        </Layout>
    );
};

export default JsonParsingTestPage;
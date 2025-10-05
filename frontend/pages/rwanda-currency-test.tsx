import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Button, Grid, Alert } from '@mui/material';
import { getUserCurrency } from '@/utils/userCurrencyDetector';
import { convertUsdToCurrency, formatCurrencyAmount } from '@/utils/currencyConverter';
import Layout from '@/components/layout/Layout';

const RwandaCurrencyTestPage: React.FC = () => {
  const [detectedCurrency, setDetectedCurrency] = useState<string>('Detecting...');
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [convertedAmount, setConvertedAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testAmount = 12.00; // $12.00 USD

  const detectCurrency = async () => {
    try {
      setError('');
      setDetectedCurrency('Detecting...');
      
      // Clear cache first to ensure fresh detection
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('userCurrency');
      }
      
      const currency = await getUserCurrency();
      setDetectedCurrency(currency);
      
      // Try to get IP info
      try {
        const response = await fetch('http://ip-api.com/json/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        const data = await response.json();
        setIpInfo(data);
      } catch (ipError) {
        console.error('Failed to fetch IP info:', ipError);
      }
      
      // Convert test amount
      try {
        const converted = await convertUsdToCurrency(testAmount, currency);
        const formatted = formatCurrencyAmount(converted, currency);
        setConvertedAmount(formatted);
      } catch (convertError) {
        console.error('Conversion error:', convertError);
        setConvertedAmount('Conversion failed');
      }
    } catch (err) {
      console.error('Currency detection error:', err);
      setError('Failed to detect currency: ' + (err as Error).message);
      setDetectedCurrency('Detection failed');
    }
  };

  useEffect(() => {
    detectCurrency();
  }, []);

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Rwanda Currency Detection Test
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6">Currency Detection for Rwanda</Typography>
          <Typography variant="body1" paragraph>
            This page tests if the system correctly detects users from Rwanda and applies the RWF currency.
          </Typography>
          <ul>
            <li>If you are in Rwanda, your currency should be detected as <strong>RWF</strong></li>
            <li>If detected correctly, $12.00 USD should convert to the equivalent in RWF</li>
            <li>If not detected correctly, you'll see USD as the currency</li>
          </ul>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detected Currency
                </Typography>
                <Typography variant="body1" paragraph>
                  Your detected currency: <strong>{detectedCurrency}</strong>
                </Typography>
                
                <Button 
                  variant="contained" 
                  onClick={detectCurrency}
                  sx={{ mt: 2 }}
                >
                  Refresh Detection
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Currency Conversion Test
                </Typography>
                <Typography variant="body1" paragraph>
                  Converting <strong>${testAmount.toFixed(2)} USD</strong>
                </Typography>
                
                {convertedAmount && (
                  <Box>
                    <Typography variant="body1">
                      Converted Amount: <strong>{convertedAmount}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (Equivalent to ${testAmount.toFixed(2)} USD)
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {ipInfo && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                IP Geolocation Info
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Country:</strong> {ipInfo.country || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Country Code:</strong> {ipInfo.countryCode || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Region:</strong> {ipInfo.regionName || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>City:</strong> {ipInfo.city || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ISP:</strong> {ipInfo.isp || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>IP:</strong> {ipInfo.query || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        
        <Box sx={{ mt: 4, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="h6">Troubleshooting</Typography>
          <Typography variant="body1" paragraph>
            If your currency is not detected as RWF:
          </Typography>
          <ul>
            <li>Ensure your IP address is correctly showing Rwanda in the IP info panel</li>
            <li>Try using a VPN service set to Rwanda to test</li>
            <li>Clear your browser cache and refresh the page</li>
            <li>Check if any browser extensions are blocking geolocation requests</li>
            <li>The system falls back to browser locale detection if IP detection fails</li>
          </ul>
        </Box>
      </Container>
    </Layout>
  );
};

export default RwandaCurrencyTestPage;
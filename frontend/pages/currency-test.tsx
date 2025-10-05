import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Button, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import { convertUsdToCurrency, formatCurrencyAmount } from '@/utils/currencyConverter';
import { getUserCurrency } from '@/utils/userCurrencyDetector';
import Layout from '@/components/layout/Layout';

const CurrencyTestPage: React.FC = () => {
  const [detectedCurrency, setDetectedCurrency] = useState<string>('Detecting...');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KES');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [formattedAmount, setFormattedAmount] = useState<string>('');

  const testAmount = 12.00; // $12.00 USD

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'KES', name: 'Kenyan Shilling' },
    { code: 'UGX', name: 'Ugandan Shilling' },
    { code: 'TZS', name: 'Tanzanian Shilling' },
    { code: 'RWF', name: 'Rwandan Franc' },
    { code: 'NGN', name: 'Nigerian Naira' },
  ];

  const detectUserCurrency = async () => {
    try {
      const currency = await getUserCurrency();
      setDetectedCurrency(currency);
    } catch (error) {
      setDetectedCurrency('Error detecting currency');
    }
  };

  useEffect(() => {
    detectUserCurrency();
  }, []);

  const convertCurrency = async () => {
    try {
      const result = await convertUsdToCurrency(testAmount, selectedCurrency);
      setConvertedAmount(result);
      const formatted = formatCurrencyAmount(result, selectedCurrency);
      setFormattedAmount(formatted);
    } catch (error) {
      setConvertedAmount(null);
      setFormattedAmount('Conversion failed');
    }
  };

  useEffect(() => {
    convertCurrency();
  }, [selectedCurrency]);

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Currency Conversion Test
        </Typography>
        
        <Box sx={{ mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6">How Currency Conversion Works</Typography>
          <Typography variant="body1" paragraph>
            This page demonstrates how the currency conversion system works in TalkCart:
          </Typography>
          <ul>
            <li>Products are priced in their original currency (e.g., USD)</li>
            <li>The system detects your location and preferred currency</li>
            <li>Prices are automatically converted to your local currency</li>
            <li>Both original and converted prices are displayed</li>
          </ul>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detected Currency
                </Typography>
                <Typography variant="body1">
                  Your detected currency: <strong>{detectedCurrency}</strong>
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={detectUserCurrency}
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
                  Test Conversion
                </Typography>
                <Typography variant="body1" paragraph>
                  Testing conversion of <strong>${testAmount.toFixed(2)} USD</strong>
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Target Currency</InputLabel>
                  <Select
                    value={selectedCurrency}
                    label="Select Target Currency"
                    onChange={(e) => setSelectedCurrency(e.target.value as string)}
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {convertedAmount !== null && (
                  <Box>
                    <Typography variant="body1">
                      Converted Amount: <strong>{formattedAmount}</strong>
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
        
        <Box sx={{ mt: 4, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="h6">Why You Might Not See Conversions</Typography>
          <ul>
            <li>If a product is priced in USD and your detected currency is also USD, no conversion is shown</li>
            <li>If a product is priced in ETH, it will always show conversion regardless of your currency</li>
            <li>Try changing the "Manual Currency" in the debug panel on the marketplace page to test different conversions</li>
          </ul>
        </Box>
      </Container>
    </Layout>
  );
};

export default CurrencyTestPage;
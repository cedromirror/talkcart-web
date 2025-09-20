import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  TextField,
  Button,
  Chip,
  Rating,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  IconButton,
} from '@mui/material';
import { 
  ChevronDown, 
  Filter as FilterList, 
  X as Clear, 
  TrendingUp, 
  Star, 
  Verified, 
  Shield 
} from 'lucide-react'; // Use package root to avoid ESM/CJS issues

interface AdvancedFiltersProps {
  onFiltersChange: (filters: MarketplaceFilters) => void;
  categories: string[];
  isLoading?: boolean;
}

export interface MarketplaceFilters {
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  rating: number;
  verified: boolean;
  nftOnly: boolean;
  freeShipping: boolean;
  location: string;
  sortBy: string;
  availability: string;
  tags: string[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFiltersChange,
  categories,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    categories: [],
    priceRange: [0, 1000],
    condition: [],
    rating: 0,
    verified: false,
    nftOnly: false,
    freeShipping: false,
    location: '',
    sortBy: 'relevance',
    availability: 'all',
    tags: [],
  });

  const [expanded, setExpanded] = useState<string | false>('categories');

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded ? panel : false);
  };

  const updateFilters = (newFilters: Partial<MarketplaceFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const handleConditionChange = (condition: string) => {
    const newConditions = filters.condition.includes(condition)
      ? filters.condition.filter(c => c !== condition)
      : [...filters.condition, condition];
    updateFilters({ condition: newConditions });
  };

  const clearAllFilters = () => {
    const clearedFilters: MarketplaceFilters = {
      categories: [],
      priceRange: [0, 1000],
      condition: [],
      rating: 0,
      verified: false,
      nftOnly: false,
      freeShipping: false,
      location: '',
      sortBy: 'relevance',
      availability: 'all',
      tags: [],
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
    if (filters.condition.length > 0) count++;
    if (filters.rating > 0) count++;
    if (filters.verified) count++;
    if (filters.nftOnly) count++;
    if (filters.freeShipping) count++;
    if (filters.location) count++;
    if (filters.availability !== 'all') count++;
    if (filters.tags.length > 0) count++;
    return count;
  };

  const conditions = ['New', 'Like New', 'Good', 'Fair', 'Digital'];
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'trending', label: 'Trending' },
  ];

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterList size={20} />
            <Typography variant="h6" fontWeight={600}>
              Filters
            </Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip
                label={getActiveFiltersCount()}
                size="small"
                color="primary"
                variant="filled"
              />
            )}
          </Box>
          <IconButton size="small" onClick={clearAllFilters}>
            <Clear size={16} />
          </IconButton>
        </Box>

        {/* Sort By */}
        <Box mb={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={filters.sortBy}
              label="Sort By"
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Categories */}
        <Accordion
          expanded={expanded === 'categories'}
          onChange={handleAccordionChange('categories')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Categories
              {filters.categories.length > 0 && (
                <Chip
                  label={filters.categories.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {categories.map((category) => (
                <FormControlLabel
                  key={category}
                  control={
                    <Checkbox
                      checked={filters.categories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      size="small"
                    />
                  }
                  label={category}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Price Range */}
        <Accordion
          expanded={expanded === 'price'}
          onChange={handleAccordionChange('price')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Price Range
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box px={1}>
              <Slider
                value={filters.priceRange}
                onChange={(_, newValue) =>
                  updateFilters({ priceRange: newValue as [number, number] })
                }
                valueLabelDisplay="auto"
                min={0}
                max={1000}
                step={10}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 250, label: '$250' },
                  { value: 500, label: '$500' },
                  { value: 750, label: '$750' },
                  { value: 1000, label: '$1000+' },
                ]}
              />
              <Box display="flex" gap={2} mt={2}>
                <TextField
                  size="small"
                  label="Min"
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) =>
                    updateFilters({
                      priceRange: [parseInt(e.target.value) || 0, filters.priceRange[1]],
                    })
                  }
                />
                <TextField
                  size="small"
                  label="Max"
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    updateFilters({
                      priceRange: [filters.priceRange[0], parseInt(e.target.value) || 1000],
                    })
                  }
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Condition */}
        <Accordion
          expanded={expanded === 'condition'}
          onChange={handleAccordionChange('condition')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Condition
              {filters.condition.length > 0 && (
                <Chip
                  label={filters.condition.length}
                  size="small"
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {conditions.map((condition) => (
                <FormControlLabel
                  key={condition}
                  control={
                    <Checkbox
                      checked={filters.condition.includes(condition)}
                      onChange={() => handleConditionChange(condition)}
                      size="small"
                    />
                  }
                  label={condition}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Rating */}
        <Accordion
          expanded={expanded === 'rating'}
          onChange={handleAccordionChange('rating')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Minimum Rating
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" alignItems="center" gap={1}>
              <Rating
                value={filters.rating}
                onChange={(_, newValue) => updateFilters({ rating: newValue || 0 })}
                precision={1}
              />
              <Typography variant="body2" color="text.secondary">
                & up
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Special Features */}
        <Accordion
          expanded={expanded === 'features'}
          onChange={handleAccordionChange('features')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Special Features
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.verified}
                    onChange={(e) => updateFilters({ verified: e.target.checked })}
                    size="small"
                    icon={<Verified size={16} />}
                    checkedIcon={<Verified size={16} />}
                  />
                }
                label="Verified Sellers Only"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.nftOnly}
                    onChange={(e) => updateFilters({ nftOnly: e.target.checked })}
                    size="small"
                  />
                }
                label="NFTs Only"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.freeShipping}
                    onChange={(e) => updateFilters({ freeShipping: e.target.checked })}
                    size="small"
                  />
                }
                label="Free Shipping"
              />
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Availability */}
        <Accordion
          expanded={expanded === 'availability'}
          onChange={handleAccordionChange('availability')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Availability
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl fullWidth size="small">
              <Select
                value={filters.availability}
                onChange={(e) => updateFilters({ availability: e.target.value })}
              >
                <MenuItem value="all">All Items</MenuItem>
                <MenuItem value="in_stock">In Stock</MenuItem>
                <MenuItem value="limited">Limited Quantity</MenuItem>
                <MenuItem value="pre_order">Pre-Order</MenuItem>
                <MenuItem value="auction">Auction</MenuItem>
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>

        {/* Location */}
        <Accordion
          expanded={expanded === 'location'}
          onChange={handleAccordionChange('location')}
        >
          <AccordionSummary expandIcon={<ChevronDown />}>
            <Typography variant="subtitle2" fontWeight={600}>
              Location
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter city, state, or country"
              value={filters.location}
              onChange={(e) => updateFilters({ location: e.target.value })}
            />
          </AccordionDetails>
        </Accordion>

        {/* Active Filters Summary */}
        {getActiveFiltersCount() > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Active Filters ({getActiveFiltersCount()})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {filters.categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  size="small"
                  onDelete={() => handleCategoryChange(category)}
                  color="primary"
                  variant="outlined"
                />
              ))}
              {filters.condition.map((condition) => (
                <Chip
                  key={condition}
                  label={condition}
                  size="small"
                  onDelete={() => handleConditionChange(condition)}
                  color="primary"
                  variant="outlined"
                />
              ))}
              {filters.rating > 0 && (
                <Chip
                  label={`${filters.rating}+ Stars`}
                  size="small"
                  onDelete={() => updateFilters({ rating: 0 })}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.verified && (
                <Chip
                  label="Verified"
                  size="small"
                  onDelete={() => updateFilters({ verified: false })}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.nftOnly && (
                <Chip
                  label="NFT Only"
                  size="small"
                  onDelete={() => updateFilters({ nftOnly: false })}
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.freeShipping && (
                <Chip
                  label="Free Shipping"
                  size="small"
                  onDelete={() => updateFilters({ freeShipping: false })}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;
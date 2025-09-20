import React from 'react';
import { Box, Container, Skeleton, Stack, Card, CardContent } from '@mui/material';

export const FeedLoadingFallback: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header skeleton */}
        <Box>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="40%" height={24} />
        </Box>

        {/* Post skeletons */}
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Stack spacing={2}>
                {/* User info skeleton */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box>
                    <Skeleton variant="text" width={120} height={20} />
                    <Skeleton variant="text" width={80} height={16} />
                  </Box>
                </Stack>

                {/* Content skeleton */}
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="80%" height={20} />
                <Skeleton variant="rectangular" width="100%" height={200} />

                {/* Actions skeleton */}
                <Stack direction="row" spacing={2}>
                  <Skeleton variant="text" width={60} height={32} />
                  <Skeleton variant="text" width={60} height={32} />
                  <Skeleton variant="text" width={60} height={32} />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
};
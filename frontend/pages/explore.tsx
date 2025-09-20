import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Container, Typography, Paper, useTheme, Grid, TextField, InputAdornment } from '@mui/material';
import { Globe, TrendingUp, Clock, ThumbsUp, Search } from 'lucide-react';
import { PublicFeed } from '@/components/social/PublicFeed';
import WhoToFollow from '@/components/social/WhoToFollow';
import { useRouter } from 'next/router';
import useDebounce from '@/hooks/useDebounce';

/**
 * Explore page - Shows public content that everyone can see
 * No authentication required
 */
const ExplorePage: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();

  // Debounced search persisted in URL/localStorage
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 300);

  useEffect(() => {
    const fromUrl = typeof router.query.q === 'string' ? router.query.q : '';
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('explore:q') || '' : '';
    const initial = fromUrl || fromStorage;
    if (initial) setSearchInput(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem('explore:q', searchQuery || ''); } catch {}
    }
    const q = { ...router.query } as Record<string, any>;
    if (searchQuery) q.q = searchQuery; else delete q.q;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSignUp = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  return (
    <>
      <Head>
        <title>Explore Public Posts - TalkCart</title>
        <meta 
          name="description" 
          content="Discover amazing public content from the TalkCart community. See what people are sharing and talking about." 
        />
        <meta name="keywords" content="social media, public posts, community, discover, trending" />
        <meta property="og:title" content="Explore Public Posts - TalkCart" />
        <meta property="og:description" content="Discover amazing public content from the TalkCart community." />
        <meta property="og:type" content="website" />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
            borderRadius: 0,
            py: 4,
            mb: 3,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Container maxWidth="md">
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Globe size={32} color={theme.palette.primary.main} />
              <Typography variant="h3" fontWeight={700}>
                Explore
              </Typography>
            </Box>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Discover Public Content from Our Community
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Browse through public posts, trending content, and popular discussions. 
              No account required - just explore and discover amazing content!
            </Typography>
          </Container>
        </Paper>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ pb: 4 }}>
          <Grid container spacing={3}>
            {/* Main Feed */}
            <Grid item xs={12} md={8}>
              {/* Public Feed with different sorting options */}
              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Clock size={20} />
                  Recent Posts
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search public posts..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <PublicFeed
                  showHeader={false}
                  maxPosts={10}
                  contentFilter="all"
                  sortBy="recent"
                  query={searchQuery}
                />
              </Box>

              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={20} />
                  Trending Now
                </Typography>
                <PublicFeed
                  showHeader={false}
                  maxPosts={8}
                  contentFilter="all"
                  sortBy="trending"
                  query={searchQuery}
                />
              </Box>

              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbsUp size={20} />
                  Most Popular
                </Typography>
                <PublicFeed
                  showHeader={false}
                  maxPosts={6}
                  contentFilter="all"
                  sortBy="popular"
                  query={searchQuery}
                />
              </Box>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 20 }}>
                <WhoToFollow limit={5} />
              </Box>
            </Grid>
          </Grid>

          {/* Call to Action */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Want to Join the Conversation?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your free account to start posting, commenting, and connecting with others.
            </Typography>
            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <button
                onClick={handleSignUp}
                style={{
                  background: theme.palette.primary.main,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.dark;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.main;
                }}
              >
                Create Account
              </button>
              <button
                onClick={handleLogin}
                style={{
                  background: 'transparent',
                  color: theme.palette.primary.main,
                  border: `2px solid ${theme.palette.primary.main}`,
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.main;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = theme.palette.primary.main;
                }}
              >
                Sign In
              </button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default ExplorePage;
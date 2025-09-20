import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  useTheme,
  alpha,
  Skeleton,
  Tooltip,
} from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { useRouter } from 'next/router';
import { getTrendingHashtags, TrendingHashtag } from '@/services/postsApi';

const TrendingTopics: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();

  const [topics, setTopics] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrendingHashtags(5);
      setTopics(data);
    } catch (e: any) {
      console.error('Failed to fetch trending hashtags', e);
      setError(e?.message || 'Failed to load trending topics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, []);

  const handleTopicClick = (hashtag: string) => {
    const tagWithHash = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    router.push(`/search?q=${encodeURIComponent(tagWithHash)}`);
  };

  const showDividerAfter = useMemo(() => topics.length - 1, [topics.length]);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        borderRadius: 3,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <TrendingUp size={20} style={{ marginRight: 8, color: theme.palette.primary.main }} />
        <Typography variant="h6" fontWeight={700}>
          Trending Topics
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {loading && (
        <>
          {[0,1,2].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton variant="text" width={160} height={20} />
              <Skeleton variant="text" width={120} height={16} />
              {i !== 2 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </>
      )}

      {!loading && error && (
        <Typography variant="body2" color="text.secondary">{error}</Typography>
      )}

      {!loading && !error && topics.map((topic, index) => {
        const tag = topic.hashtag.startsWith('#') ? topic.hashtag : `#${topic.hashtag}`;
        return (
          <Box key={topic.hashtag} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography 
                variant="subtitle2" 
                fontWeight={700}
                sx={{ cursor: 'pointer', '&:hover': { color: theme.palette.primary.main } }}
                onClick={() => handleTopicClick(topic.hashtag)}
              >
                {tag}
              </Typography>
              <Tooltip title={`Score: ${Math.round(topic.score)} • Likes: ${topic.totalLikes.toLocaleString()} • Comments: ${topic.totalComments.toLocaleString()} • Shares: ${topic.totalShares.toLocaleString()} • Views: ${topic.totalViews.toLocaleString()}`} arrow>
                <Typography variant="caption" color="text.secondary">
                  {topic.count.toLocaleString()} posts
                </Typography>
              </Tooltip>
            </Box>
            {index !== showDividerAfter && (
              <Divider sx={{ mt: 2 }} />
            )}
          </Box>
        );
      })}
    </Paper>
  );
};

export default TrendingTopics;
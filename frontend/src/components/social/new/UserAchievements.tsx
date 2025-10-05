import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import { 
  Award, 
  Zap, 
  TrendingUp, 
  Users, 
  Star,
  Crown,
  Gift,
  Trophy,
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress?: number;
  target?: number;
  earned: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

export const UserAchievements: React.FC = () => {
  const theme = useTheme();

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Post',
      description: 'Create your first social post',
      icon: <Star size={20} />,
      earned: true,
      rarity: 'common',
      points: 10,
    },
    {
      id: '2',
      title: 'Engagement Master',
      description: 'Get 100 likes on a single post',
      icon: <Heart size={20} />,
      progress: 75,
      target: 100,
      earned: false,
      rarity: 'rare',
      points: 50,
    },
    {
      id: '3',
      title: 'Community Builder',
      description: 'Follow 50 users',
      icon: <Users size={20} />,
      progress: 32,
      target: 50,
      earned: false,
      rarity: 'rare',
      points: 30,
    },
    {
      id: '4',
      title: 'Trending Creator',
      description: 'Have a post reach 1000 views',
      icon: <TrendingUp size={20} />,
      earned: true,
      rarity: 'epic',
      points: 100,
    },
    {
      id: '5',
      title: 'Marketplace Pioneer',
      description: 'List your first product',
      icon: <ShoppingCart size={20} />,
      earned: false,
      rarity: 'rare',
      points: 40,
    },
    {
      id: '6',
      title: 'Legendary Trader',
      description: 'Complete 100 transactions',
      icon: <Crown size={20} />,
      progress: 45,
      target: 100,
      earned: false,
      rarity: 'legendary',
      points: 200,
    },
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return theme.palette.grey[500];
      case 'rare': return theme.palette.info.main;
      case 'epic': return theme.palette.secondary.main;
      case 'legendary': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Common';
      case 'rare': return 'Rare';
      case 'epic': return 'Epic';
      case 'legendary': return 'Legendary';
      default: return 'Common';
    }
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        bgcolor: 'background.paper'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Award size={20} color={theme.palette.primary.main} />
          <Typography variant="h6" fontWeight={700}>
            Your Achievements
          </Typography>
          <Chip 
            label="1,250 pts" 
            size="small" 
            color="primary" 
            sx={{ 
              height: 24, 
              fontSize: '0.8rem',
              fontWeight: 700
            }} 
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {achievements.map((achievement) => (
            <Card 
              key={achievement.id}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                overflow: 'hidden',
                bgcolor: achievement.earned 
                  ? alpha(getRarityColor(achievement.rarity), 0.1) 
                  : 'transparent'
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      bgcolor: alpha(getRarityColor(achievement.rarity), 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getRarityColor(achievement.rarity)
                    }}
                  >
                    {achievement.icon}
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {achievement.title}
                      </Typography>
                      <Chip 
                        label={getRarityLabel(achievement.rarity)} 
                        size="small" 
                        sx={{ 
                          height: 20, 
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          bgcolor: alpha(getRarityColor(achievement.rarity), 0.1),
                          color: getRarityColor(achievement.rarity)
                        }} 
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {achievement.description}
                    </Typography>
                    
                    {achievement.progress !== undefined && achievement.target && (
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="caption" fontWeight={600}>
                            {achievement.progress}/{achievement.target}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={(achievement.progress / achievement.target) * 100}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.grey[300], 0.5),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getRarityColor(achievement.rarity)
                            }
                          }} 
                        />
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Zap size={16} color={theme.palette.warning.main} fill={theme.palette.warning.main} />
                        <Typography variant="caption" fontWeight={600}>
                          +{achievement.points} pts
                        </Typography>
                      </Box>
                      
                      {achievement.earned ? (
                        <Chip 
                          label="Earned" 
                          size="small" 
                          color="success" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }} 
                        />
                      ) : (
                        <Chip 
                          label="Locked" 
                          size="small" 
                          color="default" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            bgcolor: alpha(theme.palette.grey[300], 0.3)
                          }} 
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

// Placeholder for Heart icon since it wasn't imported
const Heart = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// Placeholder for ShoppingCart icon since it wasn't imported
const ShoppingCart = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

export default UserAchievements;
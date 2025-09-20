import React, { useState } from 'react';
import { Button, IconButton, Chip, CircularProgress } from '@mui/material';
import { UserPlus, UserMinus, Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    isFollowing?: boolean;
  };
  variant?: 'button' | 'icon' | 'chip';
  size?: 'small' | 'medium' | 'large';
  context?: 'profile' | 'stream' | 'card';
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  user,
  variant = 'button',
  size = 'medium',
  context = 'profile',
  onFollowChange,
}) => {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);

  const followMutation = useMutation({
    mutationFn: () => api.users.follow(user.id),
    onMutate: async () => {
      // optimistic UI
      setIsFollowing(true);
      onFollowChange?.(true);
      // cancel any outgoing refetches
      await queryClient.cancelQueries();
    },
    onSuccess: () => {
      toast.success(`Following ${user.displayName}`);
    },
    onError: () => {
      // rollback
      setIsFollowing(false);
      onFollowChange?.(false);
      toast.error('Failed to follow user');
    },
    onSettled: () => {
      // invalidate possibly affected queries
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.users.unfollow(user.id),
    onMutate: async () => {
      setIsFollowing(false);
      onFollowChange?.(false);
      await queryClient.cancelQueries();
    },
    onSuccess: () => {
      toast.success(`Unfollowed ${user.displayName}`);
    },
    onError: () => {
      setIsFollowing(true);
      onFollowChange?.(true);
      toast.error('Failed to unfollow user');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
    }
  });

  const handleClick = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  if (variant === 'icon') {
    return (
      <IconButton
        onClick={handleClick}
        disabled={isLoading}
        size={size}
        color={isFollowing ? 'error' : 'primary'}
      >
        {isLoading ? (
          <CircularProgress size={16} />
        ) : isFollowing ? (
          <UserMinus size={16} />
        ) : (
          <UserPlus size={16} />
        )}
      </IconButton>
    );
  }

  if (variant === 'chip') {
    return (
      <Chip
        label={isFollowing ? 'Following' : 'Follow'}
        onClick={handleClick}
        disabled={isLoading}
        size={size === 'large' ? 'medium' : 'small'}
        color={isFollowing ? 'default' : 'primary'}
        variant={isFollowing ? 'outlined' : 'filled'}
        icon={
          isLoading ? (
            <CircularProgress size={16} />
          ) : isFollowing ? (
            <Heart size={16} />
          ) : (
            <UserPlus size={16} />
          )
        }
      />
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      variant={isFollowing ? 'outlined' : 'contained'}
      color={isFollowing ? 'inherit' : 'primary'}
      startIcon={
        isLoading ? (
          <CircularProgress size={16} />
        ) : isFollowing ? (
          <UserMinus size={16} />
        ) : (
          <UserPlus size={16} />
        )
      }
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
};

export default FollowButton;
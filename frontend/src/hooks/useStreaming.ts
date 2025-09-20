import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export const useStreams = (params?: {
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
  isLive?: boolean;
}) => {
  return useQuery({
    queryKey: ['streams', params],
    queryFn: () => api.streams.getAll(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useLiveStreams = (params?: {
  limit?: number;
  page?: number;
  category?: string;
}) => {
  return useQuery({
    queryKey: ['streams', 'live', params],
    queryFn: () => api.streams.getLive(params),
    staleTime: 10000, // 10 seconds for live streams
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useStream = (id: string) => {
  return useQuery<import('../types').ApiResponse<import('../types').Stream>>({
    queryKey: ['stream', id],
    queryFn: () => api.streams.getById(id),
    enabled: !!id,
    staleTime: 30000,
    // Use a function that receives the last data via a getter to avoid signature mismatch in newer React Query
    refetchInterval: (lastData) => {
      const isLive = (lastData as any)?.data?.isLive;
      return isLive ? 15000 : 60000;
    },
  });
};

export const useStreamMetrics = (id: string) => {
  return useQuery<import('../types').ApiResponse<any>>({
    queryKey: ['stream', id, 'metrics'],
    queryFn: () => api.streams.getMetrics(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

export const useStreamHealth = (id: string) => {
  return useQuery<import('../types').ApiResponse<any>>({
    queryKey: ['stream', id, 'health'],
    queryFn: () => api.streams.getHealth(id),
    enabled: !!id,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useStreamCategories = () => {
  return useQuery({
    queryKey: ['stream-categories'],
    queryFn: () => api.streams.getCategories(),
    staleTime: 300000, // 5 minutes
  });
};

export const useStreamMutations = () => {
  const queryClient = useQueryClient();

  const createStream = useMutation<import('../types').ApiResponse<import('../types').Stream>, Error, any>({
    mutationFn: api.streams.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create stream');
    },
  });

  const updateStream = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.streams.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update stream');
    },
  });

  const startStream = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { streamUrl: string; playbackUrl: string } }) =>
      api.streams.start(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream started successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start stream');
    },
  });

  const stopStream = useMutation({
    mutationFn: api.streams.stop,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream stopped successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop stream');
    },
  });

  const sendDonation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount: number; message?: string; currency?: string } }) =>
      api.streams.sendDonation(id, data),
    onSuccess: () => {
      toast.success('Donation sent successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send donation');
    },
  });

  return {
    createStream,
    updateStream,
    startStream,
    stopStream,
    sendDonation,
  };
};

export const useStreamChat = (streamId: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { data: chatData } = useQuery({
    queryKey: ['stream', streamId, 'chat'],
    queryFn: () => api.streams.getChatMessages(streamId),
    enabled: !!streamId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const sendMessage = useMutation({
    mutationFn: (message: string) => api.streams.sendChatMessage(streamId, message),
    onSuccess: (data) => {
      // Add message to local state for immediate feedback
      setMessages(prev => [...prev, data.data]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    if (chatData?.data?.messages) {
      setMessages(chatData.data.messages);
    }
  }, [chatData]);

  // Mock WebSocket connection for real-time chat
  useEffect(() => {
    if (!streamId) return;

    // In a real app, this would be a WebSocket connection
    const interval = setInterval(() => {
      // Mock receiving new messages
      if (Math.random() > 0.8) {
        const mockMessage = {
          id: Date.now().toString(),
          userId: 'mock-user',
          username: 'viewer' + Math.floor(Math.random() * 1000),
          displayName: 'Viewer ' + Math.floor(Math.random() * 1000),
          message: 'This is a mock real-time message!',
          timestamp: new Date().toISOString(),
          type: 'message',
          reactions: { likes: 0, hearts: 0, isLiked: false, isHearted: false },
        };
        setMessages(prev => [mockMessage, ...prev.slice(0, 49)]);
      }
    }, 10000); // Mock message every 10 seconds

    setIsConnected(true);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [streamId]);

  return {
    messages,
    isConnected,
    sendMessage: sendMessage.mutate,
    isLoading: sendMessage.isPending,
  };
};
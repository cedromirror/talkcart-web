import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ListResponse<T> {
  items: T[];
  total: number;
}

const PAGE_SIZE = 20;

export function useFollowersList(userId?: string, enabled: boolean = true, pageSize: number = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['followers', userId, pageSize],
    enabled: enabled && !!userId,
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { items: [], total: 0, nextSkip: null };
      const res = await api.users.getFollowers(userId, pageSize, pageParam);
      const items = res.data?.data?.items || res.data?.items || res.items || [];
      const total = res.data?.data?.total ?? res.data?.total ?? res.total ?? items.length;
      const nextSkip = pageParam + items.length < total ? pageParam + items.length : null;
      return { items, total, nextSkip } as { items: any[]; total: number; nextSkip: number | null };
    },
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    staleTime: 60 * 1000,
  });
}

export function useFollowingList(userId?: string, enabled: boolean = true, pageSize: number = PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['following', userId, pageSize],
    enabled: enabled && !!userId,
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { items: [], total: 0, nextSkip: null };
      const res = await api.users.getFollowing(userId, pageSize, pageParam);
      const items = res.data?.data?.items || res.data?.items || res.items || [];
      const total = res.data?.data?.total ?? res.data?.total ?? res.total ?? items.length;
      const nextSkip = pageParam + items.length < total ? pageParam + items.length : null;
      return { items, total, nextSkip } as { items: any[]; total: number; nextSkip: number | null };
    },
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    staleTime: 60 * 1000,
  });
}
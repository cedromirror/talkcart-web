import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Post, PostsApiResponse } from '@/types/social';
import toast from 'react-hot-toast';
import { normalizePostData } from '@/utils/crossPlatformUtils';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  fetchPosts: (params?: { feedType?: string; limit?: number; page?: number; reset?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchBookmarkedPosts: (userId: string, params?: { limit?: number; page?: number }) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
}

interface FetchPostsParams {
  feedType?: string;
  limit?: number;
  page?: number;
  contentType?: string;
  authorId?: string;
  hashtag?: string;
  search?: string;
}

export const usePosts = (initialFeedType?: string): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentFeedType, setCurrentFeedType] = useState<string>(initialFeedType || 'for-you');

  const fetchPosts = useCallback(async (params?: FetchPostsParams & { reset?: boolean }) => {
    setLoading(true);
    setError(null);
    
    try {
      // Set the feed type, defaulting to the initial or 'for-you' if not provided
      const feedType = params?.feedType || initialFeedType || 'for-you';
      if (feedType !== currentFeedType) {
        setCurrentFeedType(feedType);
      }
      
      // Handle bookmarked posts specially
      if (feedType === 'bookmarks') {
        // For bookmarks, we need to get the current user ID
        // This would typically come from context or be passed as a parameter
        // For now, we'll throw an error indicating this needs special handling
        throw new Error('Bookmarks feed type requires special handling with user ID');
      }
      
      const apiParams = {
        feedType,
        limit: params?.limit || 20,
        page: params?.page || 1,
        contentType: params?.contentType,
        authorId: params?.authorId,
        hashtag: params?.hashtag,
        search: params?.search
      };
      
      console.log('Fetching posts with params:', apiParams);
      
      // Try authenticated endpoint first, fallback to public
      let response: PostsApiResponse;
      try {
        response = await api.posts.getAll(apiParams) as PostsApiResponse;
        console.log('API response:', response);
      } catch (authError) {
        console.error('Authenticated API request failed:', authError);
        // Fallback to public endpoint via API client to preserve headers/config
        response = await api.posts.getPublicPosts({
          limit: apiParams.limit,
          page: apiParams.page,
          contentType: apiParams.contentType,
          hashtag: apiParams.hashtag,
          search: apiParams.search,
        }) as unknown as PostsApiResponse;
      }
      
      if (response.success) {
        // Use cross-platform utility to normalize post data
        const postsWithDefaults = response.data.posts.map(normalizePostData);
        console.log('Fetched posts with defaults:', postsWithDefaults);
        const isReset = params?.reset || apiParams.page === 1;
        setPosts(prev => isReset ? postsWithDefaults : [...prev, ...postsWithDefaults]);
        setPage(response.data.pagination.page);
        setHasMore(response.data.pagination.page < response.data.pagination.pages);
      } else {
        console.error('API returned error:', response);
        setError(response.message || 'Failed to fetch posts');
        setPosts([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to fetch posts. Please try again later.');
      setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [initialFeedType, currentFeedType]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    await fetchPosts({ feedType: currentFeedType, page: nextPage });
  }, [loading, hasMore, page, currentFeedType, fetchPosts]);

  const fetchBookmarkedPosts = useCallback(async (userId: string, params?: { limit?: number; page?: number }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: any = await api.posts.getBookmarkedPosts(userId, params);
      
      if (response.success) {
        // Ensure posts have required properties
        const postsWithDefaults = response.data.posts.map((post: any) => ({
          ...post,
          type: post.type || (post.media && post.media.length > 0 ? 
            (post.media[0]?.resource_type === 'video' ? 'video' : 'image') : 'text'),
          views: post.views || 0,
          isBookmarked: true // All posts from this endpoint are bookmarked
        }));
        setPosts(postsWithDefaults);
      } else {
        setError('Failed to fetch bookmarked posts');
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching bookmarked posts:', err);
      setError('Failed to fetch bookmarked posts. Please try again later.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;
        const isLiked = !!post.isLiked;
        const newLikeCount = (post.likeCount ?? post.likes ?? 0) + (isLiked ? -1 : 1);
        return {
          ...post,
          isLiked: !isLiked,
          likeCount: Math.max(0, newLikeCount),
          likes: Math.max(0, newLikeCount),
        } as Post;
      }));

      const response: any = await api.posts.like(postId);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to like post');
      }

      // Reconcile with server count
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id !== postId) return post;
        const serverCount = response.data?.likeCount ?? post.likeCount ?? post.likes ?? 0;
        const action = response.data?.action as ('like' | 'unlike' | undefined);
        return {
          ...post,
          likeCount: serverCount,
          likes: serverCount,
          isLiked: action ? (action === 'like') : post.isLiked,
        } as Post;
      }));
    } catch (err: any) {
      console.error('Error liking post:', err);
      toast.error(err.message || 'Failed to like post. Please try again.');
      // Rollback optimistic change by refetching current page minimally
      fetchPosts({ feedType: currentFeedType, page, reset: true }).catch(() => {});
    }
  }, [currentFeedType, page, fetchPosts]);

  // Enhanced bookmarkPost function with better error handling
  const bookmarkPost = useCallback(async (postId: string) => {
    try {
      const response: any = await api.posts.bookmark(postId);
      
      if (response?.success) {
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.id !== postId) return post;
          const currentlyBookmarked = !!post.isBookmarked;
          const nextBookmarked = !!response.data?.isBookmarked;
          const delta = nextBookmarked === currentlyBookmarked
            ? 0
            : (nextBookmarked ? 1 : -1);
          const currentCount = post.bookmarkCount ?? (post as any).bookmarks ?? 0;
          const newCount = Math.max(0, currentCount + delta);
          return {
            ...post,
            isBookmarked: nextBookmarked,
            bookmarkCount: newCount,
            bookmarks: newCount,
          } as Post;
        }));

        toast.success(response.data?.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks');
      } else {
        throw new Error(response?.message || 'Failed to bookmark post');
      }
    } catch (err: any) {
      console.error('Error bookmarking post:', err);
      toast.error(err.message || 'Failed to bookmark post. Please try again.');
    }
  }, []);

  // Enhanced sharePost function with better error handling
  const sharePost = useCallback(async (postId: string) => {
    try {
      const response: any = await api.posts.share(postId);
      
      if (response?.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { 
                  ...post, 
                  shares: response.data.shareCount,
                  shareCount: response.data.shareCount
                }
              : post
          )
        );
        toast.success('Post shared');
      } else {
        throw new Error(response?.message || 'Failed to share post');
      }
    } catch (err: any) {
      console.error('Error sharing post:', err);
      toast.error(err.message || 'Failed to share post. Please try again.');
    }
  }, []);

  // Initial fetch with default feed type
  useEffect(() => {
    // Reset pagination when feed type changes externally
    setPage(1);
    setHasMore(true);
    fetchPosts({ feedType: initialFeedType, page: 1, reset: true });
  }, [fetchPosts, initialFeedType]);

  // Listen for newly created posts to prepend into current feed
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ post: Post }>;
      const newPost = customEvent.detail?.post;
      if (!newPost) return;
      setPosts(prev => {
        // Avoid duplicates
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('posts:new', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('posts:new', handler as EventListener);
      }
    };
  }, []);

  return {
    posts,
    loading,
    error,
    page,
    hasMore,
    fetchPosts,
    loadMore,
    fetchBookmarkedPosts,
    likePost,
    bookmarkPost,
    sharePost
  };
};

export default usePosts;
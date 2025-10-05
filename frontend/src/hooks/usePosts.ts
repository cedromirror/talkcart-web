import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Post, PostsApiResponse } from '@/types/social';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  fetchPosts: (params?: { feedType?: string; limit?: number; page?: number }) => Promise<void>;
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

  const fetchPosts = useCallback(async (params?: FetchPostsParams) => {
    setLoading(true);
    setError(null);
    
    try {
      // Set the feed type, defaulting to the initial or 'for-you' if not provided
      const feedType = params?.feedType || initialFeedType || 'for-you';
      
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
      
      // Try authenticated endpoint first, fallback to public
      let response: PostsApiResponse;
      try {
        response = await api.posts.getAll(apiParams) as PostsApiResponse;
      } catch (authError) {
        // Fallback to public endpoint if authentication fails
        const publicResponse = await fetch('/api/posts/public?limit=20');
        response = await publicResponse.json() as PostsApiResponse;
      }
      
      if (response.success) {
        // Ensure posts have required properties
        const postsWithDefaults = response.data.posts.map((post: any) => ({
          ...post,
          type: post.type || (post.media && post.media.length > 0 ? 
            (post.media[0].resource_type === 'video' ? 'video' : 'image') : 'text'),
          views: post.views || 0
        }));
        setPosts(postsWithDefaults);
      } else {
        setError('Failed to fetch posts');
        // Do not use mock data; reflect real API state
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch posts. Please try again later.');
      // Do not use mock data; reflect real API state
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [initialFeedType]);

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
            (post.media[0].resource_type === 'video' ? 'video' : 'image') : 'text'),
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
    // Like functionality is now handled by usePostInteractions hook
    // This method is kept for backward compatibility but doesn't perform the actual like
    console.log('likePost called for postId:', postId, '- handled by usePostInteractions hook');
  }, []);

  const bookmarkPost = useCallback(async (postId: string) => {
    try {
      const response: any = await api.posts.bookmark(postId);
      
      if (response.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, isBookmarked: !post.isBookmarked }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Error bookmarking post:', err);
      // For development, toggle bookmark state even if API fails
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, isBookmarked: !post.isBookmarked }
            : post
        )
      );
    }
  }, []);

  const sharePost = useCallback(async (postId: string) => {
    try {
      const response: any = await api.posts.share(postId);
      
      if (response.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId 
              ? { ...post, shares: post.shares + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Error sharing post:', err);
      // For development, increment share count even if API fails
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, shares: post.shares + 1 }
            : post
        )
      );
    }
  }, []);

  // Initial fetch with default feed type
  useEffect(() => {
    fetchPosts({ feedType: initialFeedType });
  }, [fetchPosts, initialFeedType]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    fetchBookmarkedPosts,
    likePost,
    bookmarkPost,
    sharePost
  };
};

export default usePosts;
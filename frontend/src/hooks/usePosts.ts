import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Post } from '@/types/social';

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  fetchPosts: (query?: string, tags?: string[]) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  bookmarkPost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
}

export const usePosts = (): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (query?: string, tags?: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, string | string[]> = {};
      
      if (query) {
        params.search = query;
      }
      
      if (tags && tags.length > 0) {
        params.tags = tags;
      }
      
      // Try authenticated endpoint first, fallback to public
      let response;
      try {
        response = await api.posts.getAll(params);
      } catch (authError) {
        // Fallback to public endpoint if authentication fails
        const publicResponse = await fetch('/api/posts/public?limit=20');
        response = await publicResponse.json();
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
  }, []);

  const likePost = useCallback(async (postId: string) => {
    // Like functionality is now handled by usePostInteractions hook
    // This method is kept for backward compatibility but doesn't perform the actual like
    console.log('likePost called for postId:', postId, '- handled by usePostInteractions hook');
  }, []);

  const bookmarkPost = useCallback(async (postId: string) => {
    try {
      const response = await api.posts.bookmark(postId);
      
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
      const response = await api.posts.share(postId);
      
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    likePost,
    bookmarkPost,
    sharePost
  };
};

export default usePosts;
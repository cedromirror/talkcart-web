import { apiClient, api } from '../api';
import { ApiResponse } from '@/types/api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

describe('API Posts Like/Unlike Functionality', () => {
  const mockApiClient = {
    post: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Replace the apiClient with our mock
    (apiClient as any).post = mockApiClient.post;
    (apiClient as any).delete = mockApiClient.delete;
    (apiClient as any).get = mockApiClient.get;
  });

  describe('Happy Path Tests', () => {
    test('should call POST /posts/:id/like with correct parameters', async () => {
      const postId = 'video-post-123';
      const expectedResponse: ApiResponse = {
        success: true,
        data: {
          likes: 26,
          isLiked: true,
          wasAlreadyLiked: false,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(expectedResponse);

      const result = await api.posts.like(postId);

      expect(mockApiClient.post).toHaveBeenCalledWith(`/posts/${postId}/like`);
      expect(result).toEqual(expectedResponse);
    });

    test('should call DELETE /posts/:id/like with correct parameters', async () => {
      const postId = 'video-post-123';
      const expectedResponse: ApiResponse = {
        success: true,
        data: {
          likes: 25,
          isLiked: false,
        },
      };

      mockApiClient.delete.mockResolvedValueOnce(expectedResponse);

      const result = await api.posts.unlike(postId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(`/posts/${postId}/like`);
      expect(result).toEqual(expectedResponse);
    });

    test('should handle successful like response data structure', async () => {
      const postId = 'video-post-123';
      const mockResponse = {
        success: true,
        data: {
          likes: 42,
          isLiked: true,
          wasAlreadyLiked: false,
        },
        message: 'Post liked successfully',
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await api.posts.like(postId);

      expect(result.success).toBe(true);
      expect(result.data.likes).toBe(42);
      expect(result.data.isLiked).toBe(true);
      expect(result.data.wasAlreadyLiked).toBe(false);
    });

    test('should handle successful unlike response data structure', async () => {
      const postId = 'video-post-123';
      const mockResponse = {
        success: true,
        data: {
          likes: 41,
          isLiked: false,
        },
        message: 'Post unliked successfully',
      };

      mockApiClient.delete.mockResolvedValueOnce(mockResponse);

      const result = await api.posts.unlike(postId);

      expect(result.success).toBe(true);
      expect(result.data.likes).toBe(41);
      expect(result.data.isLiked).toBe(false);
    });
  });

  describe('Input Verification Tests', () => {
    test('should handle empty post ID', async () => {
      const emptyPostId = '';

      // The API call should still be made (validation is handled on backend)
      mockApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Post ID is required',
      });

      await expect(api.posts.like(emptyPostId)).resolves.toEqual({
        success: false,
        error: 'Post ID is required',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/posts//like');
    });

    test('should handle invalid post ID format', async () => {
      const invalidPostId = 'invalid-post-id';
      const errorResponse = {
        success: false,
        error: 'Invalid post ID format',
      };

      mockApiClient.post.mockResolvedValueOnce(errorResponse);

      const result = await api.posts.like(invalidPostId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid post ID format');
    });

    test('should handle non-string post ID', async () => {
      const numericPostId = 123 as any; // Simulate incorrect type

      mockApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Invalid post ID',
      });

      await api.posts.like(numericPostId);

      expect(mockApiClient.post).toHaveBeenCalledWith('/posts/123/like');
    });
  });

  describe('Exception Handling Tests', () => {
    test('should handle network error during like request', async () => {
      const postId = 'video-post-123';
      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';

      mockApiClient.post.mockRejectedValueOnce(networkError);

      await expect(api.posts.like(postId)).rejects.toThrow('Network Error');
    });

    test('should handle 404 error for non-existent post', async () => {
      const postId = 'non-existent-post';
      const notFoundError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Post not found',
          },
        },
      };

      mockApiClient.post.mockRejectedValueOnce(notFoundError);

      await expect(api.posts.like(postId)).rejects.toEqual(notFoundError);
    });

    test('should handle 401 unauthorized error', async () => {
      const postId = 'video-post-123';
      const unauthorizedError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: 'Access token required',
          },
        },
      };

      mockApiClient.post.mockRejectedValueOnce(unauthorizedError);

      await expect(api.posts.like(postId)).rejects.toEqual(unauthorizedError);
    });

    test('should handle 500 server error', async () => {
      const postId = 'video-post-123';
      const serverError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal server error',
          },
        },
      };

      mockApiClient.post.mockRejectedValueOnce(serverError);

      await expect(api.posts.like(postId)).rejects.toEqual(serverError);
    });

    test('should handle timeout error', async () => {
      const postId = 'video-post-123';
      const timeoutError = new Error('Request timeout');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApiClient.post.mockRejectedValueOnce(timeoutError);

      await expect(api.posts.like(postId)).rejects.toThrow('Request timeout');
    });
  });

  describe('Branching Tests', () => {
    test('should handle like request when post is already liked', async () => {
      const postId = 'video-post-123';
      const alreadyLikedResponse = {
        success: true,
        data: {
          likes: 25,
          isLiked: true,
          wasAlreadyLiked: true, // Already liked
        },
      };

      mockApiClient.post.mockResolvedValueOnce(alreadyLikedResponse);

      const result = await api.posts.like(postId);

      expect(result.data.wasAlreadyLiked).toBe(true);
      expect(result.data.isLiked).toBe(true);
    });

    test('should handle unlike request when post is not liked', async () => {
      const postId = 'video-post-123';
      const notLikedError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: 'Post not liked by user',
          },
        },
      };

      mockApiClient.delete.mockRejectedValueOnce(notLikedError);

      await expect(api.posts.unlike(postId)).rejects.toEqual(notLikedError);
    });

    test('should handle different response formats gracefully', async () => {
      const postId = 'video-post-123';
      
      // Test with minimal response
      const minimalResponse = {
        success: true,
        data: { likes: 1 },
      };

      mockApiClient.post.mockResolvedValueOnce(minimalResponse);

      const result = await api.posts.like(postId);
      expect(result.success).toBe(true);
      expect(result.data.likes).toBe(1);

      // Test with extended response
      const extendedResponse = {
        success: true,
        data: {
          likes: 2,
          isLiked: true,
          wasAlreadyLiked: false,
          likeId: 'like-123',
          timestamp: '2024-01-01T12:00:00Z',
        },
        meta: {
          requestId: 'req-123',
          processingTime: 45,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(extendedResponse);

      const extendedResult = await api.posts.like(postId);
      expect(extendedResult.success).toBe(true);
      expect(extendedResult.data.likes).toBe(2);
      expect(extendedResult.meta?.requestId).toBe('req-123');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long post IDs', async () => {
      const longPostId = 'a'.repeat(1000); // Very long ID
      const response = {
        success: false,
        error: 'Post ID too long',
      };

      mockApiClient.post.mockResolvedValueOnce(response);

      const result = await api.posts.like(longPostId);
      expect(result.success).toBe(false);
    });

    test('should handle special characters in post ID', async () => {
      const specialCharPostId = 'post-123@#$%^&*()';
      const response = {
        success: false,
        error: 'Invalid post ID format',
      };

      mockApiClient.post.mockResolvedValueOnce(response);

      const result = await api.posts.like(specialCharPostId);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/posts/${specialCharPostId}/like`);
    });

    test('should handle null/undefined post ID', async () => {
      const nullPostId = null as any;
      const undefinedPostId = undefined as any;

      mockApiClient.post.mockResolvedValue({
        success: false,
        error: 'Invalid post ID',
      });

      await api.posts.like(nullPostId);
      expect(mockApiClient.post).toHaveBeenCalledWith('/posts/null/like');

      await api.posts.like(undefinedPostId);
      expect(mockApiClient.post).toHaveBeenCalledWith('/posts/undefined/like');
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle concurrent like/unlike requests', async () => {
      const postId = 'video-post-123';

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: { likes: 26, isLiked: true },
      });

      mockApiClient.delete.mockResolvedValueOnce({
        success: true,
        data: { likes: 25, isLiked: false },
      });

      // Make concurrent requests
      const likePromise = api.posts.like(postId);
      const unlikePromise = api.posts.unlike(postId);

      const [likeResult, unlikeResult] = await Promise.all([likePromise, unlikePromise]);

      expect(likeResult.success).toBe(true);
      expect(unlikeResult.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/posts/${postId}/like`);
      expect(mockApiClient.delete).toHaveBeenCalledWith(`/posts/${postId}/like`);
    });

    test('should handle multiple like requests for same post', async () => {
      const postId = 'video-post-123';

      mockApiClient.post
        .mockResolvedValueOnce({
          success: true,
          data: { likes: 26, isLiked: true, wasAlreadyLiked: false },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { likes: 26, isLiked: true, wasAlreadyLiked: true },
        });

      const [firstResult, secondResult] = await Promise.all([
        api.posts.like(postId),
        api.posts.like(postId),
      ]);

      expect(firstResult.data.wasAlreadyLiked).toBe(false);
      expect(secondResult.data.wasAlreadyLiked).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
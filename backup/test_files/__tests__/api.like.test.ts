import { apiClient } from '../api';

// Simple test to verify API structure and exports
describe('API Like Functionality Basic Tests', () => {
  test('should have posts.like method', () => {
    const { api } = require('../api');
    expect(typeof api.posts.like).toBe('function');
  });

  test('should have posts.unlike method', () => {
    const { api } = require('../api');
    expect(typeof api.posts.unlike).toBe('function');
  });

  test('should create proper API endpoints', () => {
    const { api } = require('../api');
    
    // Mock apiClient to capture calls
    const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
    const mockDelete = jest.fn().mockResolvedValue({ data: { success: true } });
    
    // Replace apiClient methods temporarily
    const originalPost = apiClient.post;
    const originalDelete = apiClient.delete;
    
    (apiClient as any).post = mockPost;
    (apiClient as any).delete = mockDelete;
    
    const testPostId = 'test-post-123';
    
    // Test like endpoint
    api.posts.like(testPostId);
    expect(mockPost).toHaveBeenCalledWith(`/posts/${testPostId}/like`);
    
    // Test unlike endpoint
    api.posts.unlike(testPostId);
    expect(mockDelete).toHaveBeenCalledWith(`/posts/${testPostId}/like`);
    
    // Restore original methods
    (apiClient as any).post = originalPost;
    (apiClient as any).delete = originalDelete;
  });
});
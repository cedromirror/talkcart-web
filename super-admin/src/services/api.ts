// Import centralized configuration
import { config, isDebugMode } from '../config';
import { fetchWithAuth } from './auth';

// Configuration constants
const API_BASE = config.api.baseUrl;
const BACKEND_URL = config.api.backendUrl;
const REQUEST_TIMEOUT = config.api.timeout;
const DEBUG_MODE = isDebugMode();

// Enhanced fetch with timeout and error handling
const fetchWithConfig = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    if (DEBUG_MODE) {
      console.log(`[Super Admin API] ${options.method || 'GET'} ${url}`);
    }

    const response = await fetchWithAuth(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (DEBUG_MODE) {
      console.log(`[Super Admin API] Response ${response.status} for ${url}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (DEBUG_MODE) {
      console.error(`[Super Admin API] Error for ${url}:`, error);
    }
    throw error;
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('[Super Admin API] Backend health check failed:', error);
    }
    return false;
  }
};

export const AdminApi = {
  // Health and connection
  healthCheck,

  // Authentication
  me: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/me`);
    return res.json();
  },

  // Products
  listProductsAdmin: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/products?${params.toString()}`);
    return res.json();
  },
  createProduct: async (data: {
    name: string;
    description: string;
    price: number;
    currency?: string;
    images?: Array<{ public_id: string; secure_url: string; url: string }>;
    category: string;
    tags?: string[];
    stock?: number;
    featured?: boolean;
    isNFT?: boolean;
    contractAddress?: string;
    tokenId?: string;
    vendorId?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  toggleProduct: async (id: string, body: { isActive?: boolean; featured?: boolean }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  updateProduct: async (id: string, body: { price?: number; stock?: number }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  deleteProduct: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  approveProduct: async (id: string, featured = false) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured }),
    });
    return res.json();
  },
  bulkProducts: async (ids: string[], action: string, payload: any = {}) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, payload }),
    });
    return res.json();
  },
  exportProductsCsvUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/products/export.csv?${params.toString()}`;
  },
  // Marketplace (create)
  createMarketplaceProduct: async (body: any) => {
    const res = await fetchWithConfig(`${API_BASE}/marketplace/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  // Refunds
  refundsRecent: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/recent?${params.toString()}`);
    return res.json();
  },
  refundsExportUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/refunds/export.csv?${params.toString()}`;
  },
  refundsAnalytics: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/analytics?${params.toString()}`);
    return res.json();
  },
  processRefund: async (data: { paymentIntentId: string; amount: number; currency: string; reason?: string }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Comprehensive Refund Management
  getRefunds: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/management?${params.toString()}`);
    return res.json();
  },
  getRefund: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/${id}`);
    return res.json();
  },
  createRefund: async (data: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateRefundStatus: async (id: string, data: { status: string; notes?: string; externalRefundId?: string }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  addRefundCommunication: async (id: string, data: { type: string; content: string; recipient?: string }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/${id}/communicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getComprehensiveRefundAnalytics: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/analytics/comprehensive?${params.toString()}`);
    return res.json();
  },
  bulkRefundAction: async (data: { refundIds: string[]; action: string; data?: any }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Categories Management
  getCategories: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/categories`);
    return res.json();
  },

  // Orders Management
  listOrders: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/orders?${params.toString()}`);
    return res.json();
  },
  updateOrderStatus: async (id: string, status: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Analytics
  getAnalyticsOverview: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/overview?${params.toString()}`);
    return res.json();
  },
  getSalesTrends: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/sales-trends?${params.toString()}`);
    return res.json();
  },
  getTopProducts: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/top-products?${params.toString()}`);
    return res.json();
  },
  getVendorPerformance: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/vendor-performance?${params.toString()}`);
    return res.json();
  },

  // Media Management
  getImages: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/media/images?${params.toString()}`);
    return res.json();
  },
  deleteImage: async (productId: string, imageId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/media/images/${productId}/${imageId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Settings Management
  getMarketplaceSettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/marketplace`);
    return res.json();
  },

  updateMarketplaceSettings: async (settings: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/marketplace`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  getSystemSettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/system`);
    return res.json();
  },

  updateSystemSettings: async (settings: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/system`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  getSecuritySettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/security`);
    return res.json();
  },

  updateSecuritySettings: async (settings: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/security`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  getPaymentSettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/payment`);
    return res.json();
  },

  updatePaymentSettings: async (settings: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  getAllSettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/all`);
    return res.json();
  },

  resetSettings: async (type: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings/reset/${type}`, {
      method: 'POST',
    });
    return res.json();
  },

  // Users/Vendors Management (enhanced)
  listUsers: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/users?${params.toString()}`);
    return res.json();
  },
  getUserDetails: async (userId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}`);
    return res.json();
  },
  updateUserRole: async (userId: string, role: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    return res.json();
  },
  updateUserVerification: async (userId: string, isVerified: boolean) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVerified })
    });
    return res.json();
  },
  getUserActivity: async (userId: string, limit: number = 50) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/activity?limit=${limit}`);
    return res.json();
  },
  getUserAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getUserSummary: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/summary`);
    return res.json();
  },

  // Vendor Management
  listVendors: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors?${params.toString()}`);
    return res.json();
  },
  getVendorDetails: async (vendorId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}`);
    return res.json();
  },
  getUserSales: async (vendorId: string, period: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}/sales?period=${period}`);
    return res.json();
  },
  getUserFees: async (vendorId: string, period: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}/fees?period=${period}`);
    return res.json();
  },
  suspendVendor: async (vendorId: string, reason: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },
  unsuspendVendor: async (vendorId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}/unsuspend`, {
      method: 'POST'
    });
    return res.json();
  },
  updateVendorKyc: async (vendorId: string, kycStatus: string, notes?: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/${vendorId}/kyc`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kycStatus, notes })
    });
    return res.json();
  },
  getVendorAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getVendorSummary: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/vendors/summary`);
    return res.json();
  },
  suspendUser: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}/suspend`, {
      method: 'POST',
    });
    return res.json();
  },
  unsuspendUser: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}/unsuspend`, {
      method: 'POST',
    });
    return res.json();
  },
  updateUserKyc: async (id: string, status: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}/kyc?status=${status}`, {
      method: 'POST',
    });
    return res.json();
  },


  // Payouts Management
  listPayouts: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts?${params.toString()}`);
    return res.json();
  },
  getPayoutDetails: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts/${id}`);
    return res.json();
  },
  createPayout: async (data: { amount: number; currency: string; destination?: string; description?: string; metadata?: Record<string, any> }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  cancelPayout: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts/${id}/cancel`, {
      method: 'POST',
    });
    return res.json();
  },
  getPayoutsAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  getDetailedPayoutsAnalytics: async (timeRange: string = '90d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts/analytics/detailed?timeRange=${timeRange}`);
    return res.json();
  },
  getPayoutsSummary: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payouts/summary`);
    return res.json();
  },
  exportPayoutsUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/payouts/export.csv?${params.toString()}`;
  },

  // Disputes Management
  listDisputes: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/disputes?${params.toString()}`);
    return res.json();
  },
  getDisputeDetails: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/disputes/${id}`);
    return res.json();
  },
  getDisputesAnalytics: async (timeRange: string = '30d') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/disputes/analytics/overview?timeRange=${timeRange}`);
    return res.json();
  },
  submitDisputeEvidence: async (id: string, evidence: Record<string, any>) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/disputes/${id}/submit-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence }),
    });
    return res.json();
  },
  addDisputeNote: async (id: string, note: string, priority: string = 'medium') => {
    const res = await fetchWithConfig(`${API_BASE}/admin/disputes/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, priority }),
    });
    return res.json();
  },
  exportDisputesUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/disputes/export.csv?${params.toString()}`;
  },

  // Enhanced User Management
  updateUser: async (userId: string, userData: any) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  deleteUser: async (userId: string, permanent: boolean = false) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}?permanent=${permanent}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  restoreUser: async (userId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/restore`, {
      method: 'POST'
    });
    return res.json();
  },

  // Email Communication
  sendUserEmail: async (userId: string, emailData: {
    subject: string;
    message: string;
    template?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    return res.json();
  },

  sendBulkEmail: async (userIds: string[], emailData: {
    subject: string;
    message: string;
    template?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/bulk-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        ...emailData
      })
    });
    return res.json();
  },

  getUserEmailHistory: async (userId: string, limit: number = 50) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/email-history?limit=${limit}`);
    return res.json();
  },
};
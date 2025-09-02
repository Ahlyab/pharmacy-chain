/**
 * API utility functions with automatic JWT token inclusion
 * This ensures all API calls include the bearer token for authentication
 */

import config from '../config/env';

// Get the stored token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// Create headers with authentication token
const createAuthHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Generic API request function
const apiRequest = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  
  if (!token) {
    console.error('❌ No authentication token found in localStorage');
    throw new Error('No authentication token found. Please log in again.');
  }

  const config: RequestInit = {
    ...options,
    headers: createAuthHeaders(options.headers as Record<string, string>),
  };

  // Debug logging
  console.log('🔐 Making authenticated API request:', {
    url,
    method: options.method || 'GET',
    hasToken: !!token,
    tokenPreview: token.substring(0, 20) + '...',
    headers: config.headers,
  });

  try {
    const response = await fetch(url, config);
    
    console.log('📡 API Response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      console.error('❌ Authentication failed - 401 Unauthorized');
      // Clear invalid token
      localStorage.removeItem('token');
      // Redirect to login (you might want to use a router here)
      window.location.href = '/login';
      throw new Error('Authentication failed. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Success:', {
      url,
      dataPreview: Array.isArray(data) ? `Array with ${data.length} items` : 'Object',
    });
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ API Request Error:', {
        url,
        error: error.message,
      });
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
};

// API utility functions
export const api = {
  // GET request
  get: <T = any>(endpoint: string, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'GET',
      headers: additionalHeaders,
    });
  },

  // POST request
  post: <T = any>(endpoint: string, data?: any, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: additionalHeaders,
    });
  },

  // PUT request
  put: <T = any>(endpoint: string, data?: any, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: additionalHeaders,
    });
  },

  // PATCH request
  patch: <T = any>(endpoint: string, data?: any, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: additionalHeaders,
    });
  },

  // DELETE request
  delete: <T = any>(endpoint: string, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    return apiRequest<T>(url, {
      method: 'DELETE',
      headers: additionalHeaders,
    });
  },

  // File upload with FormData
  upload: <T = any>(endpoint: string, formData: FormData, additionalHeaders?: Record<string, string>): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;
    const token = getToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const headers: Record<string, string> = {
      ...additionalHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return apiRequest<T>(url, {
      method: 'POST',
      body: formData,
      headers,
    });
  },
};

// Specific API endpoints for common operations
export const apiEndpoints = {
  // Authentication
  login: (email: string, password: string, additionalHeaders?: Record<string, string>) => 
    api.post('/api/login', { email, password }, additionalHeaders),
  
  signup: (userData: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/signup', userData, additionalHeaders),
  
  getCurrentUser: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/me', additionalHeaders),

  // Inventory
  getInventory: (branchId?: string, additionalHeaders?: Record<string, string>) => 
    api.get(branchId ? `/api/inventory?branchId=${branchId}` : '/api/inventory', additionalHeaders),
  
  createInventory: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/inventory', data, additionalHeaders),
  
  updateInventory: (id: string, data: any, additionalHeaders?: Record<string, string>) => 
    api.patch(`/api/inventory/${id}`, data, additionalHeaders),
  
  deleteInventory: (id: string, additionalHeaders?: Record<string, string>) => 
    api.delete(`/api/inventory/${id}`, additionalHeaders),

  // Suppliers
  getSuppliers: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/supplier', additionalHeaders),
  
  createSupplier: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/supplier', data, additionalHeaders),
  
  updateSupplier: (id: string, data: any, additionalHeaders?: Record<string, string>) => 
    api.patch(`/api/supplier/${id}`, data, additionalHeaders),
  
  deleteSupplier: (id: string, additionalHeaders?: Record<string, string>) => 
    api.delete(`/api/supplier/${id}`, additionalHeaders),

  // Transactions
  getTransactions: (branchId?: string, additionalHeaders?: Record<string, string>) => 
    api.get(branchId ? `/api/transaction?branchId=${branchId}` : '/api/transaction', additionalHeaders),
  
  createTransaction: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/transaction', data, additionalHeaders),
  
  getRecentSales: (branchId?: string, additionalHeaders?: Record<string, string>) => 
    api.get(branchId ? `/api/sales/recent?branchId=${branchId}` : '/api/sales/recent', additionalHeaders),

  // Branches
  getBranches: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/branch', additionalHeaders),
  
  createBranch: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/branch', data, additionalHeaders),
  
  updateBranch: (id: string, data: any, additionalHeaders?: Record<string, string>) => 
    api.patch(`/api/branch/${id}`, data, additionalHeaders),
  
  deleteBranch: (id: string, additionalHeaders?: Record<string, string>) => 
    api.delete(`/api/branch/${id}`, additionalHeaders),

  // Managers
  getManagers: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/manager', additionalHeaders),
  
  createManager: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/manager', data, additionalHeaders),
  
  updateManager: (id: string, data: any, additionalHeaders?: Record<string, string>) => 
    api.patch(`/api/manager/${id}`, data, additionalHeaders),
  
  deleteManager: (id: string, additionalHeaders?: Record<string, string>) => 
    api.delete(`/api/manager/${id}`, additionalHeaders),

  // Users
  getUsers: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/user', additionalHeaders),
  
  createUser: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/user', data, additionalHeaders),
  
  updateUser: (id: string, data: any, additionalHeaders?: Record<string, string>) => 
    api.patch(`/api/user/${id}`, data, additionalHeaders),
  
  deleteUser: (id: string, additionalHeaders?: Record<string, string>) => 
    api.delete(`/api/user/${id}`, additionalHeaders),

  // Billing
  getBilling: (branchId?: string, additionalHeaders?: Record<string, string>) => 
    api.get(branchId ? `/api/billing?branchId=${branchId}` : '/api/billing', additionalHeaders),
  
    createBilling: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/billing', data, additionalHeaders),

  // Warehouse
  getWarehouseStock: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/warehouse/stock', additionalHeaders),
  
  addWarehouseStock: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/warehouse/stock', data, additionalHeaders),
  
  transferStock: (data: any, additionalHeaders?: Record<string, string>) => 
    api.post('/api/warehouse/transfer', data, additionalHeaders),

  // Audit
  getEntityAuditTrail: (entityType: string, entityId: string, additionalHeaders?: Record<string, string>) => 
    api.get(`/api/audit/entity/${entityType}/${entityId}`, additionalHeaders),
  
  getUserActivity: (userId: string, additionalHeaders?: Record<string, string>) => 
    api.get(`/api/audit/user/${userId}`, additionalHeaders),
  
  getBranchActivity: (branchId: string, additionalHeaders?: Record<string, string>) => 
    api.get(`/api/audit/branch/${branchId}`, additionalHeaders),
  
  getSystemAuditLogs: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/audit/system', additionalHeaders),
  
  getAuditStatistics: (additionalHeaders?: Record<string, string>) => 
    api.get('/api/audit/statistics', additionalHeaders),

  // Health check (no auth required)
  healthCheck: (additionalHeaders?: Record<string, string>) => 
    fetch(`${config.apiUrl}/api/health`).then(res => res.json()),
};

export default api;

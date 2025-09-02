/**
 * Example component demonstrating how to use the new authenticated API utility
 * This shows the proper way to make API calls with automatic JWT token inclusion
 */

import React, { useState, useEffect } from 'react';
import { apiEndpoints, api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface ExampleData {
  id: string;
  name: string;
  // Add other fields as needed
}

const ExampleAuthenticatedComponent: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ExampleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Example 1: Using predefined API endpoints
  const fetchDataWithEndpoints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // These calls automatically include the JWT token
      const [inventory, suppliers, branches] = await Promise.all([
        apiEndpoints.getInventory(user?.branchId),
        apiEndpoints.getSuppliers(),
        apiEndpoints.getBranches(),
      ]);
      
      console.log('Fetched data:', { inventory, suppliers, branches });
      // Process your data here
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Using the generic API utility
  const fetchDataWithGenericAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // GET request with automatic token
      const inventoryData = await api.get('/api/inventory');
      
      // POST request with automatic token
      const newItem = await api.post('/api/inventory', {
        name: 'New Product',
        stock: 100,
        price: 25.99,
        // ... other fields
      });
      
      // PATCH request with automatic token
      const updatedItem = await api.patch(`/api/inventory/${newItem.id}`, {
        stock: 150,
      });
      
      console.log('API operations completed:', { inventoryData, newItem, updatedItem });
      
    } catch (err: any) {
      console.error('Error with API operations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: File upload with authentication
  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('branchId', user?.branchId || '');
      
      // Upload with automatic token
      const result = await api.upload('/api/inventory/import-excel', formData);
      console.log('Upload result:', result);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    }
  };

  // Example 4: Error handling for authentication failures
  const handleAuthenticatedRequest = async () => {
    try {
      // This will automatically handle 401 errors and redirect to login
      const data = await apiEndpoints.getInventory();
      setData(data);
      
    } catch (err: any) {
      if (err.message.includes('Authentication failed')) {
        // User will be automatically redirected to login
        console.log('User needs to log in again');
      } else {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchDataWithEndpoints();
    }
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Authenticated API Examples</h2>
      
      <div className="space-y-4">
        <button
          onClick={fetchDataWithEndpoints}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Fetch Data with Endpoints
        </button>
        
        <button
          onClick={fetchDataWithGenericAPI}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Fetch Data with Generic API
        </button>
        
        <button
          onClick={handleAuthenticatedRequest}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Test Authentication Handling
        </button>
      </div>
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Current User:</h3>
        <p>Name: {user?.name}</p>
        <p>Role: {user?.role}</p>
        <p>Branch: {user?.branchName || 'N/A'}</p>
      </div>
    </div>
  );
};

export default ExampleAuthenticatedComponent;

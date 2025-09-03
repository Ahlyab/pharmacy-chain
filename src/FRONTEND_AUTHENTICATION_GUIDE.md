# Frontend Authentication Guide

## Overview
This guide explains how to use the new authenticated API utility in the frontend to ensure all API calls include the JWT bearer token automatically.

## Files Created/Modified

### 1. `src/utils/api.ts` (NEW)
- **Purpose**: Centralized API utility with automatic JWT token inclusion
- **Features**:
  - Automatic token extraction from localStorage
  - Automatic token inclusion in all requests
  - Automatic 401 error handling and redirect to login
  - Predefined endpoints for common operations
  - Generic API methods (get, post, put, patch, delete, upload)

### 2. `src/contexts/AuthContext.tsx` (MODIFIED)
- **Changes**: Updated to use the new API utility for login and user restoration

### 3. `src/components/manager/Dashboard.tsx` (MODIFIED)
- **Changes**: Updated to use authenticated API calls

### 4. `src/components/manager/InventoryManagement.tsx` (MODIFIED)
- **Changes**: Updated key fetch operations to use authenticated API

### 5. `src/components/admin/TransactionHistory.tsx` (MODIFIED)
- **Changes**: Updated to use authenticated API calls

## How to Use the New API Utility

### 1. Import the API Utility
```typescript
import { apiEndpoints, api } from '../utils/api';
```

### 2. Using Predefined Endpoints (Recommended)
```typescript
// Get inventory with automatic authentication
const inventory = await apiEndpoints.getInventory(user?.branchId);

// Create new inventory item
const newItem = await apiEndpoints.createInventory({
  name: 'New Product',
  stock: 100,
  price: 25.99,
  // ... other fields
});

// Update inventory item
await apiEndpoints.updateInventory(itemId, { stock: 150 });

// Delete inventory item
await apiEndpoints.deleteInventory(itemId);
```

### 3. Using Generic API Methods
```typescript
// GET request with automatic token
const data = await api.get('/api/inventory');

// POST request with automatic token
const result = await api.post('/api/inventory', {
  name: 'New Product',
  stock: 100,
  price: 25.99,
});

// PATCH request with automatic token
await api.patch(`/api/inventory/${id}`, { stock: 150 });

// DELETE request with automatic token
await api.delete(`/api/inventory/${id}`);
```

### 4. File Upload with Authentication
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('branchId', user?.branchId || '');

const result = await api.upload('/api/inventory/import-excel', formData);
```

## Available Predefined Endpoints

### Authentication
- `apiEndpoints.login(email, password)`
- `apiEndpoints.signup(userData)`
- `apiEndpoints.getCurrentUser()`

### Inventory
- `apiEndpoints.getInventory(branchId?)`
- `apiEndpoints.createInventory(data)`
- `apiEndpoints.updateInventory(id, data)`
- `apiEndpoints.deleteInventory(id)`

### Suppliers
- `apiEndpoints.getSuppliers()`
- `apiEndpoints.createSupplier(data)`
- `apiEndpoints.updateSupplier(id, data)`
- `apiEndpoints.deleteSupplier(id)`

### Transactions
- `apiEndpoints.getTransactions(branchId?)`
- `apiEndpoints.createTransaction(data)`
- `apiEndpoints.getRecentSales(branchId?)`

### Branches
- `apiEndpoints.getBranches()`
- `apiEndpoints.createBranch(data)`
- `apiEndpoints.updateBranch(id, data)`
- `apiEndpoints.deleteBranch(id)`

### Managers
- `apiEndpoints.getManagers()`
- `apiEndpoints.createManager(data)`
- `apiEndpoints.updateManager(id, data)`
- `apiEndpoints.deleteManager(id)`

### Users
- `apiEndpoints.getUsers()`
- `apiEndpoints.createUser(data)`
- `apiEndpoints.updateUser(id, data)`
- `apiEndpoints.deleteUser(id)`

### Billing
- `apiEndpoints.getBilling(branchId?)`
- `apiEndpoints.createBilling(data)`

### Warehouse
- `apiEndpoints.getWarehouseStock()`
- `apiEndpoints.addWarehouseStock(data)`
- `apiEndpoints.transferStock(data)`

### Audit
- `apiEndpoints.getEntityAuditTrail(entityType, entityId)`
- `apiEndpoints.getUserActivity(userId)`
- `apiEndpoints.getBranchActivity(branchId)`
- `apiEndpoints.getSystemAuditLogs()`
- `apiEndpoints.getAuditStatistics()`

## Error Handling

### Automatic Authentication Error Handling
The API utility automatically handles authentication errors:

```typescript
try {
  const data = await apiEndpoints.getInventory();
  // Handle successful response
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    // User will be automatically redirected to login
    console.log('User needs to log in again');
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

### Manual Error Handling
```typescript
try {
  const data = await apiEndpoints.getInventory();
  setData(data);
} catch (error) {
  console.error('Failed to fetch inventory:', error);
  setError(error.message);
}
```

## Migration Guide

### Before (Old Way)
```typescript
// ❌ Old way - manual token handling
const response = await fetch(`${BASE_URL}/inventory`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
});
if (!response.ok) throw new Error('Failed to fetch');
const data = await response.json();
```

### After (New Way)
```typescript
// ✅ New way - automatic token handling
const data = await apiEndpoints.getInventory();
```

## Component Examples

### Example 1: Fetching Data on Component Mount
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const [inventory, suppliers] = await Promise.all([
        apiEndpoints.getInventory(user?.branchId),
        apiEndpoints.getSuppliers(),
      ]);
      setInventory(inventory);
      setSuppliers(suppliers);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    fetchData();
  }
}, [user]);
```

### Example 2: Form Submission
```typescript
const handleSubmit = async (formData) => {
  try {
    setIsSubmitting(true);
    await apiEndpoints.createInventory(formData);
    
    // Refresh data
    const updatedData = await apiEndpoints.getInventory();
    setData(updatedData);
    
    // Show success message
    Swal.fire('Success!', 'Item created successfully.', 'success');
  } catch (error) {
    Swal.fire('Error!', error.message, 'error');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Example 3: File Upload
```typescript
const handleFileUpload = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('branchId', user?.branchId || '');
    
    const result = await api.upload('/api/inventory/import-excel', formData);
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## Security Features

1. **Automatic Token Inclusion**: All requests automatically include the JWT token
2. **Token Validation**: Tokens are validated before each request
3. **Automatic Logout**: Invalid/expired tokens trigger automatic logout
4. **Error Handling**: Clear error messages for different failure scenarios
5. **Type Safety**: TypeScript support for better development experience

## Best Practices

1. **Use Predefined Endpoints**: Prefer `apiEndpoints` over generic `api` methods when available
2. **Handle Errors Gracefully**: Always wrap API calls in try-catch blocks
3. **Show Loading States**: Use loading states for better UX
4. **Refresh Data After Mutations**: Always refresh data after create/update/delete operations
5. **Use Branch Filtering**: Pass `user?.branchId` when fetching branch-specific data

## Testing

To test that authentication is working:

1. Open browser developer tools
2. Go to Network tab
3. Make an API request
4. Check that the `Authorization: Bearer <token>` header is included
5. Verify that 401 responses trigger logout

## Troubleshooting

### Common Issues

1. **"No authentication token found"**: User needs to log in
2. **"Authentication failed"**: Token is invalid or expired
3. **Network errors**: Check if backend server is running
4. **CORS errors**: Ensure backend CORS is configured properly

### Debug Tips

1. Check localStorage for the token: `localStorage.getItem('token')`
2. Verify token format in Network tab
3. Check console for error messages
4. Ensure user is logged in before making API calls

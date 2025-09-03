# Token Testing Guide

## Overview
This guide explains how to test and verify that JWT tokens are being sent properly from the frontend to the backend.

## Quick Testing Methods

### 1. Using the Token Debugger Component
Navigate to `/debug-token` in your browser after logging in to access the comprehensive token testing interface.

### 2. Browser Developer Tools
1. Open browser developer tools (F12)
2. Go to the **Network** tab
3. Make an API request (e.g., navigate to a page that loads data)
4. Click on any API request
5. Check the **Request Headers** section
6. Look for: `Authorization: Bearer <your-jwt-token>`

### 3. Console Logging
The API utility now includes comprehensive logging. Check the browser console for:
- 🔐 Making authenticated API request
- 📡 API Response
- ✅ API Success
- ❌ API Error (if any)

## Testing Steps

### Step 1: Login and Verify Token Storage
```javascript
// In browser console
console.log('Token in localStorage:', localStorage.getItem('token'));
```

### Step 2: Test API Calls
```javascript
// Test using the API utility
import { apiEndpoints } from './utils/api';

// This should include the token automatically
apiEndpoints.getInventory().then(data => {
  console.log('Inventory data:', data);
}).catch(error => {
  console.error('Error:', error);
});
```

### Step 3: Manual Token Test
```javascript
// Test manual fetch with token
const token = localStorage.getItem('token');
fetch('/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('Response status:', response.status);
  return response.json();
}).then(data => {
  console.log('User data:', data);
});
```

## Common Issues and Solutions

### Issue 1: "No authentication token found"
**Cause**: Token not stored in localStorage
**Solution**: 
1. Ensure user is logged in
2. Check if login is storing the token: `localStorage.getItem('token')`

### Issue 2: "Authentication failed" (401 error)
**Cause**: Token is invalid or expired
**Solution**:
1. Check token expiration: Use the Token Debugger component
2. Log in again to get a fresh token

### Issue 3: Token not being sent in headers
**Cause**: Using old fetch methods instead of the API utility
**Solution**:
1. Use `apiEndpoints` or `api` from `src/utils/api.ts`
2. Don't use direct `fetch()` calls for authenticated endpoints

## Testing Checklist

- [ ] User can log in successfully
- [ ] Token is stored in localStorage after login
- [ ] Token format is valid (3 parts separated by dots)
- [ ] Token is not expired
- [ ] API calls include `Authorization: Bearer <token>` header
- [ ] Protected endpoints return data (not 401 errors)
- [ ] 401 errors trigger automatic logout
- [ ] Token is cleared on logout

## Debug Commands

### Check Token Info
```javascript
// In browser console
import { getTokenInfo, logTokenInfo } from './utils/tokenValidator';
logTokenInfo(); // Logs detailed token information
```

### Test Specific Endpoint
```javascript
// Test a specific endpoint
import { testTokenInclusion } from './utils/tokenValidator';
testTokenInclusion('/api/me').then(result => {
  console.log('Test result:', result);
});
```

### Verify Headers
```javascript
// Check what headers are being sent
import { createAuthenticatedHeaders } from './utils/tokenValidator';
console.log('Headers:', createAuthenticatedHeaders());
```

## Network Tab Verification

1. **Open Developer Tools** → Network tab
2. **Make an API request** (navigate to a page or click a button)
3. **Find the API request** in the network list
4. **Click on the request**
5. **Check Request Headers** section
6. **Look for**: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Expected Behavior

### Successful Token Inclusion
```
Request Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0... 
Content-Type: application/json
```

### Failed Token Inclusion
```
Request Headers:
Content-Type: application/json
(No Authorization header)
```

## Troubleshooting

### If tokens are not being sent:
1. Check if you're using the new API utility (`apiEndpoints` or `api`)
2. Verify the token exists in localStorage
3. Check browser console for error messages
4. Use the Token Debugger component for detailed analysis

### If you get 401 errors:
1. Check if the token is expired
2. Verify the token format is correct
3. Ensure the backend is running and accessible
4. Check if the JWT secret matches between frontend and backend

### If API calls work but you're not sure about tokens:
1. Use the Network tab to verify headers
2. Use the Token Debugger component
3. Check console logs for the 🔐 emoji messages

## Production Considerations

- Remove or disable debug logging in production
- Consider using httpOnly cookies instead of localStorage
- Implement token refresh mechanism
- Add rate limiting to prevent token abuse
- Monitor for suspicious authentication patterns

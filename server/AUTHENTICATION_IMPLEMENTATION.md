# JWT Authentication Implementation

## Overview
This document describes the JWT authentication middleware implementation for the pharmacy chain application.

## Files Created/Modified

### 1. `server/middleware/auth.js` (NEW)
- **Purpose**: Centralized authentication middleware
- **Exports**:
  - `authenticate`: Verifies JWT tokens and adds user info to request
  - `authorize`: Role-based authorization middleware
  - `authorizeBranch`: Branch-based authorization middleware

### 2. `server/routes/api.js` (MODIFIED)
- **Changes**: Applied authentication middleware to all protected routes
- **Public Routes** (no authentication required):
  - `POST /api/login` - User login
  - `POST /api/signup` - User registration
  - `GET /api/health` - Health check

### 3. `server/routes/warehouse.js` (MODIFIED)
- **Changes**: Applied authentication to all warehouse routes

### 4. `server/routes/audit.js` (MODIFIED)
- **Changes**: Applied authentication to all audit routes with admin-only restrictions

## Authentication Flow

### 1. Login Process
```javascript
POST /api/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "role": "Manager",
  "branchId": "branch_id",
  "branchName": "Branch Name"
}
```

### 2. Using the Token
```javascript
// Include token in Authorization header
Authorization: Bearer <jwt_token>

// Example request
GET /api/inventory
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Route Protection Levels

### 1. Public Routes (No Authentication)
- `POST /api/login`
- `POST /api/signup`
- `GET /api/health`

### 2. Authenticated Routes (Require Valid JWT)
- All inventory routes (`/api/inventory/*`)
- All supplier routes (`/api/supplier/*`)
- All transaction routes (`/api/transaction/*`)
- All billing routes (`/api/billing/*`)
- All POS routes (`/api/pos/*`)
- All warehouse routes (`/api/warehouse/*`)
- Most audit routes (`/api/audit/*`)
- `GET /api/me` - Get current user info
- `GET /api/branch` - Get branches
- `GET /api/manager` - Get managers
- `GET /api/user` - Get users

### 3. Admin-Only Routes (Require Admin Role)
- `POST /api/branch` - Create branch
- `PATCH /api/branch/:id` - Update branch
- `DELETE /api/branch/:id` - Delete branch
- `POST /api/manager` - Create manager
- `PATCH /api/manager/:id` - Update manager
- `DELETE /api/manager/:id` - Delete manager
- `POST /api/user` - Create user
- `PATCH /api/user/:id` - Update user
- `DELETE /api/user/:id` - Delete user
- `GET /api/audit/system` - System audit logs
- `GET /api/audit/statistics` - Audit statistics
- `GET /api/audit/export` - Export audit logs
- `DELETE /api/audit/cleanup` - Cleanup old logs

## Middleware Features

### 1. Token Validation
- Verifies JWT signature
- Checks token expiration
- Validates user still exists in database
- Adds user info to `req.user`

### 2. Error Handling
- Clear error messages for different failure scenarios
- Proper HTTP status codes
- Detailed logging for debugging

### 3. Security Features
- Token format validation
- User existence verification
- Role-based access control
- Branch-based access control (for future use)

## Environment Variables

```bash
# Required
JWT_SECRET=your_jwt_secret_key_here

# Optional (fallback to default)
JWT_SECRET=your_jwt_secret_key_here
```

## Testing

### Manual Testing
1. Start the server: `npm run dev`
2. Run the test script: `node test-auth.js`
3. Verify all test cases pass

### Test Cases
1. ✅ Protected route without token → 401 Unauthorized
2. ✅ Protected route with invalid token → 401 Unauthorized
3. ✅ Public route without token → 200 OK
4. ✅ User signup → 201 Created
5. ✅ User login → 200 OK with token
6. ✅ Protected route with valid token → 200 OK
7. ✅ /me endpoint with valid token → 200 OK with user info

## Usage Examples

### Frontend Integration
```javascript
// Login and store token
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token } = await loginResponse.json();
localStorage.setItem('token', token);

// Use token for authenticated requests
const response = await fetch('/api/inventory', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### Backend Route Protection
```javascript
// Basic authentication
router.get('/protected-route', authenticate, handler);

// Admin-only route
router.post('/admin-route', authenticate, authorize('Admin'), handler);

// Multiple roles
router.get('/manager-route', authenticate, authorize('Admin', 'Manager'), handler);
```

## Security Considerations

1. **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended for production)
2. **Token Expiration**: Tokens expire after 1 hour
3. **Secret Key**: Use a strong, unique JWT secret in production
4. **HTTPS**: Always use HTTPS in production
5. **Token Refresh**: Implement token refresh mechanism for better UX

## Future Enhancements

1. **Token Refresh**: Implement refresh token mechanism
2. **Rate Limiting**: Add rate limiting to authentication endpoints
3. **Account Lockout**: Implement account lockout after failed attempts
4. **Multi-factor Authentication**: Add 2FA support
5. **Session Management**: Add session invalidation capabilities

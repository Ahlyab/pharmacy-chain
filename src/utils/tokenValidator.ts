/**
 * Token validation and debugging utilities
 * This helps ensure tokens are being sent properly from the frontend
 */

// Get the stored token from localStorage
export const getStoredToken = (): string | null => {
  return localStorage.getItem('token');
};

// Validate token format
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

// Decode JWT token (without verification - for debugging only)
export const decodeToken = (token: string): any => {
  try {
    if (!isValidTokenFormat(token)) {
      throw new Error('Invalid token format');
    }
    
    const parts = token.split('.');
    const payload = parts[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Get token info for debugging
export const getTokenInfo = (): {
  hasToken: boolean;
  isValidFormat: boolean;
  isExpired: boolean;
  decoded: any;
  timeUntilExpiry?: number;
} => {
  const token = getStoredToken();
  
  if (!token) {
    return {
      hasToken: false,
      isValidFormat: false,
      isExpired: true,
      decoded: null,
    };
  }
  
  const isValidFormat = isValidTokenFormat(token);
  const decoded = isValidFormat ? decodeToken(token) : null;
  const isExpired = isValidFormat ? isTokenExpired(token) : true;
  
  let timeUntilExpiry: number | undefined;
  if (decoded && decoded.exp) {
    const currentTime = Math.floor(Date.now() / 1000);
    timeUntilExpiry = decoded.exp - currentTime;
  }
  
  return {
    hasToken: true,
    isValidFormat,
    isExpired,
    decoded,
    timeUntilExpiry,
  };
};

// Log token info to console for debugging
export const logTokenInfo = (): void => {
  const tokenInfo = getTokenInfo();
  
  console.group('🔐 Token Debug Info');
  console.log('Has Token:', tokenInfo.hasToken);
  console.log('Valid Format:', tokenInfo.isValidFormat);
  console.log('Is Expired:', tokenInfo.isExpired);
  
  if (tokenInfo.decoded) {
    console.log('Decoded Token:', tokenInfo.decoded);
    console.log('User ID:', tokenInfo.decoded.id);
    console.log('Role:', tokenInfo.decoded.role);
    console.log('Issued At:', new Date(tokenInfo.decoded.iat * 1000));
    console.log('Expires At:', new Date(tokenInfo.decoded.exp * 1000));
    
    if (tokenInfo.timeUntilExpiry !== undefined) {
      if (tokenInfo.timeUntilExpiry > 0) {
        console.log('Time Until Expiry:', `${Math.floor(tokenInfo.timeUntilExpiry / 60)} minutes`);
      } else {
        console.log('Token is expired by:', `${Math.abs(Math.floor(tokenInfo.timeUntilExpiry / 60))} minutes`);
      }
    }
  }
  
  console.groupEnd();
};

// Create authenticated headers for manual fetch calls
export const createAuthenticatedHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Test function to verify token is being sent
export const testTokenInclusion = async (url: string): Promise<{
  success: boolean;
  tokenIncluded: boolean;
  response: any;
  error?: string;
}> => {
  try {
    const token = getStoredToken();
    
    if (!token) {
      return {
        success: false,
        tokenIncluded: false,
        response: null,
        error: 'No token found in localStorage',
      };
    }
    
    const headers = createAuthenticatedHeaders();
    
    console.log('🧪 Testing token inclusion for:', url);
    console.log('Headers being sent:', headers);
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const responseData = await response.json();
    
    return {
      success: response.ok,
      tokenIncluded: !!headers['Authorization'],
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      tokenIncluded: false,
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

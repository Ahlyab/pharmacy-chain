import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Pill, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check server connection status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        // Just check if the server responds at all - any response means it's online
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch('http://localhost:5000/api/me', {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Any response (even 401 unauthorized) means server is online
        setServerStatus('online');
      } catch (error) {
        // Network error, timeout, or server not responding
        setServerStatus('offline');
      }
    };

    // Check immediately
    checkServerStatus();
    
    // Check every 10 seconds to keep status updated
    const intervalId = setInterval(checkServerStatus, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password, navigate);
      if (!success) {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-blue-600 p-3 rounded-full">
              <Pill className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Drug Well Pharmacy</h2>
          <p className="text-gray-600">Sign in to your account</p>
          
          {/* Server Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {serverStatus === 'checking' && (
              <div className="flex items-center gap-2 text-yellow-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <span className="text-sm">Checking server...</span>
              </div>
            )}
            {serverStatus === 'online' && (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Server Online</span>
              </div>
            )}
            {serverStatus === 'offline' && (
              <div className="flex items-center gap-2 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Server Offline</span>
              </div>
            )}
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || serverStatus === 'offline'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : serverStatus === 'offline' ? 'Server Offline' : 'Sign In'}
          </button>

          <div className="text-center text-sm text-gray-500 mt-4">
            <p>Demo Credentials:</p>
            <p>Admin: admin@drugwell.com / admin123</p>
            <p>Manager: manager@drugwell.com / manager123</p>
            {serverStatus === 'offline' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 font-medium">⚠️ Server Connection Required</p>
                <p className="text-red-700 text-xs mt-1">
                  The backend server is not accessible. Please start the server before logging in.
                  <br />
                  Run: <code className="bg-red-100 px-1 rounded">npm run server</code>
                </p>
              </div>
            )}
            {serverStatus === 'online' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">✅ Server Connected</p>
                <p className="text-green-700 text-xs mt-1">
                  Backend server is running and accessible.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
/**
 * Token Debugger Component
 * This component helps debug and verify that JWT tokens are being sent properly
 */

import React, { useState, useEffect } from 'react';
import { getTokenInfo, logTokenInfo, testTokenInclusion, createAuthenticatedHeaders } from '../utils/tokenValidator';
import { apiEndpoints, api } from '../utils/api';
import config from '../config/env';

const TokenDebugger: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState(getTokenInfo());
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Update token info every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTokenInfo(getTokenInfo());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const runTokenTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    const tests = [
      {
        name: 'Test /api/me endpoint',
        url: `${config.apiUrl}/api/me`,
        test: () => apiEndpoints.getCurrentUser(),
      },
      {
        name: 'Test /api/inventory endpoint',
        url: `${config.apiUrl}/api/inventory`,
        test: () => apiEndpoints.getInventory(),
      },
      {
        name: 'Test /api/supplier endpoint',
        url: `${config.apiUrl}/api/supplier`,
        test: () => apiEndpoints.getSuppliers(),
      },
      {
        name: 'Test /api/branch endpoint',
        url: `${config.apiUrl}/api/branch`,
        test: () => apiEndpoints.getBranches(),
      },
      {
        name: 'Test generic API call',
        url: `${config.apiUrl}/api/manager`,
        test: () => api.get('/api/manager'),
      },
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`🧪 Running test: ${test.name}`);
        
        // Test with our API utility
        const startTime = Date.now();
        const response = await test.test();
        const endTime = Date.now();
        
        results.push({
          name: test.name,
          success: true,
          responseTime: endTime - startTime,
          response: response,
          error: null,
        });
        
        console.log(`✅ ${test.name} - Success (${endTime - startTime}ms)`);
      } catch (error: any) {
        results.push({
          name: test.name,
          success: false,
          responseTime: null,
          response: null,
          error: error.message,
        });
        
        console.error(`❌ ${test.name} - Failed:`, error.message);
      }
    }

    // Test manual fetch with token
    try {
      const manualTest = await testTokenInclusion(`${config.apiUrl}/api/me`);
      results.push({
        name: 'Manual fetch with token',
        success: manualTest.success,
        responseTime: null,
        response: manualTest.response,
        error: manualTest.error,
        tokenIncluded: manualTest.tokenIncluded,
      });
    } catch (error: any) {
      results.push({
        name: 'Manual fetch with token',
        success: false,
        responseTime: null,
        response: null,
        error: error.message,
        tokenIncluded: false,
      });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const copyTokenToClipboard = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigator.clipboard.writeText(token);
      alert('Token copied to clipboard!');
    }
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    setTokenInfo(getTokenInfo());
    alert('Token cleared from localStorage!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔐 Token Debugger</h1>
      
      {/* Token Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Token Information</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="font-medium">Has Token:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              tokenInfo.hasToken ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {tokenInfo.hasToken ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div>
            <span className="font-medium">Valid Format:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              tokenInfo.isValidFormat ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {tokenInfo.isValidFormat ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div>
            <span className="font-medium">Is Expired:</span>
            <span className={`ml-2 px-2 py-1 rounded text-sm ${
              tokenInfo.isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {tokenInfo.isExpired ? 'Yes' : 'No'}
            </span>
          </div>
          
          {tokenInfo.timeUntilExpiry !== undefined && (
            <div>
              <span className="font-medium">Time Until Expiry:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                tokenInfo.timeUntilExpiry > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {tokenInfo.timeUntilExpiry > 0 
                  ? `${Math.floor(tokenInfo.timeUntilExpiry / 60)} minutes`
                  : 'Expired'
                }
              </span>
            </div>
          )}
        </div>

        {tokenInfo.decoded && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-medium mb-2">Decoded Token:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(tokenInfo.decoded, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={logTokenInfo}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Log Token Info to Console
          </button>
          
          <button
            onClick={copyTokenToClipboard}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Copy Token to Clipboard
          </button>
          
          <button
            onClick={clearToken}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Token
          </button>
        </div>
      </div>

      {/* API Tests */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">API Tests</h2>
        
        <button
          onClick={runTokenTests}
          disabled={isRunningTests}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400 mb-4"
        >
          {isRunningTests ? 'Running Tests...' : 'Run Token Tests'}
        </button>

        {testResults.length > 0 && (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{result.name}</h3>
                    {result.responseTime && (
                      <p className="text-sm text-gray-600">
                        Response time: {result.responseTime}ms
                      </p>
                    )}
                    {result.tokenIncluded !== undefined && (
                      <p className="text-sm text-gray-600">
                        Token included: {result.tokenIncluded ? 'Yes' : 'No'}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                
                {result.error && (
                  <p className="text-red-600 text-sm mt-2">
                    Error: {result.error}
                  </p>
                )}
                
                {result.response && (
                  <details className="mt-2">
                    <summary className="text-sm text-gray-600 cursor-pointer">
                      View Response
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Headers Preview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Headers Being Sent</h2>
        
        <div className="bg-gray-50 p-4 rounded">
          <pre className="text-sm overflow-auto">
            {JSON.stringify(createAuthenticatedHeaders(), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TokenDebugger;

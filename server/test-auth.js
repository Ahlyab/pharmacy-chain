/**
 * Simple test script to verify JWT authentication middleware
 * Run with: node test-auth.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User',
  role: 'Manager'
};

async function testAuthentication() {
  console.log('🧪 Testing JWT Authentication Middleware...\n');

  try {
    // Test 1: Access protected route without token (should fail)
    console.log('1. Testing protected route without token...');
    const response1 = await fetch(`${BASE_URL}/inventory`);
    const result1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(result1)}`);
    console.log(`   ✅ Expected: 401 Unauthorized\n`);

    // Test 2: Access protected route with invalid token (should fail)
    console.log('2. Testing protected route with invalid token...');
    const response2 = await fetch(`${BASE_URL}/inventory`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    const result2 = await response2.json();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response: ${JSON.stringify(result2)}`);
    console.log(`   ✅ Expected: 401 Unauthorized\n`);

    // Test 3: Access public route without token (should succeed)
    console.log('3. Testing public route without token...');
    const response3 = await fetch(`${BASE_URL}/health`);
    const result3 = await response3.json();
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response: ${JSON.stringify(result3)}`);
    console.log(`   ✅ Expected: 200 OK\n`);

    // Test 4: Try to signup (should succeed)
    console.log('4. Testing signup...');
    const response4 = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    const result4 = await response4.json();
    console.log(`   Status: ${response4.status}`);
    console.log(`   Response: ${JSON.stringify(result4)}`);
    console.log(`   ✅ Expected: 201 Created or 400 if user exists\n`);

    // Test 5: Try to login (should succeed)
    console.log('5. Testing login...');
    const response5 = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const result5 = await response5.json();
    console.log(`   Status: ${response5.status}`);
    console.log(`   Response: ${JSON.stringify(result5)}`);
    
    if (response5.status === 200 && result5.token) {
      console.log(`   ✅ Login successful, token received\n`);
      
      // Test 6: Access protected route with valid token (should succeed)
      console.log('6. Testing protected route with valid token...');
      const response6 = await fetch(`${BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${result5.token}`
        }
      });
      const result6 = await response6.json();
      console.log(`   Status: ${response6.status}`);
      console.log(`   Response: ${JSON.stringify(result6)}`);
      console.log(`   ✅ Expected: 200 OK\n`);

      // Test 7: Access /me endpoint with valid token (should succeed)
      console.log('7. Testing /me endpoint with valid token...');
      const response7 = await fetch(`${BASE_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${result5.token}`
        }
      });
      const result7 = await response7.json();
      console.log(`   Status: ${response7.status}`);
      console.log(`   Response: ${JSON.stringify(result7)}`);
      console.log(`   ✅ Expected: 200 OK with user info\n`);

    } else {
      console.log(`   ❌ Login failed\n`);
    }

    console.log('🎉 Authentication tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
testAuthentication();

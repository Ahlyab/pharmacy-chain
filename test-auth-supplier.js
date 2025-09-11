// Test script to verify supplier delivery authentication
const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000';

// Test data
const testSupplierId = '507f1f77bcf86cd799439011'; // Replace with actual supplier ID
const testToken = 'your-test-token-here'; // Replace with actual token

async function testSupplierDeliveryAuth() {
  console.log('🧪 Testing Supplier Delivery Authentication...\n');

  // Test 1: Get deliveries without token (should fail)
  console.log('1. Testing GET deliveries without token...');
  try {
    const response = await fetch(`${API_URL}/api/supplier/${testSupplierId}/deliveries`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.status === 401) {
      console.log('   ✅ Correctly rejected without token');
    } else {
      console.log('   ❌ Should have been rejected');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: Get deliveries with invalid token (should fail)
  console.log('\n2. Testing GET deliveries with invalid token...');
  try {
    const response = await fetch(`${API_URL}/api/supplier/${testSupplierId}/deliveries`, {
      headers: {
        'Authorization': 'Bearer invalid-token-123'
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.status === 401) {
      console.log('   ✅ Correctly rejected invalid token');
    } else {
      console.log('   ❌ Should have been rejected');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Get deliveries with valid token (should succeed)
  console.log('\n3. Testing GET deliveries with valid token...');
  try {
    const response = await fetch(`${API_URL}/api/supplier/${testSupplierId}/deliveries`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.status === 200) {
      console.log('   ✅ Successfully authenticated');
      const data = await response.json();
      console.log(`   📦 Found ${data.length} deliveries`);
    } else {
      console.log('   ❌ Authentication failed');
      const errorData = await response.json();
      console.log(`   Error: ${errorData.message || errorData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 4: Create delivery with valid token (should succeed)
  console.log('\n4. Testing POST delivery with valid token...');
  try {
    const deliveryData = {
      date: '2024-01-15',
      deliveryTime: '10:30',
      products: 'Test Product',
      quantity: 10,
      notes: 'Test delivery',
      totalAmount: 100.50,
      invoiceNumber: 'INV-001'
    };

    const response = await fetch(`${API_URL}/api/supplier/${testSupplierId}/delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deliveryData)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    if (response.status === 201) {
      console.log('   ✅ Successfully created delivery');
      const data = await response.json();
      console.log(`   📦 Delivery ID: ${data._id}`);
    } else {
      console.log('   ❌ Failed to create delivery');
      const errorData = await response.json();
      console.log(`   Error: ${errorData.message || errorData.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🏁 Test completed!');
}

// Run the test
testSupplierDeliveryAuth().catch(console.error);

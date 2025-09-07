/**
 * Test script to verify Admin role functionality
 * Run with: node test-admin-role.js
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000/api";

// Test data for Admin user
const adminUser = {
  name: "Test Admin",
  email: "admin@test.com",
  password: "adminpassword123",
  phone: "1234567890",
  role: "Admin",
  status: "Active",
};

// Test data for regular Manager user
const managerUser = {
  name: "Test Manager",
  email: "manager@test.com",
  password: "managerpassword123",
  phone: "1234567891",
  role: "Manager",
  branchId: "507f1f77bcf86cd799439011", // Mock branch ID
  status: "Active",
};

async function testAdminRole() {
  console.log("🧪 Testing Admin Role Functionality...\n");

  try {
    // Test 1: Create Admin user (should succeed)
    console.log("1. Testing Admin user creation...");
    const response1 = await fetch(`${BASE_URL}/manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer your-admin-token-here", // Replace with actual admin token
      },
      body: JSON.stringify(adminUser),
    });
    const result1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(result1)}`);
    console.log(`   ✅ Expected: 201 Created or 400 if user exists\n`);

    // Test 2: Create Manager user (should succeed)
    console.log("2. Testing Manager user creation...");
    const response2 = await fetch(`${BASE_URL}/manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer your-admin-token-here", // Replace with actual admin token
      },
      body: JSON.stringify(managerUser),
    });
    const result2 = await response2.json();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response: ${JSON.stringify(result2)}`);
    console.log(`   ✅ Expected: 201 Created or 400 if user exists\n`);

    // Test 3: Get all managers (should include both Admin and Manager)
    console.log("3. Testing get all managers...");
    const response3 = await fetch(`${BASE_URL}/manager`, {
      headers: {
        Authorization: "Bearer your-admin-token-here", // Replace with actual admin token
      },
    });
    const result3 = await response3.json();
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response: ${JSON.stringify(result3)}`);
    console.log(`   ✅ Expected: 200 OK with list of managers\n`);

    // Test 4: Verify Admin user has no branch requirement
    console.log("4. Testing Admin user without branch...");
    const adminWithoutBranch = {
      name: "Admin No Branch",
      email: "adminnobranch@test.com",
      password: "adminpassword123",
      phone: "1234567892",
      role: "Admin",
      status: "Active",
      // No branchId provided
    };

    const response4 = await fetch(`${BASE_URL}/manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer your-admin-token-here", // Replace with actual admin token
      },
      body: JSON.stringify(adminWithoutBranch),
    });
    const result4 = await response4.json();
    console.log(`   Status: ${response4.status}`);
    console.log(`   Response: ${JSON.stringify(result4)}`);
    console.log(`   ✅ Expected: 201 Created (Admin doesn't need branch)\n`);

    // Test 5: Verify Manager user requires branch
    console.log("5. Testing Manager user without branch (should fail)...");
    const managerWithoutBranch = {
      name: "Manager No Branch",
      email: "managernobranch@test.com",
      password: "managerpassword123",
      phone: "1234567893",
      role: "Manager",
      status: "Active",
      // No branchId provided
    };

    const response5 = await fetch(`${BASE_URL}/manager`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer your-admin-token-here", // Replace with actual admin token
      },
      body: JSON.stringify(managerWithoutBranch),
    });
    const result5 = await response5.json();
    console.log(`   Status: ${response5.status}`);
    console.log(`   Response: ${JSON.stringify(result5)}`);
    console.log(`   ✅ Expected: 400 Bad Request (Manager needs branch)\n`);

    console.log("🎉 Admin role tests completed!");
    console.log(
      '\n📝 Note: Replace "your-admin-token-here" with an actual admin token to run these tests.'
    );
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

// Run the tests
testAdminRole();

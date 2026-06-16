const axios = require("axios");
const otpStore = require("./data/otpStore");

const BASE_URL = "http://localhost:5001/api";

async function testSecurity() {
  console.log("=== STARTING SECURITY AND RBAC AUDIT VERIFICATION ===");
  let failed = false;

  // 1. Test Unauthenticated Access to Admin routes (should be 401)
  try {
    console.log("\n1. Testing GET /api/users without authentication...");
    await axios.get(`${BASE_URL}/users`);
    console.error("❌ FAIL: Accessed /api/users without token.");
    failed = true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("✅ PASS: Blocked unauthenticated access with 401 Unauthorized.");
    } else {
      console.error(`❌ FAIL: Expected 401, got ${error.response ? error.response.status : error.message}`);
      failed = true;
    }
  }

  // 2. Test Unauthenticated Access to Maker workflow routes (should be 401)
  try {
    console.log("\n2. Testing GET /api/workflow/maker without authentication...");
    await axios.get(`${BASE_URL}/workflow/maker`);
    console.error("❌ FAIL: Accessed /api/workflow/maker without token.");
    failed = true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("✅ PASS: Blocked unauthenticated access with 401 Unauthorized.");
    } else {
      console.error(`❌ FAIL: Expected 401, got ${error.response ? error.response.status : error.message}`);
      failed = true;
    }
  }

  // 3. Log in as Admin and get Token
  let adminToken = "";
  try {
    console.log("\n3. Requesting OTP for Admin (tanushri.buddhadeo@1mg.com)...");
    await axios.post(`${BASE_URL}/auth/send-otp`, { email: "tanushri.buddhadeo@1mg.com" });
    
    // Retrieve OTP from local otpStore directly
    const otp = otpStore["tanushri.buddhadeo@1mg.com"];
    if (!otp) throw new Error("OTP not generated in otpStore");
    console.log(`   Found OTP in database: ${otp}`);

    console.log("   Verifying OTP to obtain token...");
    const res = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      email: "tanushri.buddhadeo@1mg.com",
      otp: otp
    });
    adminToken = res.data.token;
    if (adminToken) {
      console.log("✅ PASS: Authenticated successfully. Received Token.");
    } else {
      throw new Error("Token was missing from verification response.");
    }
  } catch (error) {
    console.error("❌ FAIL: Could not authenticate Admin:", error.message);
    failed = true;
  }

  // 4. Test Authorized Access as Admin (GET /api/users should be 200)
  if (adminToken) {
    try {
      console.log("\n4. Testing GET /api/users with Admin token...");
      const res = await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ PASS: Retrieved users list. Found ${res.data.length} users.`);
    } catch (error) {
      console.error(`❌ FAIL: Access denied for Admin: ${error.message}`);
      failed = true;
    }
  }

  // 5. Test Access Restriction (Admin accessing Maker workflow should be 403 Forbidden)
  if (adminToken) {
    try {
      console.log("\n5. Testing GET /api/workflow/maker with Admin token (Admin is not Maker)...");
      await axios.get(`${BASE_URL}/workflow/maker`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.error("❌ FAIL: Admin was allowed to access /api/workflow/maker.");
      failed = true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log("✅ PASS: Blocked access with 403 Forbidden.");
      } else {
        console.error(`❌ FAIL: Expected 403, got ${error.response ? error.response.status : error.message}`);
        failed = true;
      }
    }
  }

  // 6. Log in as Maker and get Token
  let makerToken = "";
  try {
    console.log("\n6. Requesting OTP for Maker (nandini.aggarwal@1mg.com)...");
    await axios.post(`${BASE_URL}/auth/send-otp`, { email: "nandini.aggarwal@1mg.com" });
    
    const otp = otpStore["nandini.aggarwal@1mg.com"];
    if (!otp) throw new Error("OTP not generated in otpStore");
    console.log(`   Found OTP in database: ${otp}`);

    console.log("   Verifying OTP to obtain token...");
    const res = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      email: "nandini.aggarwal@1mg.com",
      otp: otp
    });
    makerToken = res.data.token;
    if (makerToken) {
      console.log("✅ PASS: Authenticated Maker successfully. Received Token.");
    } else {
      throw new Error("Token was missing from verification response.");
    }
  } catch (error) {
    console.error("❌ FAIL: Could not authenticate Maker:", error.message);
    failed = true;
  }

  // 7. Test Authorized Access as Maker (GET /api/workflow/maker should be 200)
  if (makerToken) {
    try {
      console.log("\n7. Testing GET /api/workflow/maker with Maker token...");
      const res = await axios.get(`${BASE_URL}/workflow/maker`, {
        headers: { Authorization: `Bearer ${makerToken}` }
      });
      console.log("✅ PASS: Maker retrieved maker workflow queue successfully.");
    } catch (error) {
      console.error(`❌ FAIL: Access denied for Maker: ${error.message}`);
      failed = true;
    }
  }

  // 8. Test Access Restriction (Maker accessing Admin /api/users should be 403 Forbidden)
  if (makerToken) {
    try {
      console.log("\n8. Testing GET /api/users with Maker token (Maker is not Admin)...");
      await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${makerToken}` }
      });
      console.error("❌ FAIL: Maker was allowed to access admin users list.");
      failed = true;
    } catch (error) {
      if (error.response && error.response.status === 403) {
        console.log("✅ PASS: Blocked access with 403 Forbidden.");
      } else {
        console.error(`❌ FAIL: Expected 403, got ${error.response ? error.response.status : error.message}`);
        failed = true;
      }
    }
  }

  // 9. Verify History Route is accessible to any authenticated user
  if (makerToken) {
    try {
      console.log("\n9. Testing GET /api/workflow/history with Maker token...");
      const res = await axios.get(`${BASE_URL}/workflow/history`, {
        headers: { Authorization: `Bearer ${makerToken}` }
      });
      console.log("✅ PASS: Maker retrieved history successfully.");
    } catch (error) {
      console.error(`❌ FAIL: Access denied for history: ${error.message}`);
      failed = true;
    }
  }

  console.log("\n=== SECURITY AND RBAC AUDIT SUMMARY ===");
  if (failed) {
    console.error("❌ SYSTEM AUDIT FAILED: Some access control rules were bypassed or broken!");
    process.exit(1);
  } else {
    console.log("🎉 ALL TESTS PASSED: JWT authentication, Role-based Access Control (RBAC), and route protection are fully secure and functioning correctly!");
    process.exit(0);
  }
}

testSecurity();

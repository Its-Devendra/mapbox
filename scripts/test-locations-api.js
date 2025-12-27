/**
 * Script to test the locations API endpoints
 * Tests both GET and POST /api/locations/shalimar-evara
 * 
 * GET: Returns aggregated data from localhost:3000
 * POST: Aggregates from localhost:3000 and forwards to localhost:8000
 *
 * Run with: node scripts/test-locations-api.js
 * Make sure the dev server is running: npm run dev
 * Make sure localhost:8000 server is running for POST test
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const EXTERNAL_API_BASE = process.env.EXTERNAL_API_BASE || "http://localhost:8000";
const SLUG = "shalimar-evara";

async function testGETEndpoint() {
  console.log(`\n🧪 Testing GET /api/locations/${SLUG}\n`);
  console.log(`API Base: ${API_BASE}\n`);

  try {
    const url = `${API_BASE}/api/locations/${SLUG}`;

    console.log("📤 Sending GET request...");
    console.log(`URL: ${url}\n`);

    const response = await fetch(url);

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}\n`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error Response:");
      console.error(JSON.stringify(errorData, null, 2));
      return null;
    }

    const data = await response.json();

    console.log("✅ GET Success! Response received:");
    console.log(`\n📊 Summary:`);
    console.log(`   Total locations: ${data.length}`);

    if (data.length > 0) {
      // Group by category
      const byCategory = {};
      data.forEach((loc) => {
        const cat = loc.category || "unknown";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      console.log(`\n📁 By Category:`);
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });

      // Show sample locations
      console.log(`\n📍 Sample locations (first 3):`);
      data.slice(0, 3).forEach((loc, idx) => {
        console.log(`\n   ${idx + 1}. ${loc.name}`);
        console.log(`      Category: ${loc.category}`);
        console.log(
          `      Distance: ${
            loc.distance !== null ? loc.distance + " km" : "N/A"
          }`
        );
        console.log(
          `      Time: ${loc.time !== null ? loc.time + " min" : "N/A"}`
        );
      });
    } else {
      console.log("⚠️  No locations found for this project.");
    }

    return data;
  } catch (error) {
    console.error("\n❌ Error testing GET API:");
    console.error(error.message);

    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Tip: Make sure the dev server is running:");
      console.error("   npm run dev\n");
    }

    return null;
  }
}

async function testPOSTEndpoint() {
  console.log(`\n🧪 Testing POST /api/locations/${SLUG}\n`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`External API Base: ${EXTERNAL_API_BASE}\n`);

  try {
    const url = `${API_BASE}/api/locations/${SLUG}`;

    console.log("📤 Sending POST request...");
    console.log(`URL: ${url}`);
    console.log("Body: {} (empty - will use slug to find project)");
    console.log(`\nThis will:`);
    console.log(`  1. Fetch from ${API_BASE}/api/landmarks & /api/nearby`);
    console.log(`  2. Calculate distance/time using Mapbox`);
    console.log(`  3. POST aggregated data to ${EXTERNAL_API_BASE}/api/locations/${SLUG}\n`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}\n`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error Response:");
      console.error(JSON.stringify(errorData, null, 2));
      
      if (response.status === 503) {
        console.error("\n💡 Tip: Make sure the external API server is running on localhost:8000");
      }
      return null;
    }

    const data = await response.json();

    console.log("✅ POST Success! Response from localhost:8000:");
    
    // Handle different response formats
    if (Array.isArray(data)) {
      console.log(`\n📊 Summary:`);
      console.log(`   Total locations: ${data.length}`);
      
      if (data.length > 0) {
        console.log(`\n📍 Sample locations (first 3):`);
        data.slice(0, 3).forEach((loc, idx) => {
          console.log(`\n   ${idx + 1}. ${loc.name || loc.title || 'N/A'}`);
          console.log(`      Category: ${loc.category || 'N/A'}`);
        });
      }
    } else {
      console.log(`\n📊 Response Data:`);
      console.log(JSON.stringify(data, null, 2));
    }

    return data;
  } catch (error) {
    console.error("\n❌ Error testing POST API:");
    console.error(error.message);

    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Tip: Make sure both servers are running:");
      console.error("   - Dev server: npm run dev (localhost:3000)");
      console.error("   - External API: (localhost:8000)\n");
    }

    return null;
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("  Locations API Test Suite");
  console.log("=".repeat(60));

  // Test GET endpoint
  const getData = await testGETEndpoint();

  console.log("\n" + "-".repeat(60) + "\n");

  // Test POST endpoint
  const postData = await testPOSTEndpoint();

  console.log("\n" + "=".repeat(60));
  console.log("  Test Summary");
  console.log("=".repeat(60));
  console.log(`GET Endpoint:  ${getData ? "✅ Passed" : "❌ Failed"}`);
  console.log(`POST Endpoint: ${postData ? "✅ Passed" : "❌ Failed"}`);
  console.log("=".repeat(60) + "\n");
}

// Run the tests
runTests();

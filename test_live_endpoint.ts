// Using modern Node.js native global fetch

async function verifyEndpoint() {
  console.log("-----------------------------------------");
  console.log("📡 LIVE END-TO-END ENDPOINT VERIFICATION");
  console.log("-----------------------------------------");

  const url = "http://localhost:3000/api/agent/chat";
  
  // Test Case 1: Wikipedia Insert Request
  console.log("\n🧪 Test Case 1: Wikipedia Grounded Insert Request...");
  try {
    const res1 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Search Wikipedia for Dune Part Two and add it to our database", forceError: true })
    });
    
    if (!res1.ok) {
      throw new Error(`HTTP ${res1.status}: ${res1.statusText}`);
    }
    
    const data1: any = await res1.json();
    console.log(`✅ Status: ${res1.status}`);
    console.log(`💬 Agent Response Preview:\n${data1.text.substring(0, 300)}...\n`);
    console.log(`🛠️ Tool Logs executed:`, data1.toolLogs);
    
    if (data1.text.includes("Wikipedia Search Result") && data1.toolLogs.some((l: any) => l.toolName === "insert_movie")) {
      console.log("🎯 Test Case 1 PASS: Autopilot successfully performed live Wikipedia search & database insert!");
    } else {
      console.error("❌ Test Case 1 FAIL: Expected structured response and insertion logs.");
    }
  } catch (err: any) {
    console.error("❌ Test Case 1 FAIL with exception:", err.message);
  }

  // Test Case 2: Blockbuster Simulation Request
  console.log("\n🧪 Test Case 2: Blockbuster Forecasting Simulation...");
  try {
    const res2 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Simulate a Sci-Fi movie with a $150M budget and hybrid release track", forceError: true })
    });
    
    if (!res2.ok) {
      throw new Error(`HTTP ${res2.status}: ${res2.statusText}`);
    }
    
    const data2: any = await res2.json();
    console.log(`✅ Status: ${res2.status}`);
    console.log(`💬 Agent Response Preview:\n${data2.text.substring(0, 300)}...\n`);
    console.log(`🛠️ Tool Logs executed:`, data2.toolLogs);
    
    if (data2.text.includes("Blockbuster Performance Forecast") && data2.toolLogs.some((l: any) => l.toolName === "simulate_blockbuster_performance")) {
      console.log("🎯 Test Case 2 PASS: Autopilot successfully simulated blockbuster ROI!");
    } else {
      console.error("❌ Test Case 2 FAIL: Expected simulation text and tool logs.");
    }
  } catch (err: any) {
    console.error("❌ Test Case 2 FAIL with exception:", err.message);
  }

  // Test Case 3: SQL aggregate query request
  console.log("\n🧪 Test Case 3: SQL Analytics Query...");
  try {
    const res3 = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Which genre has the highest average ROI?", forceError: true })
    });
    
    if (!res3.ok) {
      throw new Error(`HTTP ${res3.status}: ${res3.statusText}`);
    }
    
    const data3: any = await res3.json();
    console.log(`✅ Status: ${res3.status}`);
    console.log(`💬 Agent Response Preview:\n${data3.text.substring(0, 300)}...\n`);
    console.log(`🛠️ Tool Logs executed:`, data3.toolLogs);
    
    if (data3.text.includes("SQL Analytical Result") && data3.toolLogs.some((l: any) => l.toolName === "run_analytical_query")) {
      console.log("🎯 Test Case 3 PASS: Autopilot successfully compiled and executed SQL queries against the local database!");
    } else {
      console.error("❌ Test Case 3 FAIL: Expected tabular SQL outputs and query log.");
    }
  } catch (err: any) {
    console.error("❌ Test Case 3 FAIL with exception:", err.message);
  }

  console.log("\n-----------------------------------------");
  console.log("🏁 E2E VERIFICATION COMPLETE");
  console.log("-----------------------------------------");
}

verifyEndpoint();

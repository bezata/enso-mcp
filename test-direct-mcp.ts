#!/usr/bin/env bun

// Test direct connection to the Enso MCP server
async function testMCPServer() {
  // Try both URLs - the custom domain and the generated one
  const urls = [
    "https://enso-mcp.vercel.app/api/mcp",
    "https://enso-9bfrhrquh-bezar.vercel.app/api/mcp"
  ];
  
  for (const serverUrl of urls) {
    console.log(`\n🔍 Testing MCP Server at: ${serverUrl}\n`);
    
    // Test 1: Basic GET request
    console.log("1. Testing GET request:");
    try {
      const getResponse = await fetch(serverUrl);
      const contentType = getResponse.headers.get("content-type");
      console.log("   Status:", getResponse.status, getResponse.statusText);
      console.log("   Content-Type:", contentType);
      
      if (contentType?.includes("application/json")) {
        const getData = await getResponse.json();
        console.log("✅ GET Response:", JSON.stringify(getData, null, 2));
      } else {
        const text = await getResponse.text();
        console.log("   Response (text):", text.substring(0, 200) + "...");
      }
    } catch (error) {
      console.error("❌ GET Error:", error);
    }
    
    console.log("\n2. Testing search_documentation tool:");
    try {
      const searchRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_documentation",
          arguments: {
            query: "bundle works",
            limit: 3
          }
        }
      };
      
      const response = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(searchRequest)
      });
      
      console.log("   Status:", response.status, response.statusText);
      const contentType = response.headers.get("content-type");
      console.log("   Content-Type:", contentType);
      
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        console.log("✅ Search Response:", JSON.stringify(data, null, 2));
        
        // Parse and display results if successful
        if (data.result?.content?.[0]?.text) {
          const results = JSON.parse(data.result.content[0].text);
          console.log("\n📚 Search Results for 'bundle works':");
          results.forEach((result: any, index: number) => {
            console.log(`\n${index + 1}. ${result.title}`);
            console.log(`   Path: ${result.path}`);
            console.log(`   Score: ${result.score}`);
            console.log(`   Excerpt: ${result.excerpt}`);
          });
        }
      } else {
        const text = await response.text();
        console.log("   Response (text):", text.substring(0, 200) + "...");
      }
    } catch (error) {
      console.error("❌ Search Error:", error);
    }
  }
}

testMCPServer(); 
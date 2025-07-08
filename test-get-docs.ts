#!/usr/bin/env bun

async function testGetDocs() {
  const serverUrl = "https://enso-mcp.vercel.app/api/mcp";
  
  console.log("🔍 Testing get_documentation endpoint...\n");
  
  try {
    // Test get_documentation
    const getDocsRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_documentation",
        arguments: {
          path: "primary-methods",
          format: "markdown"
        }
      }
    };
    
    console.log("Sending get_documentation request...");
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(getDocsRequest)
    });
    
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    
    if (data.result?.content?.[0]?.text) {
      console.log("\n📄 Documentation content:");
      console.log(data.result.content[0].text.substring(0, 500) + "...");
    }
    
    // Test with a different path
    console.log("\n🔍 Testing with api-reference path...");
    const getDocsRequest2 = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_documentation",
        arguments: {
          path: "api-reference/getting-started-with-bundle-api",
          format: "markdown"
        }
      }
    };
    
    const response2 = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(getDocsRequest2)
    });
    
    const data2 = await response2.json();
    console.log("Response 2:", JSON.stringify(data2, null, 2));
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testGetDocs(); 
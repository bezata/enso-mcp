#!/usr/bin/env bun

async function searchBundleHTTP() {
  const serverUrl = "https://enso-mcp.vercel.app/api/mcp";
  
  console.log("🔍 Searching Enso documentation for 'bundle'...\n");
  
  try {
    // First, let's check if the server is responding
    const healthCheck = await fetch(serverUrl, { method: "GET" });
    if (!healthCheck.ok) {
      console.error("❌ Server is not responding properly");
      return;
    }
    
    // Search for "bundle"
    const searchRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "search_documentation",
        arguments: {
          query: "bundle",
          limit: 5
        }
      }
    };
    
    console.log("Sending search request...");
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(searchRequest)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error("❌ Server error:", data.error);
      
      // If there's an error, let's try asking the AI instead
      console.log("\n🤖 Trying AI endpoint instead...\n");
      
      const aiRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "ask_enso_ai",
          arguments: {
            question: "What are bundles in Enso and how do they work?",
            includeContext: true
          }
        }
      };
      
      const aiResponse = await fetch(serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(aiRequest)
      });
      
      const aiData = await aiResponse.json();
      if (aiData.result?.content?.[0]?.text) {
        console.log("AI Response:");
        console.log(aiData.result.content[0].text);
      } else if (aiData.error) {
        console.error("❌ AI error:", aiData.error);
      }
    } else if (data.result?.content?.[0]?.text) {
      const results = JSON.parse(data.result.content[0].text);
      console.log(`\n📚 Found ${results.length} results:\n`);
      
      results.forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Path: ${result.path}`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Excerpt: ${result.excerpt}`);
        console.log();
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

searchBundleHTTP(); 
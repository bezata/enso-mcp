import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function searchForBundle() {
  console.log("🔍 Searching Enso documentation for 'bundle'...\n");
  
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@bezata/mcp-remote-client@latest", "https://enso-mcp.vercel.app/api/mcp"]
  });

  const client = new Client({
    name: "search-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("✅ Connected to Enso MCP server\n");

    // Search for "bundle"
    console.log("Searching for 'bundle'...");
    const searchResult = await client.callTool({
      name: "search_documentation",
      arguments: {
        query: "bundle",
        limit: 5
      }
    });
    
    if (searchResult.content && searchResult.content[0]) {
      const results = JSON.parse(searchResult.content[0].text);
      console.log(`\n📚 Found ${results.length} results:\n`);
      
      results.forEach((result: any, index: number) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   Path: ${result.path}`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Excerpt: ${result.excerpt}`);
        console.log();
      });
    }

    // Also ask AI about bundles
    console.log("\n🤖 Asking AI about bundles in Enso...\n");
    const aiResult = await client.callTool({
      name: "ask_enso_ai",
      arguments: {
        question: "What are bundles in Enso and how do they work?",
        includeContext: true
      }
    });
    
    if (aiResult.content && aiResult.content[0]) {
      console.log("AI Response:");
      console.log(aiResult.content[0].text);
    }

    await client.close();
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

searchForBundle().catch(console.error); 
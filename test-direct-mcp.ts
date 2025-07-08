import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testDirectConnection() {
  console.log("Testing direct MCP connection...");
  
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["@bezata/mcp-remote-client@latest", "https://enso-mcp.vercel.app/api/mcp"]
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");

    console.log("\nListing tools...");
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name));

    console.log("\nListing resources...");
    const resources = await client.listResources();
    console.log("Available resources:", resources.resources.map(r => r.uri));

    await client.close();
    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testDirectConnection().catch(console.error);
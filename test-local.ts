#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function testMCPServer() {
  console.log("🚀 Starting MCP Server test...\n");

  // Spawn the MCP server
  const serverProcess = spawn("node", ["--loader", "ts-node/esm", "src/index.ts"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env }
  });

  // Create MCP client
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--loader", "ts-node/esm", "src/index.ts"]
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log("✅ Connected to MCP server\n");

    // List available resources
    console.log("📚 Available Resources:");
    const resources = await client.listResources();
    resources.resources.forEach(r => {
      console.log(`  - ${r.name}: ${r.description}`);
    });

    // List available tools
    console.log("\n🛠️  Available Tools:");
    const tools = await client.listTools();
    tools.tools.forEach(t => {
      console.log(`  - ${t.name}: ${t.description}`);
    });

    // Test fetching documentation index
    console.log("\n📖 Testing resource fetch (Documentation Index):");
    const indexResource = await client.readResource({ uri: "enso://docs/index" });
    console.log(`  Retrieved ${indexResource.contents[0].text?.length || 0} characters`);

    // Test search functionality
    console.log("\n🔍 Testing search (query: 'authentication'):");
    const searchResult = await client.callTool({
      name: "search_documentation",
      arguments: { query: "authentication", limit: 3 }
    });
    console.log("  Search results:", searchResult.content[0].text);

    // Test getting specific documentation
    console.log("\n📄 Testing get documentation (path: 'introduction'):");
    const docResult = await client.callTool({
      name: "get_documentation",
      arguments: { path: "introduction" }
    });
    console.log(`  Retrieved ${docResult.content[0].text?.length || 0} characters`);

    // Test AI functionality (if API key is set)
    if (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'your-openai-api-key-here') {
      console.log("\n🤖 Testing AI Q&A:");
      const aiResult = await client.callTool({
        name: "ask_enso_ai",
        arguments: { 
          question: "What is Enso and how does it work?",
          includeContext: true
        }
      });
      console.log("  AI Response:", aiResult.content[0].text?.substring(0, 200) + "...");
    } else {
      console.log("\n⚠️  Skipping AI test (AI_API_KEY not configured)");
    }

    console.log("\n✅ All tests passed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Cleanup
    await client.close();
    serverProcess.kill();
  }
}

// Run the test
testMCPServer().catch(console.error);
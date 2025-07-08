#!/usr/bin/env bun
// Quick test to verify the server components work

import { DocumentationCache } from "./src/cache.js";
import { DocumentationService } from "./src/documentation-service.js";
import { AIService } from "./src/ai-service.js";

const ENSO_DOCS_URL = "https://docs.enso.build";

async function quickTest() {
  console.log("🧪 Quick MCP Server Component Test\n");

  // Test cache
  console.log("1️⃣ Testing Cache...");
  const cache = new DocumentationCache();
  await cache.set("test-key", "test-value");
  const cached = await cache.get("test-key");
  console.log(`   ✅ Cache working: ${cached === "test-value" ? "YES" : "NO"}`);

  // Test documentation service
  console.log("\n2️⃣ Testing Documentation Service...");
  const docService = new DocumentationService(ENSO_DOCS_URL, cache);
  try {
    await docService.initialize();
    console.log("   ✅ Documentation index loaded");
    
    const searchResults = await docService.searchDocumentation("introduction", 2);
    console.log(`   ✅ Search working: Found ${searchResults.length} results`);
  } catch (error) {
    console.log(`   ❌ Documentation service error: ${error.message}`);
  }

  // Test AI service
  console.log("\n3️⃣ Testing AI Service...");
  const aiService = new AIService();
  const hasValidKey = await aiService.validateConfiguration();
  if (hasValidKey) {
    console.log("   ✅ AI service configured correctly");
  } else {
    console.log("   ⚠️  AI service not configured (add your API key to .env.local)");
  }

  console.log("\n✨ Component test complete!");
}

quickTest().catch(console.error);
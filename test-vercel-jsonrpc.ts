#!/usr/bin/env bun
// Test script for the Vercel function with JSON-RPC protocol

async function testJsonRpc() {
  const baseUrl = 'http://localhost:3000/api/mcp';
  
  console.log('🧪 Testing Vercel Function with JSON-RPC...\n');
  
  // Test 1: GET request (info endpoint)
  console.log('📋 Testing GET request:');
  try {
    const response = await fetch(baseUrl, { method: 'GET' });
    const data = await response.json();
    console.log('✅ Server info:', data);
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Test 2: Initialize
  console.log('\n🚀 Testing initialize:');
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {}
      })
    });
    const data = await response.json();
    console.log('✅ Initialize response:', data);
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Test 3: List tools
  console.log('\n🛠️  Testing tools/list:');
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {}
      })
    });
    const data = await response.json();
    console.log('✅ Tools:', data.result?.tools?.map((t: any) => t.name).join(', '));
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Test 4: Call tool
  console.log('\n🔍 Testing tools/call (search):');
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "search_documentation",
          arguments: { query: "authentication", limit: 2 }
        }
      })
    });
    const data = await response.json();
    console.log('✅ Search results received:', data.result ? 'Success' : 'Failed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n✨ Test completed!');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testJsonRpc().catch(console.error);
}
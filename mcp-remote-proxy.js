#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const REMOTE_URL = process.env.MCP_REMOTE_URL || 'https://enso-mcp.vercel.app/api/mcp';

// Create a proxy server that forwards requests to the remote endpoint
const server = new Server(
  {
    name: 'enso-docs-remote-proxy',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Helper function to make JSON-RPC requests
async function makeJsonRpcRequest(method, params = {}) {
  const response = await fetch(REMOTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message);
  }
  return data.result;
}

// List available tools
server.setRequestHandler('tools/list', async () => {
  return await makeJsonRpcRequest('tools/list');
});

// List available resources
server.setRequestHandler('resources/list', async () => {
  return await makeJsonRpcRequest('resources/list');
});

// Read resources
server.setRequestHandler('resources/read', async (request) => {
  return await makeJsonRpcRequest('resources/read', request.params);
});

// Call tools
server.setRequestHandler('tools/call', async (request) => {
  return await makeJsonRpcRequest('tools/call', request.params);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Remote Proxy connected to:', REMOTE_URL);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
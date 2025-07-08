#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const REMOTE_URL = process.argv[2] || process.env.MCP_REMOTE_URL || 'https://enso-mcp.vercel.app/api/mcp';

// Create a proxy server
const server = new Server(
  {
    name: 'enso-docs-remote',
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
  try {
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
  } catch (error) {
    console.error(`Error calling ${method}:`, error);
    throw error;
  }
}

// Set up handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return await makeJsonRpcRequest('tools/list');
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return await makeJsonRpcRequest('resources/list');
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await makeJsonRpcRequest('resources/read', request.params);
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await makeJsonRpcRequest('tools/call', request.params);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Connected to remote MCP server:', REMOTE_URL);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
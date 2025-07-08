#!/usr/bin/env node

import { startRemoteClient } from './index.js';

// Get URL from command line arguments or environment variable
const url = process.argv[2] || process.env.MCP_REMOTE_URL;

if (!url) {
  console.error('Error: Remote URL is required');
  console.error('Usage: mcp-remote-client <url>');
  console.error('Or set MCP_REMOTE_URL environment variable');
  process.exit(1);
}

// Start the client
startRemoteClient(url).catch((error) => {
  console.error('Failed to start MCP remote client:', error);
  process.exit(1);
});
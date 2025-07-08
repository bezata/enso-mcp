# MCP Remote Client

A universal client for connecting to remote MCP (Model Context Protocol) servers over HTTP/HTTPS.

## Installation

```bash
npm install -g @bezata/mcp-remote-client
```

## Usage

### With Cursor IDE

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "your-remote-server": {
      "command": "npx",
      "args": ["-y", "@bezata/mcp-remote-client", "https://your-server.com/api/mcp"]
    }
  }
}
```

Or with environment variable:

```json
{
  "mcpServers": {
    "your-remote-server": {
      "command": "npx",
      "args": ["-y", "@bezata/mcp-remote-client"],
      "env": {
        "MCP_REMOTE_URL": "https://your-server.com/api/mcp"
      }
    }
  }
}
```

### Command Line

```bash
# Direct usage
mcp-remote-client https://your-server.com/api/mcp

# With environment variable
MCP_REMOTE_URL=https://your-server.com/api/mcp mcp-remote-client
```

## Example: Connecting to Enso MCP Server

```json
{
  "mcpServers": {
    "enso-docs": {
      "command": "npx",
      "args": ["-y", "@bezata/mcp-remote-client", "https://enso-mcp.vercel.app/api/mcp"]
    }
  }
}
```

## Requirements

- Node.js 18 or higher
- Remote server must implement MCP protocol over HTTP/HTTPS with JSON-RPC 2.0

## License

MIT
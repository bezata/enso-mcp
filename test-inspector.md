# Testing with MCP Inspector

MCP Inspector is the official debugging tool for MCP servers.

## Install MCP Inspector

```bash
bunx @modelcontextprotocol/inspector bun src/index.ts
```

This will:
1. Start your MCP server
2. Open a web interface at http://localhost:5173
3. Allow you to interact with all tools and resources

## What to Test

1. **Resources Tab**:
   - Click on "enso://docs/index" to see the documentation structure
   - Click on "enso://docs/full" to see all documentation

2. **Tools Tab**:
   - Test `get_documentation` with path: "introduction"
   - Test `search_documentation` with query: "authentication"
   - Test `ask_enso_ai` with question: "What is Enso?"

3. **Server Info Tab**:
   - Verify server name and version
   - Check capabilities

The inspector provides a user-friendly interface to test all MCP functionality!
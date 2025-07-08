# Enso MCP Server

An MCP (Model Context Protocol) server that provides access to Enso documentation hosted on Mintlify, with integrated AI capabilities.

## Features

- 📚 Access Enso documentation through MCP protocol
- 🔍 Search documentation with relevance scoring
- 🤖 AI-powered Q&A about Enso
- 💾 Intelligent caching for performance
- 🚀 Deploy on Vercel or run locally

## Installation

```bash
bun install
```

## Local Development

1. Copy `.env.example` to `.env.local` and add your OpenAI API key:
```bash
cp .env.example .env.local
```

2. Run in development mode:
```bash
bun run dev
```

3. Build for production:
```bash
bun run build
```

## Configure in Cursor

1. Copy the example configuration:
```bash
cp .cursor/mcp.json.example .cursor/mcp.json
```

2. Edit `.cursor/mcp.json` and update:
   - Replace `/path/to/your/enso-mcp` with your actual path
   - Add your OpenAI API key

```json
{
  "mcpServers": {
    "enso-docs-local": {
      "command": "bun",
      "args": ["run", "/path/to/your/enso-mcp/dist/index.js"],
      "env": {
        "MINTLIFY_BASE_URL": "https://docs.enso.build",
        "AI_API_KEY": "your-openai-api-key-here",
        "AI_ENDPOINT": "https://api.openai.com/v1/chat/completions",
        "AI_MODEL": "gpt-4o"
      }
    }
  }
}
```

## Deploying to Vercel

### 1. Install Vercel CLI
```bash
bun i -g vercel
```

### 2. Deploy
```bash
vercel
```

Follow the prompts to link to your Vercel account and project.

### 3. Configure Environment Variables

In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:
   - `MINTLIFY_BASE_URL`: `https://docs.enso.build`
   - `AI_API_KEY`: Your OpenAI API key
   - `AI_ENDPOINT`: `https://api.openai.com/v1/chat/completions`
   - `AI_MODEL`: `gpt-4`

### 4. Deploy to Production
```bash
vercel --prod
```

### 5. Configure Cursor with Deployed Server

After deployment, update your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "enso-docs": {
      "command": "bunx",
      "args": [
        "@modelcontextprotocol/mcp-remote", 
        "https://your-project-name.vercel.app/mcp"
      ]
    }
  }
}
```

## Environment Variables

- `MINTLIFY_BASE_URL`: Base URL for Mintlify docs (default: https://docs.enso.build)
- `AI_API_KEY`: OpenAI API key for AI features
- `AI_ENDPOINT`: AI API endpoint (default: OpenAI)
- `AI_MODEL`: AI model to use (default: gpt-4)

## Available Tools

- `get_documentation`: Fetch specific documentation page
- `search_documentation`: Search through documentation
- `ask_enso_ai`: Ask AI questions about Enso

## Resources

- `enso://docs/index`: Documentation structure
- `enso://docs/full`: Complete documentation

## License

MIT

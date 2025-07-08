# Deploying Enso MCP Server to Vercel

This guide walks you through deploying your Enso MCP server to Vercel's free tier.

## Prerequisites

- Bun installed locally
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account (free at vercel.com)
- OpenAI API key (or alternative AI provider)

## Step-by-Step Deployment

### 1. Prepare Your Project

Make sure all files are ready and dependencies are installed:

```bash
bun install
bun run build
```

### 2. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Enso MCP Server"
```

### 3. Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository
3. Push your code:

```bash
git remote add origin https://github.com/yourusername/enso-mcp.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure build settings:
   - Framework Preset: Other
   - Build Command: `bun run build`
   - Output Directory: `dist`
4. Add environment variables:
   - `MINTLIFY_BASE_URL`: `https://docs.enso.build`
   - `AI_API_KEY`: Your OpenAI API key (mark as sensitive)
   - `AI_ENDPOINT`: `https://api.openai.com/v1/chat/completions`
   - `AI_MODEL`: `gpt-4`
5. Click "Deploy"

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
bun i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add AI_API_KEY
vercel env add MINTLIFY_BASE_URL
vercel env add AI_ENDPOINT
vercel env add AI_MODEL

# Deploy to production
vercel --prod
```

### 5. Test Your Deployment

Your MCP server will be available at:
```
https://your-project-name.vercel.app/mcp
```

Test it with curl:
```bash
curl https://your-project-name.vercel.app/mcp
```

### 6. Configure Cursor to Use Your Deployed Server

Install the MCP remote client:
```bash
bun i -g @modelcontextprotocol/mcp-remote
```

Update your `.cursor/mcp.json`:

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

### 7. Verify in Cursor

1. Restart Cursor IDE
2. Open the command palette (Cmd/Ctrl + Shift + P)
3. Run "MCP: List Tools"
4. You should see:
   - `get_documentation`
   - `search_documentation`
   - `ask_enso_ai`

## Troubleshooting

### Environment Variables Not Working

1. Make sure you've added them in Vercel dashboard
2. Redeploy after adding variables:
   ```bash
   vercel --prod
   ```

### CORS Errors

The `vercel.json` file already includes proper CORS headers. If you still have issues, check that your client is sending proper requests.

### Function Timeouts

Free tier has a 10-second limit. If you're hitting timeouts:
- Optimize your AI calls
- Use caching more aggressively
- Consider upgrading to Vercel Pro for 60-second timeouts

### Cold Starts

First requests after inactivity may be slow (3-5 seconds). This is normal for serverless functions.

## Monitoring

View logs in Vercel dashboard:
1. Go to your project
2. Click on "Functions" tab
3. View real-time logs

Or use CLI:
```bash
vercel logs
```

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Update: description of changes"
git push

# Vercel will automatically redeploy
```

Or manually:
```bash
vercel --prod
```

## Security Best Practices

1. **Never commit API keys** - Always use environment variables
2. **Rotate keys regularly** - Update in Vercel dashboard
3. **Monitor usage** - Check OpenAI dashboard for unusual activity
4. **Use rate limiting** - The server includes basic rate limiting

## Next Steps

1. Test all MCP tools in Cursor
2. Monitor usage and performance
3. Consider adding custom tools for your specific needs
4. Join the MCP community for updates and support

Remember to update `your-project-name` in all examples with your actual Vercel project URL!
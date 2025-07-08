import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DocumentationCache } from '../src/cache.js';
import { DocumentationService } from '../src/documentation-service.js';
import { AIService } from '../src/ai-service.js';

const ENSO_DOCS_URL = process.env.MINTLIFY_BASE_URL || "https://docs.enso.build";

// Create instances
const cache = new DocumentationCache();
const docService = new DocumentationService(ENSO_DOCS_URL, cache);
const aiService = new AIService();

let initialized = false;
const initialize = async () => {
  if (!initialized) {
    await docService.initialize();
    initialized = true;
  }
};

// Helper to set CORS headers
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For MCP remote client compatibility
  if (req.method === 'GET') {
    return res.status(200).json({
      name: "enso-docs-mcp",
      version: "1.0.0",
      description: "MCP server for Enso documentation with AI integration",
      capabilities: {
        tools: true,
        resources: true
      }
    });
  }

  try {
    await initialize();

    // Parse the request body - handle both direct JSON and MCP protocol format
    const body = req.body || {};
    
    // Handle MCP protocol messages
    if (body.jsonrpc === "2.0" && body.method) {
      const { method, params, id } = body;
      
      switch (method) {
        case "initialize":
          return res.status(200).json({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "0.1.0",
              capabilities: {
                tools: {},
                resources: {}
              },
              serverInfo: {
                name: "enso-docs-mcp",
                version: "1.0.0"
              }
            }
          });

        case "tools/list":
          return res.status(200).json({
            jsonrpc: "2.0",
            id,
            result: {
              tools: [
                {
                  name: "get_documentation",
                  description: "Fetch specific documentation page or section",
                  inputSchema: {
                    type: "object",
                    properties: {
                      path: {
                        type: "string",
                        description: "Documentation path (e.g., 'api-reference/introduction')"
                      },
                      format: {
                        type: "string",
                        enum: ["markdown", "structured"],
                        description: "Output format",
                        default: "markdown"
                      }
                    },
                    required: ["path"]
                  }
                },
                {
                  name: "search_documentation",
                  description: "Search through Enso documentation",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "Search query"
                      },
                      limit: {
                        type: "number",
                        description: "Maximum results to return",
                        default: 5
                      }
                    },
                    required: ["query"]
                  }
                },
                {
                  name: "ask_enso_ai",
                  description: "Ask questions about Enso using AI",
                  inputSchema: {
                    type: "object",
                    properties: {
                      question: {
                        type: "string",
                        description: "Your question about Enso"
                      },
                      includeContext: {
                        type: "boolean",
                        description: "Include relevant documentation context",
                        default: true
                      }
                    },
                    required: ["question"]
                  }
                }
              ]
            }
          });

        case "resources/list":
          return res.status(200).json({
            jsonrpc: "2.0",
            id,
            result: {
              resources: [
                {
                  uri: "enso://docs/index",
                  name: "Documentation Index",
                  description: "Enso documentation structure and navigation",
                  mimeType: "text/markdown"
                },
                {
                  uri: "enso://docs/full",
                  name: "Complete Documentation",
                  description: "All Enso documentation in one file",
                  mimeType: "text/markdown"
                }
              ]
            }
          });

        case "resources/read":
          const { uri } = params || {};
          
          switch (uri) {
            case "enso://docs/index": {
              const content = await docService.getDocumentationIndex();
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                  contents: [{
                    uri,
                    mimeType: "text/markdown",
                    text: content
                  }]
                }
              });
            }
            
            case "enso://docs/full": {
              const content = await docService.getFullDocumentation();
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                  contents: [{
                    uri,
                    mimeType: "text/markdown",
                    text: content
                  }]
                }
              });
            }
            
            default:
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                error: {
                  code: -32602,
                  message: `Unknown resource: ${uri}`
                }
              });
          }

        case "tools/call":
          const { name, arguments: args } = params || {};
          
          switch (name) {
            case "get_documentation": {
              const { path, format } = args as { path: string; format?: string };
              const content = await docService.getDocumentationPage(path);
              
              if (format === "structured") {
                return res.status(200).json({
                  jsonrpc: "2.0",
                  id,
                  result: {
                    content: [{
                      type: "text",
                      text: JSON.stringify({
                        path,
                        content,
                        source: `${ENSO_DOCS_URL}/${path}`,
                        timestamp: new Date().toISOString()
                      }, null, 2)
                    }]
                  }
                });
              }
              
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                  content: [{
                    type: "text",
                    text: content
                  }]
                }
              });
            }
            
            case "search_documentation": {
              const { query, limit } = args as { query: string; limit?: number };
              const results = await docService.searchDocumentation(query, limit || 5);
              
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                  content: [{
                    type: "text",
                    text: JSON.stringify(results, null, 2)
                  }]
                }
              });
            }
            
            case "ask_enso_ai": {
              const { question, includeContext } = args as { 
                question: string; 
                includeContext?: boolean 
              };
              
              let context = "";
              if (includeContext !== false) {
                context = await docService.getRelevantContext(question);
              }
              
              const answer = await aiService.askQuestion(question, context);
              
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                result: {
                  content: [{
                    type: "text",
                    text: answer
                  }]
                }
              });
            }
            
            default:
              return res.status(200).json({
                jsonrpc: "2.0",
                id,
                error: {
                  code: -32601,
                  message: `Unknown tool: ${name}`
                }
              });
          }

        default:
          return res.status(200).json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`
            }
          });
      }
    }

    // Fallback for non-JSONRPC requests
    return res.status(400).json({ 
      error: 'Invalid request format. Expected JSON-RPC 2.0' 
    });

  } catch (error) {
    console.error('Error handling request:', error);
    
    // If it's a JSONRPC request, return JSONRPC error
    if (req.body?.jsonrpc === "2.0") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: req.body.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
    
    // Otherwise return regular error
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
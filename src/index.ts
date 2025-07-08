#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { DocumentationCache } from "./cache.js";
import { DocumentationService } from "./documentation-service.js";
import { AIService } from "./ai-service.js";

const ENSO_DOCS_URL = process.env.MINTLIFY_BASE_URL || "https://docs.enso.build";

class EnsoMCPServer {
  private server: Server;
  private cache: DocumentationCache;
  private docService: DocumentationService;
  private aiService: AIService;

  constructor() {
    this.cache = new DocumentationCache();
    this.docService = new DocumentationService(ENSO_DOCS_URL, this.cache);
    this.aiService = new AIService();
    
    this.server = new Server(
      {
        name: "enso-docs-mcp",
        version: "1.0.0"
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
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
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      switch (uri) {
        case "enso://docs/index": {
          const content = await this.docService.getDocumentationIndex();
          return {
            contents: [{
              uri,
              mimeType: "text/markdown",
              text: content
            }]
          };
        }
        
        case "enso://docs/full": {
          const content = await this.docService.getFullDocumentation();
          return {
            contents: [{
              uri,
              mimeType: "text/markdown",
              text: content
            }]
          };
        }
        
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case "get_documentation": {
          const { path, format } = args as { path: string; format?: string };
          const content = await this.docService.getDocumentationPage(path);
          
          if (format === "structured") {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  path,
                  content,
                  source: `${ENSO_DOCS_URL}/${path}`,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
          
          return {
            content: [{
              type: "text",
              text: content
            }]
          };
        }
        
        case "search_documentation": {
          const { query, limit } = args as { query: string; limit?: number };
          const results = await this.docService.searchDocumentation(query, limit || 5);
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2)
            }]
          };
        }
        
        case "ask_enso_ai": {
          const { question, includeContext } = args as { 
            question: string; 
            includeContext?: boolean 
          };
          
          let context = "";
          if (includeContext !== false) {
            context = await this.docService.getRelevantContext(question);
          }
          
          const answer = await this.aiService.askQuestion(question, context);
          
          return {
            content: [{
              type: "text",
              text: answer
            }]
          };
        }
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    await this.docService.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Enso MCP Server running");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EnsoMCPServer();
  server.start().catch(console.error);
}
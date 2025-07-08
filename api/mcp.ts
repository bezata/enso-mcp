import { createMCPAdapter } from '@vercel/mcp-adapter';
import { DocumentationCache } from '../src/cache';
import { DocumentationService } from '../src/documentation-service';
import { AIService } from '../src/ai-service';

const ENSO_DOCS_URL = process.env.MINTLIFY_BASE_URL || "https://docs.enso.build";

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

export default createMCPAdapter({
  tools: {
    get_documentation: {
      description: "Fetch specific documentation page or section",
      parameters: {
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
      },
      handler: async ({ path, format }) => {
        await initialize();
        const content = await docService.getDocumentationPage(path);
        
        if (format === "structured") {
          return {
            path,
            content,
            source: `${ENSO_DOCS_URL}/${path}`,
            timestamp: new Date().toISOString()
          };
        }
        
        return content;
      }
    },
    
    search_documentation: {
      description: "Search through Enso documentation",
      parameters: {
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
      },
      handler: async ({ query, limit = 5 }) => {
        await initialize();
        return await docService.searchDocumentation(query, limit);
      }
    },
    
    ask_enso_ai: {
      description: "Ask questions about Enso using AI",
      parameters: {
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
      },
      handler: async ({ question, includeContext = true }) => {
        await initialize();
        
        let context = "";
        if (includeContext) {
          context = await docService.getRelevantContext(question);
        }
        
        return await aiService.askQuestion(question, context);
      }
    }
  },
  
  resources: {
    "enso://docs/index": {
      name: "Documentation Index",
      description: "Enso documentation structure and navigation",
      mimeType: "text/markdown",
      handler: async () => {
        await initialize();
        return await docService.getDocumentationIndex();
      }
    },
    
    "enso://docs/full": {
      name: "Complete Documentation",
      description: "All Enso documentation in one file",
      mimeType: "text/markdown",
      handler: async () => {
        await initialize();
        return await docService.getFullDocumentation();
      }
    }
  }
});
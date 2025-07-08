import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

export class MCPRemoteClient {
  private server: Server;
  private remoteUrl: string;

  constructor(remoteUrl: string) {
    this.remoteUrl = remoteUrl;
    this.server = new Server(
      {
        name: 'mcp-remote-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async makeJsonRpcRequest(method: string, params: any = {}) {
    const response = await fetch(this.remoteUrl, {
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

  private setupHandlers() {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await this.makeJsonRpcRequest('tools/list');
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return await this.makeJsonRpcRequest('resources/list');
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return await this.makeJsonRpcRequest('resources/read', request.params);
    });

    // Call tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.makeJsonRpcRequest('tools/call', request.params);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP Remote Client connected to: ${this.remoteUrl}`);
  }
}

export async function startRemoteClient(url: string) {
  const client = new MCPRemoteClient(url);
  await client.start();
}
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { McpServerConfig } from "./config.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

interface ConnectedServer {
  config: McpServerConfig;
  client: Client;
  tools: Map<string, McpToolInfo>;
}

interface McpToolInfo {
  originalName: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/** OpenAI function names must match ^[a-zA-Z0-9_-]{1,64}$ - namespace + sanitize. */
function toOpenAiToolName(serverName: string, toolName: string): string {
  const raw = `${serverName}__${toolName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return raw.slice(0, 64);
}

/**
 * Owns connections to one or more remote MCP servers, exposes their tools
 * in OpenAI tool-calling format, and dispatches tool calls back to the
 * right server.
 */
export class McpManager {
  private servers = new Map<string, ConnectedServer>();
  private toolNameToServer = new Map<string, string>();

  async connectAll(configs: McpServerConfig[]): Promise<void> {
    for (const config of configs) {
      await this.connectOne(config);
    }
  }

  private async connectOne(config: McpServerConfig): Promise<void> {
    const url = new URL(config.url);
    const requestInit = config.headers ? { headers: config.headers } : undefined;

    const transport: Transport =
      config.transport === "sse"
        ? new SSEClientTransport(url, requestInit ? { requestInit } : undefined)
        : new StreamableHTTPClientTransport(url, requestInit ? { requestInit } : undefined);

    const client = new Client({ name: "openai-remote-mcp-bridge", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolMap = new Map<string, McpToolInfo>();
    for (const tool of tools) {
      const openAiName = toOpenAiToolName(config.name, tool.name);
      toolMap.set(openAiName, {
        originalName: tool.name,
        description: tool.description,
        inputSchema: (tool.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      });
      this.toolNameToServer.set(openAiName, config.name);
    }

    this.servers.set(config.name, { config, client, tools: toolMap });
  }

  getOpenAiTools(): ChatCompletionTool[] {
    const tools: ChatCompletionTool[] = [];
    for (const server of this.servers.values()) {
      for (const [openAiName, info] of server.tools) {
        tools.push({
          type: "function",
          function: {
            name: openAiName,
            description: info.description ?? `Tool "${info.originalName}" on MCP server "${server.config.name}"`,
            parameters: info.inputSchema,
          },
        });
      }
    }
    return tools;
  }

  async callTool(openAiToolName: string, args: Record<string, unknown>): Promise<string> {
    const serverName = this.toolNameToServer.get(openAiToolName);
    if (!serverName) {
      return `Error: unknown tool "${openAiToolName}"`;
    }
    const server = this.servers.get(serverName)!;
    const info = server.tools.get(openAiToolName)!;

    const result = await server.client.callTool({
      name: info.originalName,
      arguments: args,
    });

    if (Array.isArray(result.content)) {
      const text = result.content
        .map((block) => ("text" in block ? block.text : JSON.stringify(block)))
        .join("\n");
      return result.isError ? `Error from tool: ${text}` : text;
    }
    return JSON.stringify(result);
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.servers.values()].map((s) => s.client.close()));
  }
}

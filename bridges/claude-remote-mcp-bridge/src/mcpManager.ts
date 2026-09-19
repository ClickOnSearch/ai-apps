import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";
import type { McpServerConfig } from "./config.js";

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

/** Anthropic tool names must match ^[a-zA-Z0-9_-]{1,128}$ - namespace + sanitize. */
function toAnthropicToolName(serverName: string, toolName: string): string {
  const raw = `${serverName}__${toolName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return raw.slice(0, 128);
}

/**
 * Owns connections to one or more remote MCP servers, exposes their tools
 * in Anthropic tool-use format, and dispatches tool calls back to the
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

    const client = new Client({ name: "claude-remote-mcp-bridge", version: "0.1.0" }, { capabilities: {} });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolMap = new Map<string, McpToolInfo>();
    for (const tool of tools) {
      const anthropicName = toAnthropicToolName(config.name, tool.name);
      toolMap.set(anthropicName, {
        originalName: tool.name,
        description: tool.description,
        inputSchema: (tool.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      });
      this.toolNameToServer.set(anthropicName, config.name);
    }

    this.servers.set(config.name, { config, client, tools: toolMap });
  }

  getAnthropicTools(): Tool[] {
    const tools: Tool[] = [];
    for (const server of this.servers.values()) {
      for (const [anthropicName, info] of server.tools) {
        tools.push({
          name: anthropicName,
          description: info.description ?? `Tool "${info.originalName}" on MCP server "${server.config.name}"`,
          input_schema: info.inputSchema as Tool["input_schema"],
        });
      }
    }
    return tools;
  }

  async callTool(anthropicToolName: string, args: Record<string, unknown>): Promise<string> {
    const serverName = this.toolNameToServer.get(anthropicToolName);
    if (!serverName) {
      return `Error: unknown tool "${anthropicToolName}"`;
    }
    const server = this.servers.get(serverName)!;
    const info = server.tools.get(anthropicToolName)!;

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

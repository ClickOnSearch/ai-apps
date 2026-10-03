import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SKILLS } from "./index.js";

/**
 * Exposes every skill as an MCP "prompt" so any MCP client (GitHub
 * Copilot's agent mode, Claude Desktop, Cursor, Windsurf, ...) can list and
 * fetch skill instructions directly, without importing this package as a
 * TypeScript library.
 */
export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "agent-skills", version: "0.1.0" }, { capabilities: {} });

  for (const skill of Object.values(SKILLS)) {
    server.registerPrompt(skill.name, { description: skill.description }, async () => ({
      description: skill.description,
      messages: [
        {
          role: "user",
          content: { type: "text", text: skill.instructions },
        },
      ],
    }));
  }

  return server;
}

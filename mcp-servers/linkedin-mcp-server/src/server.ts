import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Express } from "express";
import type { LinkedInClient } from "./linkedin.js";

function buildMcpServer(linkedin: LinkedInClient): McpServer {
  const server = new McpServer({ name: "linkedin-mcp-server", version: "0.1.0" }, { capabilities: {} });

  server.registerTool(
    "get_profile",
    { description: "Get the authenticated LinkedIn member's basic profile (name, email, picture)", inputSchema: {} },
    async () => {
      const profile = await linkedin.getProfile();
      return { content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }] };
    },
  );

  server.registerTool(
    "create_post",
    {
      description: "Publish a text post to the authenticated member's own LinkedIn feed",
      inputSchema: { text: z.string().describe("Post text") },
    },
    async ({ text }: { text: string }) => {
      const result = await linkedin.createPost(text);
      return { content: [{ type: "text" as const, text: `Post published (id: ${result.id})` }] };
    },
  );

  return server;
}

/**
 * Builds the Express app: `POST /mcp` is the stateless MCP endpoint (a
 * fresh McpServer per request, matching the SDK's own reference server),
 * `GET /health` is a liveness check. Unlike whatsapp-mcp-server, there's no
 * push/events stream here — LinkedIn's API is pure request/response, there's
 * nothing to watch for.
 */
export function createServer(linkedin: LinkedInClient): Express {
  const app = createMcpExpressApp();

  app.post("/mcp", async (req, res) => {
    try {
      const server = buildMcpServer(linkedin);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
          id: null,
        });
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Express } from "express";
import { WhatsAppConnection, normalizeJid } from "./whatsapp.js";
import type { StoredMessage } from "./store.js";

function buildMcpServer(whatsapp: WhatsAppConnection): McpServer {
  const server = new McpServer({ name: "whatsapp-mcp-server", version: "0.1.0" }, { capabilities: {} });

  server.registerTool(
    "send_message",
    {
      description: "Send a WhatsApp text message to a contact or group",
      inputSchema: {
        to: z.string().describe("Phone number (e.g. 15551234567) or a raw WhatsApp JID"),
        text: z.string().describe("Message text to send"),
      },
    },
    async ({ to, text }: { to: string; text: string }) => {
      await whatsapp.sendMessage(to, text);
      return { content: [{ type: "text" as const, text: `Sent to ${to}` }] };
    },
  );

  server.registerTool(
    "list_chats",
    { description: "List known WhatsApp chats, including recent history synced on connect", inputSchema: {} },
    async () => {
      const chats = whatsapp.store.listChats();
      return { content: [{ type: "text" as const, text: JSON.stringify(chats, null, 2) }] };
    },
  );

  server.registerTool(
    "get_recent_messages",
    {
      description: "Get recent messages from a WhatsApp chat",
      inputSchema: {
        chat: z.string().describe("Chat JID or phone number"),
        limit: z.number().int().min(1).max(200).default(20).describe("Max messages to return"),
      },
    },
    async ({ chat, limit }: { chat: string; limit: number }) => {
      const messages = whatsapp.store.getRecentMessages(normalizeJid(chat), limit);
      return { content: [{ type: "text" as const, text: JSON.stringify(messages, null, 2) }] };
    },
  );

  server.registerTool(
    "search_contacts",
    {
      description: "Search known WhatsApp contacts by name or number",
      inputSchema: { query: z.string().describe("Name or number substring to search for") },
    },
    async ({ query }: { query: string }) => {
      const results = whatsapp.store.searchContacts(query);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    },
  );

  return server;
}

/**
 * Builds the Express app: `POST /mcp` is the MCP endpoint (stateless —
 * a fresh McpServer per request, matching the SDK's own stateless example),
 * `GET /events` is a plain SSE stream of incoming WhatsApp messages (not
 * part of MCP itself — MCP is request/response, so a consumer that wants
 * to react to new messages needs a separate push channel), and `GET /health`
 * reports connection status.
 */
export function createServer(whatsapp: WhatsAppConnection): Express {
  const app = createMcpExpressApp();

  app.post("/mcp", async (req, res) => {
    try {
      const server = buildMcpServer(whatsapp);
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
    res.json({ ok: true, connected: whatsapp.isReady, self: whatsapp.selfId ?? null });
  });

  app.get("/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(": connected\n\n");

    const onMessage = (message: StoredMessage) => {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    };
    whatsapp.on("message", onMessage);

    req.on("close", () => {
      whatsapp.off("message", onMessage);
    });
  });

  return app;
}

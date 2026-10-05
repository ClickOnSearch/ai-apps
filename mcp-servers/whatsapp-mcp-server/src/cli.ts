#!/usr/bin/env node
import "dotenv/config";
import { WhatsAppConnection } from "./whatsapp.js";
import { createServer } from "./server.js";
import { resolveListenConfig, type ListenConfig } from "./access.js";

async function main(): Promise<void> {
  let listen: ListenConfig;
  try {
    listen = resolveListenConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const authFolder = process.env.WHATSAPP_AUTH_DIR ?? "./whatsapp-auth";
  const port = Number(process.env.PORT ?? 4100);

  const whatsapp = new WhatsAppConnection(authFolder);
  await whatsapp.start();

  const app = createServer(whatsapp, listen);
  app.listen(port, listen.host, () => {
    const origin = `http://${listen.host.includes(":") ? `[${listen.host}]` : listen.host}:${port}`;
    console.error(`whatsapp-mcp-server listening on ${origin}`);
    console.error(`  MCP endpoint: POST ${origin}/mcp`);
    console.error(`  Events:       GET  ${origin}/events`);
    console.error(`  Health:       GET  ${origin}/health`);
    console.error(
      listen.authToken ? "  Auth:         bearer token required (WHATSAPP_MCP_TOKEN)" : "  Auth:         none (loopback only)",
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

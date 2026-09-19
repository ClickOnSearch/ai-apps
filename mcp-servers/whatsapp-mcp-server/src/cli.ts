#!/usr/bin/env node
import "dotenv/config";
import { WhatsAppConnection } from "./whatsapp.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const authFolder = process.env.WHATSAPP_AUTH_DIR ?? "./whatsapp-auth";
  const port = Number(process.env.PORT ?? 4100);

  const whatsapp = new WhatsAppConnection(authFolder);
  await whatsapp.start();

  const app = createServer(whatsapp);
  app.listen(port, () => {
    console.error(`whatsapp-mcp-server listening on http://localhost:${port}`);
    console.error(`  MCP endpoint: POST http://localhost:${port}/mcp`);
    console.error(`  Events:       GET  http://localhost:${port}/events`);
    console.error(`  Health:       GET  http://localhost:${port}/health`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

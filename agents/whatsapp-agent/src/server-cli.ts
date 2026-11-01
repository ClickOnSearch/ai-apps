#!/usr/bin/env node
import "dotenv/config";
import { createServer } from "./server.js";
import { resolveProvider, type Provider } from "./providers.js";

function main(): void {
  let defaultProvider: Provider;
  try {
    defaultProvider = resolveProvider();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const mcpServerUrl = process.env.WHATSAPP_MCP_URL ?? "http://127.0.0.1:4100";
  const port = Number(process.env.PORT ?? 3100);

  const app = createServer({ mcpServerUrl, defaultProvider });

  app.listen(port, () => {
    console.error(`whatsapp-agent AG-UI server listening on http://localhost:${port}`);
    console.error(`  AG-UI endpoint: POST http://localhost:${port}/agent`);
    console.error(`  Chat UI:        http://localhost:${port}/`);
    console.error(`  WhatsApp MCP server: ${mcpServerUrl}`);
    console.error(`  Default provider: ${defaultProvider} (override per-request via forwardedProps.provider)`);
  });
}

main();

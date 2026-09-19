#!/usr/bin/env node
import "dotenv/config";
import { createServer } from "./server.js";
import { isProvider, PROVIDERS, type Provider } from "./providers.js";

function resolveDefaultProvider(): Provider {
  const fromEnv = process.env.PROVIDER;
  if (isProvider(fromEnv)) return fromEnv;
  if (fromEnv) {
    throw new Error(`PROVIDER must be one of ${PROVIDERS.join(", ")}, got "${fromEnv}"`);
  }
  return "openai";
}

function main(): void {
  let defaultProvider: Provider;
  try {
    defaultProvider = resolveDefaultProvider();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const mcpServerUrl = process.env.WHATSAPP_MCP_URL ?? "http://localhost:4100";
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

#!/usr/bin/env node
import "dotenv/config";
import { startListener } from "./listener.js";
import { isProvider, PROVIDERS, type Provider } from "./providers.js";

function resolveProvider(): Provider {
  const fromEnv = process.env.PROVIDER;
  if (isProvider(fromEnv)) return fromEnv;
  if (fromEnv) {
    throw new Error(`PROVIDER must be one of ${PROVIDERS.join(", ")}, got "${fromEnv}"`);
  }
  return "openai";
}

async function main(): Promise<void> {
  let provider: Provider;
  try {
    provider = resolveProvider();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const mcpServerUrl = process.env.WHATSAPP_MCP_URL ?? "http://localhost:4100";

  console.error(`whatsapp-agent starting (provider: ${provider}, whatsapp-mcp-server: ${mcpServerUrl})`);

  await startListener({
    mcpServerUrl,
    provider,
    onLog: (line) => console.error(line),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

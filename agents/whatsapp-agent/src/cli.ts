#!/usr/bin/env node
import "dotenv/config";
import { startListener } from "./listener.js";
import { API_KEY_ENV, resolveProvider, type Provider } from "./providers.js";

async function main(): Promise<void> {
  let provider: Provider;
  try {
    provider = resolveProvider();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const keyVar = API_KEY_ENV[provider];
  if (!process.env[keyVar]) {
    console.error(
      `Missing ${keyVar}. Set it to use ${provider}, e.g.:\n  ${keyVar}=<your-key> npx @clickonsearch/whatsapp-agent\n` +
        "(or set another provider's API key, or PROVIDER=openai|claude|deepseek).",
    );
    process.exitCode = 1;
    return;
  }

  const mcpServerUrl = process.env.WHATSAPP_MCP_URL ?? "http://127.0.0.1:4100";

  console.error(`whatsapp-agent starting (initial provider: ${provider}, whatsapp-mcp-server: ${mcpServerUrl})`);

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

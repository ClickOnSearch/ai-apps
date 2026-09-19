#!/usr/bin/env node
import "dotenv/config";
import { createServer } from "./server.js";
import { isProvider, PROVIDERS, type Provider } from "./providers.js";

const DEFAULT_GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/";

function resolveDefaultProvider(): Provider {
  const fromEnv = process.env.PROVIDER;
  if (isProvider(fromEnv)) return fromEnv;
  if (fromEnv) {
    throw new Error(`PROVIDER must be one of ${PROVIDERS.join(", ")}, got "${fromEnv}"`);
  }
  return "openai";
}

function main(): void {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Missing GITHUB_TOKEN environment variable");
    process.exitCode = 1;
    return;
  }

  let defaultProvider: Provider;
  try {
    defaultProvider = resolveDefaultProvider();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const githubMcpUrl = process.env.GITHUB_MCP_URL ?? DEFAULT_GITHUB_MCP_URL;
  const port = Number(process.env.PORT ?? 3000);

  const app = createServer({ githubToken, githubMcpUrl, defaultProvider });

  app.listen(port, () => {
    console.error(`github-agent AG-UI server listening on http://localhost:${port}`);
    console.error(`  AG-UI endpoint: POST http://localhost:${port}/agent`);
    console.error(`  Chat UI:        http://localhost:${port}/`);
    console.error(`  Default provider: ${defaultProvider} (override per-request via forwardedProps.provider)`);
  });
}

main();

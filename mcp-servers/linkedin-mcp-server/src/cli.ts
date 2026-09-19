#!/usr/bin/env node
import "dotenv/config";
import { TokenManager, type LinkedInOAuthConfig } from "./auth.js";
import { LinkedInClient } from "./linkedin.js";
import { createServer } from "./server.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

function loadConfig(): LinkedInOAuthConfig {
  return {
    clientId: requireEnv("LINKEDIN_CLIENT_ID"),
    clientSecret: requireEnv("LINKEDIN_CLIENT_SECRET"),
    redirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3300/callback",
    scopes: (process.env.LINKEDIN_SCOPES ?? "openid profile email w_member_social").split(" "),
  };
}

async function main(): Promise<void> {
  let config: LinkedInOAuthConfig;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const tokenPath = process.env.LINKEDIN_TOKEN_PATH ?? "./linkedin-token.json";
  const port = Number(process.env.PORT ?? 4300);

  const tokens = new TokenManager(config, tokenPath);
  const linkedin = new LinkedInClient(tokens);
  const app = createServer(linkedin);

  app.listen(port, () => {
    console.error(`linkedin-mcp-server listening on http://localhost:${port}`);
    console.error(`  MCP endpoint: POST http://localhost:${port}/mcp`);
    console.error(`  Health:       GET  http://localhost:${port}/health`);
    console.error(`  If tools fail with "Not authorized yet", run: npm run authorize`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

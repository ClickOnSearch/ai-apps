#!/usr/bin/env node
import "dotenv/config";
import { TokenManager, type LinkedInOAuthConfig } from "./auth.js";
import { LinkedInClient } from "./linkedin.js";
import { createServer } from "./server.js";
import { resolveListenConfig, type ListenConfig } from "./access.js";

/**
 * clientId/clientSecret are only needed to refresh an expiring token (see
 * TokenManager.getValidAccessToken) — a still-valid saved token needs
 * neither, so this intentionally doesn't require them at startup.
 */
function loadConfig(): LinkedInOAuthConfig {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    redirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "http://localhost:3300/callback",
    scopes: (process.env.LINKEDIN_SCOPES ?? "openid profile email w_member_social").split(" "),
  };
}

async function main(): Promise<void> {
  let listen: ListenConfig;
  try {
    listen = resolveListenConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const tokenPath = process.env.LINKEDIN_TOKEN_PATH ?? "./linkedin-token.json";
  const port = Number(process.env.PORT ?? 4300);

  const tokens = new TokenManager(config, tokenPath);
  const linkedin = new LinkedInClient(tokens);
  const app = createServer(linkedin, listen);

  app.listen(port, listen.host, () => {
    const origin = `http://${listen.host.includes(":") ? `[${listen.host}]` : listen.host}:${port}`;
    console.error(`linkedin-mcp-server listening on ${origin}`);
    console.error(`  MCP endpoint: POST ${origin}/mcp`);
    console.error(`  Health:       GET  ${origin}/health`);
    console.error(
      listen.authToken ? "  Auth:         bearer token required (LINKEDIN_MCP_TOKEN)" : "  Auth:         none (loopback only)",
    );
    console.error(`  If tools fail with "Not authorized yet", run: npm run authorize`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

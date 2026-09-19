#!/usr/bin/env node
import "dotenv/config";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { buildAuthorizationUrl, exchangeCodeForToken, saveToken, type LinkedInOAuthConfig } from "./auth.js";

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

/**
 * One-time interactive OAuth2 flow: prints a consent URL, runs a throwaway
 * local HTTP server on the redirect URI to catch the authorization code,
 * exchanges it for a token, and saves it to disk. Re-run this whenever the
 * saved token expires and no refresh token was issued (see auth.ts).
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const tokenPath = process.env.LINKEDIN_TOKEN_PATH ?? "./linkedin-token.json";
  const state = randomBytes(16).toString("hex");
  const redirectUrl = new URL(config.redirectUri);
  const port = Number(redirectUrl.port || (redirectUrl.protocol === "https:" ? 443 : 80));

  const authUrl = buildAuthorizationUrl(config, state);

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (url.pathname !== redirectUrl.pathname) {
        res.writeHead(404).end();
        return;
      }

      const error = url.searchParams.get("error");
      const returnedState = url.searchParams.get("state");
      const authCode = url.searchParams.get("code");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end(`LinkedIn authorization failed: ${error}`);
        server.close();
        reject(new Error(`LinkedIn authorization failed: ${error}`));
        return;
      }
      if (returnedState !== state || !authCode) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("Invalid state or missing authorization code");
        server.close();
        reject(new Error("Invalid state or missing authorization code"));
        return;
      }

      res
        .writeHead(200, { "Content-Type": "text/plain" })
        .end("Authorized. You can close this tab and return to the terminal.");
      server.close();
      resolve(authCode);
    });

    server.listen(port, () => {
      console.error("Open this URL in a browser to authorize LinkedIn access:\n");
      console.error(authUrl);
      console.error(`\nWaiting for the redirect to ${config.redirectUri} ...`);
    });
  });

  const token = await exchangeCodeForToken(config, code);
  await saveToken(tokenPath, token);

  console.error(`\nAuthorized. Token saved to ${tokenPath}.`);
  if (!token.refreshToken) {
    console.error(
      "Note: LinkedIn did not return a refresh token (only issued to apps approved for offline access).\n" +
        "This access token lasts ~60 days; re-run this command after it expires.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

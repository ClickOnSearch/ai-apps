#!/usr/bin/env node
import "dotenv/config";
import { JiraClient } from "./jira.js";
import { createServer } from "./server.js";
import { resolveListenConfig, type ListenConfig } from "./access.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. See the README for how to create a Jira API token.`);
  return value;
}

function main(): void {
  let listen: ListenConfig;
  let jira: JiraClient;
  try {
    listen = resolveListenConfig();
    jira = new JiraClient({
      baseUrl: requireEnv("JIRA_BASE_URL"),
      email: requireEnv("JIRA_EMAIL"),
      apiToken: requireEnv("JIRA_API_TOKEN"),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env.PORT ?? 4400);
  const app = createServer(jira, listen, { defaultProject: process.env.JIRA_PROJECT_KEY });

  app.listen(port, listen.host, () => {
    const origin = `http://${listen.host.includes(":") ? `[${listen.host}]` : listen.host}:${port}`;
    console.error(`jira-mcp-server listening on ${origin}`);
    console.error(`  MCP endpoint: POST ${origin}/mcp`);
    console.error(`  Jira site:    ${new URL(process.env.JIRA_BASE_URL!).origin}`);
    console.error(
      listen.authToken ? "  Auth:         bearer token required (JIRA_MCP_TOKEN)" : "  Auth:         none (loopback only)",
    );
  });
}

main();

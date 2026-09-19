#!/usr/bin/env node
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { loadMcpConfig } from "./config.js";
import { McpManager } from "./mcpManager.js";
import { runAgent } from "./agent.js";

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error('Usage: claude-remote-mcp-bridge "<prompt>"');
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY environment variable");
    process.exitCode = 1;
    return;
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  const configPath = process.env.MCP_CONFIG_PATH ?? "./mcp.config.json";

  const mcpConfig = await loadMcpConfig(configPath);
  const mcp = new McpManager();
  await mcp.connectAll(mcpConfig.servers);

  try {
    const anthropic = new Anthropic({ apiKey });
    const answer = await runAgent({
      anthropic,
      model,
      userPrompt: prompt,
      mcp,
      onToolCall: (name, args) => {
        console.error(`[tool call] ${name}(${JSON.stringify(args)})`);
      },
    });
    console.log(answer);
  } finally {
    await mcp.closeAll();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

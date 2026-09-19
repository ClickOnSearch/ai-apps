#!/usr/bin/env node
import "dotenv/config";
import OpenAI from "openai";
import { loadMcpConfig } from "./config.js";
import { McpManager } from "./mcpManager.js";
import { runAgent } from "./agent.js";

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error('Usage: openai-remote-mcp-bridge "<prompt>"');
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY environment variable");
    process.exitCode = 1;
    return;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1";
  const configPath = process.env.MCP_CONFIG_PATH ?? "./mcp.config.json";

  const mcpConfig = await loadMcpConfig(configPath);
  const mcp = new McpManager();
  await mcp.connectAll(mcpConfig.servers);

  try {
    const openai = new OpenAI({ apiKey });
    const answer = await runAgent({
      openai,
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

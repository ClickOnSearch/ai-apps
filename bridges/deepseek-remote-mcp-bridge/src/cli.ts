#!/usr/bin/env node
import "dotenv/config";
import OpenAI from "openai";
import { loadMcpConfig } from "./config.js";
import { McpManager } from "./mcpManager.js";
import { runAgent } from "./agent.js";

const DEFAULT_BASE_URL = "https://api.deepseek.com";

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error('Usage: deepseek-remote-mcp-bridge "<prompt>"');
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("Missing DEEPSEEK_API_KEY environment variable");
    process.exitCode = 1;
    return;
  }

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const baseURL = process.env.DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;
  const configPath = process.env.MCP_CONFIG_PATH ?? "./mcp.config.json";

  const mcpConfig = await loadMcpConfig(configPath);
  const mcp = new McpManager();
  await mcp.connectAll(mcpConfig.servers);

  try {
    const deepseek = new OpenAI({ apiKey, baseURL });
    const answer = await runAgent({
      deepseek,
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

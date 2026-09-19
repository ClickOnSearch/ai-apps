#!/usr/bin/env node
import "dotenv/config";
import { runGithubAgent, type Provider } from "./providers.js";

const DEFAULT_GITHUB_MCP_URL = "https://api.githubcopilot.com/mcp/";

function parseArgs(argv: string[]): { provider?: Provider; prompt: string } {
  let provider: Provider | undefined;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--provider" || arg === "-p") {
      const value = argv[++i];
      if (value !== "openai" && value !== "claude") {
        throw new Error(`--provider must be "openai" or "claude", got "${value ?? "<missing>"}"`);
      }
      provider = value;
    } else {
      rest.push(arg);
    }
  }

  return { provider, prompt: rest.join(" ").trim() };
}

function resolveProvider(fromFlag: Provider | undefined): Provider {
  if (fromFlag) return fromFlag;

  const fromEnv = process.env.PROVIDER;
  if (fromEnv === "openai" || fromEnv === "claude") return fromEnv;
  if (fromEnv) {
    throw new Error(`PROVIDER must be "openai" or "claude", got "${fromEnv}"`);
  }

  return "openai";
}

async function main(): Promise<void> {
  const { provider: providerFlag, prompt } = parseArgs(process.argv.slice(2));

  if (!prompt) {
    console.error('Usage: github-agent [--provider openai|claude] "<prompt>"');
    console.error("(provider also settable via the PROVIDER env var; defaults to openai)");
    process.exitCode = 1;
    return;
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Missing GITHUB_TOKEN environment variable");
    process.exitCode = 1;
    return;
  }

  const provider = resolveProvider(providerFlag);
  const githubMcpUrl = process.env.GITHUB_MCP_URL ?? DEFAULT_GITHUB_MCP_URL;

  const answer = await runGithubAgent(provider, {
    prompt,
    githubToken,
    githubMcpUrl,
    onToolCall: (name, args) => {
      console.error(`[${provider}] tool call: ${name}(${JSON.stringify(args)})`);
    },
  });

  console.log(answer);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

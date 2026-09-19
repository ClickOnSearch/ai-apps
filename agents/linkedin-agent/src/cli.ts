#!/usr/bin/env node
import "dotenv/config";
import { runLinkedInAgent, isProvider, PROVIDERS, type Provider } from "./providers.js";

function parseArgs(argv: string[]): { provider?: Provider; prompt: string } {
  let provider: Provider | undefined;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--provider" || arg === "-p") {
      const value = argv[++i];
      if (!isProvider(value)) {
        throw new Error(`--provider must be one of ${PROVIDERS.join(", ")}, got "${value ?? "<missing>"}"`);
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
  if (isProvider(fromEnv)) return fromEnv;
  if (fromEnv) {
    throw new Error(`PROVIDER must be one of ${PROVIDERS.join(", ")}, got "${fromEnv}"`);
  }

  return "openai";
}

async function main(): Promise<void> {
  const { provider: providerFlag, prompt } = parseArgs(process.argv.slice(2));

  if (!prompt) {
    console.error(`Usage: linkedin-agent [--provider ${PROVIDERS.join("|")}] "<prompt>"`);
    console.error("(provider also settable via the PROVIDER env var; defaults to openai)");
    process.exitCode = 1;
    return;
  }

  const provider = resolveProvider(providerFlag);
  const linkedinMcpUrl = process.env.LINKEDIN_MCP_URL ?? "http://localhost:4300";

  const answer = await runLinkedInAgent(provider, {
    prompt,
    linkedinMcpUrl,
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

import type { McpServerConfig } from "openai-remote-mcp-bridge";

export type Provider = "openai" | "claude" | "deepseek";

/**
 * Single source of truth for which providers exist. Adding a new remote
 * MCP bridge means: add its `runWith*` function below, add it here, and
 * add its API key/model env vars to the README/.env.example. Everything
 * else (CLI flag validation, PROVIDER env validation, the AG-UI
 * forwardedProps.provider check) reads off this list.
 */
export const PROVIDERS: readonly Provider[] = ["openai", "claude", "deepseek"];

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export const GITHUB_SERVER_NAME = "github";

export function githubServerConfig(githubToken: string, url: string): McpServerConfig {
  return {
    name: GITHUB_SERVER_NAME,
    url,
    transport: "http",
    headers: { Authorization: `Bearer ${githubToken}` },
  };
}

export interface RunGithubAgentOptions {
  prompt: string;
  githubToken: string;
  githubMcpUrl: string;
  systemPrompt?: string;
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  onAssistantText?: (text: string) => void;
}

async function runWithOpenAi(options: RunGithubAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("openai-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([githubServerConfig(options.githubToken, options.githubMcpUrl)]);

  try {
    const openai = new OpenAI({ apiKey });
    return await runAgent({
      openai,
      model: process.env.OPENAI_MODEL ?? "gpt-4.1",
      systemPrompt: options.systemPrompt,
      userPrompt: options.prompt,
      mcp,
      onToolCall: options.onToolCall,
      onToolResult: options.onToolResult,
      onAssistantText: options.onAssistantText,
    });
  } finally {
    await mcp.closeAll();
  }
}

async function runWithClaude(options: RunGithubAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("claude-remote-mcp-bridge");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([githubServerConfig(options.githubToken, options.githubMcpUrl)]);

  try {
    const anthropic = new Anthropic({ apiKey });
    return await runAgent({
      anthropic,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      systemPrompt: options.systemPrompt,
      userPrompt: options.prompt,
      mcp,
      onToolCall: options.onToolCall,
      onToolResult: options.onToolResult,
      onAssistantText: options.onAssistantText,
    });
  } finally {
    await mcp.closeAll();
  }
}

async function runWithDeepSeek(options: RunGithubAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("deepseek-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([githubServerConfig(options.githubToken, options.githubMcpUrl)]);

  try {
    const deepseek = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    });
    return await runAgent({
      deepseek,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      systemPrompt: options.systemPrompt,
      userPrompt: options.prompt,
      mcp,
      onToolCall: options.onToolCall,
      onToolResult: options.onToolResult,
      onAssistantText: options.onAssistantText,
    });
  } finally {
    await mcp.closeAll();
  }
}

/** Runs the GitHub MCP agent through the requested provider's remote MCP bridge. */
export async function runGithubAgent(provider: Provider, options: RunGithubAgentOptions): Promise<string> {
  if (provider === "claude") return runWithClaude(options);
  if (provider === "deepseek") return runWithDeepSeek(options);
  return runWithOpenAi(options);
}

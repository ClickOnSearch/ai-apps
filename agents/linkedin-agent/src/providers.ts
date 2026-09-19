import type { McpServerConfig } from "@clickonsearch/openai-remote-mcp-bridge";

export type Provider = "openai" | "claude" | "deepseek";

/**
 * Mirrors agents/github-agent's and agents/whatsapp-agent's providers.ts.
 * Adding a new remote MCP bridge means: add its `runWith*` function below,
 * add it here, and add its API key/model env vars to the README/.env.example.
 */
export const PROVIDERS: readonly Provider[] = ["openai", "claude", "deepseek"];

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export const LINKEDIN_SERVER_NAME = "linkedin";

/** `baseUrl` is linkedin-mcp-server's origin (e.g. "http://localhost:4300") — its MCP endpoint is at /mcp. */
export function linkedinServerConfig(baseUrl: string): McpServerConfig {
  return { name: LINKEDIN_SERVER_NAME, url: new URL("/mcp", baseUrl).toString(), transport: "http" };
}

export const DEFAULT_SYSTEM_PROMPT = [
  "You are an assistant for the user's personal LinkedIn account. You have",
  "exactly two tools: get_profile (read their own profile) and create_post",
  "(publish a text post to their own feed). You cannot send messages or",
  "read/reply to anyone else's posts or messages — those aren't available",
  "via LinkedIn's public API. If asked to do something outside those two",
  "tools, say so plainly instead of pretending to do it.",
].join(" ");

export interface RunLinkedInAgentOptions {
  prompt: string;
  linkedinMcpUrl: string;
  systemPrompt?: string;
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  onAssistantText?: (text: string) => void;
}

async function runWithOpenAi(options: RunLinkedInAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/openai-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([linkedinServerConfig(options.linkedinMcpUrl)]);

  try {
    const openai = new OpenAI({ apiKey });
    return await runAgent({
      openai,
      model: process.env.OPENAI_MODEL ?? "gpt-4.1",
      systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
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

async function runWithClaude(options: RunLinkedInAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/claude-remote-mcp-bridge");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([linkedinServerConfig(options.linkedinMcpUrl)]);

  try {
    const anthropic = new Anthropic({ apiKey });
    return await runAgent({
      anthropic,
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
      systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
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

async function runWithDeepSeek(options: RunLinkedInAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/deepseek-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([linkedinServerConfig(options.linkedinMcpUrl)]);

  try {
    const deepseek = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    });
    return await runAgent({
      deepseek,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      systemPrompt: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
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

/** Runs the LinkedIn agent through the requested provider's remote MCP bridge. */
export async function runLinkedInAgent(provider: Provider, options: RunLinkedInAgentOptions): Promise<string> {
  if (provider === "claude") return runWithClaude(options);
  if (provider === "deepseek") return runWithDeepSeek(options);
  return runWithOpenAi(options);
}

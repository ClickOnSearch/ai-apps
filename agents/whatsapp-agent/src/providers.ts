import type { McpServerConfig } from "@clickonsearch/openai-remote-mcp-bridge";

export type Provider = "openai" | "claude" | "deepseek";

/**
 * Mirrors agents/github-agent/src/providers.ts. Adding a new remote MCP
 * bridge means: add its `runWith*` function below, add it here, and add
 * its API key/model env vars to the README/.env.example.
 */
export const PROVIDERS: readonly Provider[] = ["openai", "claude", "deepseek"];

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export const WHATSAPP_SERVER_NAME = "whatsapp";

/**
 * `baseUrl` is whatsapp-mcp-server's origin (e.g. "http://localhost:4100"),
 * the same value used for its /health and /events endpoints elsewhere in
 * this package — its actual MCP endpoint is at /mcp.
 */
export function whatsappServerConfig(baseUrl: string): McpServerConfig {
  return { name: WHATSAPP_SERVER_NAME, url: new URL("/mcp", baseUrl).toString(), transport: "http" };
}

export const DEFAULT_SYSTEM_PROMPT = [
  "You are a personal WhatsApp assistant. The user just messaged themselves",
  "on WhatsApp to give you an instruction. You have tools to send WhatsApp",
  "messages, list chats, read recent messages, and search contacts.",
  "Complete the requested task using those tools, then reply with a short,",
  "plain-text summary of what you did (or the answer, if it was a question).",
  "This summary is sent back to the user as a WhatsApp message, so keep it",
  "conversational and brief.",
].join(" ");

export interface RunAssistantAgentOptions {
  prompt: string;
  mcpServerUrl: string;
  systemPrompt?: string;
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  onAssistantText?: (text: string) => void;
}

async function runWithOpenAi(options: RunAssistantAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/openai-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([whatsappServerConfig(options.mcpServerUrl)]);

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

async function runWithClaude(options: RunAssistantAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/claude-remote-mcp-bridge");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([whatsappServerConfig(options.mcpServerUrl)]);

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

async function runWithDeepSeek(options: RunAssistantAgentOptions): Promise<string> {
  const { McpManager, runAgent } = await import("@clickonsearch/deepseek-remote-mcp-bridge");
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable");
  }

  const mcp = new McpManager();
  await mcp.connectAll([whatsappServerConfig(options.mcpServerUrl)]);

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

/** Runs the personal assistant through the requested provider's remote MCP bridge. */
export async function runAssistantAgent(provider: Provider, options: RunAssistantAgentOptions): Promise<string> {
  if (provider === "claude") return runWithClaude(options);
  if (provider === "deepseek") return runWithDeepSeek(options);
  return runWithOpenAi(options);
}

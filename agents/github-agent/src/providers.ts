import type { McpServerConfig } from "openai-remote-mcp-bridge";

export type Provider = "openai" | "claude";

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

/** Runs the GitHub MCP agent through the requested provider's remote MCP bridge. */
export async function runGithubAgent(provider: Provider, options: RunGithubAgentOptions): Promise<string> {
  return provider === "claude" ? runWithClaude(options) : runWithOpenAi(options);
}

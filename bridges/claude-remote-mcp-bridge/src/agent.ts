import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages.js";
import type { McpManager } from "./mcpManager.js";

/** One earlier turn of the conversation, as plain text. */
export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentOptions {
  anthropic: Anthropic;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  /**
   * Earlier turns of this conversation, oldest first. They are sent before `userPrompt`
   * so the model can follow the conversation. Tool calls from earlier turns are not replayed.
   */
  history?: HistoryMessage[];
  mcp: McpManager;
  maxTurns?: number;
  maxTokens?: number;
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  /** Fires for any assistant text produced on a turn, including turns that also call tools. */
  onAssistantText?: (text: string) => void;
}

/**
 * Runs a standard Claude tool-use loop, dispatching every tool call the
 * model makes to the connected remote MCP servers via `mcp`.
 */
export async function runAgent(options: RunAgentOptions): Promise<string> {
  const {
    anthropic,
    model,
    systemPrompt,
    userPrompt,
    history = [],
    mcp,
    maxTurns = 8,
    maxTokens = 1024,
    onToolCall,
    onToolResult,
    onAssistantText,
  } = options;

  const tools = mcp.getAnthropicTools();
  // The Messages API expects the conversation to open with a user turn.
  const firstUser = history.findIndex((m) => m.role === "user");
  const earlier = firstUser === -1 ? [] : history.slice(firstUser);
  const messages: MessageParam[] = [
    ...earlier.map((m): MessageParam => ({ role: m.role, content: m.content })),
    { role: "user", content: userPrompt },
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    messages.push({ role: "assistant", content: response.content });

    for (const block of response.content) {
      if (block.type === "text" && block.text) {
        onAssistantText?.(block.text);
      }
    }

    if (response.stop_reason !== "tool_use") {
      return response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { text: string }).text)
        .join("\n");
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      onToolCall?.(block.name, block.input, block.id);
      const result = await mcp.callTool(block.name, block.input as Record<string, unknown>);
      onToolResult?.(block.id, block.name, result);

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error(`Exceeded maxTurns (${maxTurns}) without a final answer`);
}

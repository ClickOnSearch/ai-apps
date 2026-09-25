import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { McpManager } from "./mcpManager.js";

/** One earlier turn of the conversation, as plain text. */
export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentOptions {
  /** An `openai` SDK client instance pointed at DeepSeek's OpenAI-compatible endpoint. */
  deepseek: OpenAI;
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
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  /** Fires for any assistant text produced on a turn, including turns that also call tools. */
  onAssistantText?: (text: string) => void;
}

/**
 * Runs a standard DeepSeek tool-calling loop (OpenAI-compatible Chat
 * Completions API), dispatching every tool call the model makes to the
 * connected remote MCP servers via `mcp`.
 */
export async function runAgent(options: RunAgentOptions): Promise<string> {
  const {
    deepseek,
    model,
    systemPrompt,
    userPrompt,
    history = [],
    mcp,
    maxTurns = 8,
    onToolCall,
    onToolResult,
    onAssistantText,
  } = options;

  const tools = mcp.getDeepSeekTools();
  const messages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  for (const m of history) messages.push({ role: m.role, content: m.content });
  messages.push({ role: "user", content: userPrompt });

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await deepseek.chat.completions.create({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("DeepSeek returned no message");
    }
    messages.push(message);

    if (message.content) {
      onAssistantText?.(message.content);
    }

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content ?? "";
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // leave args empty if the model produced malformed JSON
      }

      onToolCall?.(toolCall.function.name, args, toolCall.id);
      const result = await mcp.callTool(toolCall.function.name, args);
      onToolResult?.(toolCall.id, toolCall.function.name, result);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  throw new Error(`Exceeded maxTurns (${maxTurns}) without a final answer`);
}

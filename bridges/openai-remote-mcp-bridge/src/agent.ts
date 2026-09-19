import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { McpManager } from "./mcpManager.js";

export interface RunAgentOptions {
  openai: OpenAI;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  mcp: McpManager;
  maxTurns?: number;
  onToolCall?: (name: string, args: unknown, toolCallId: string) => void;
  onToolResult?: (toolCallId: string, name: string, result: string) => void;
  /** Fires for any assistant text produced on a turn, including turns that also call tools. */
  onAssistantText?: (text: string) => void;
}

/**
 * Runs a standard OpenAI tool-calling loop, dispatching every tool call
 * the model makes to the connected remote MCP servers via `mcp`.
 */
export async function runAgent(options: RunAgentOptions): Promise<string> {
  const {
    openai,
    model,
    systemPrompt,
    userPrompt,
    mcp,
    maxTurns = 8,
    onToolCall,
    onToolResult,
    onAssistantText,
  } = options;

  const tools = mcp.getOpenAiTools();
  const messages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await openai.chat.completions.create({
      model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("OpenAI returned no message");
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

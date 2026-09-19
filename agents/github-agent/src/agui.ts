import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { EventType, contentToText } from "@ag-ui/core";
import type { BaseEvent, Message, RunAgentInput } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { runGithubAgent, isProvider, type Provider } from "./providers.js";

/**
 * The bridges only take a single prompt string, not a structured message
 * history. To give the agent basic multi-turn continuity anyway, every
 * prior user/assistant message is flattened into a text transcript and
 * passed as a system preamble, and the most recent user message becomes
 * the actual prompt.
 */
function extractPrompt(messages: Message[]): { systemPrompt?: string; userPrompt: string } {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
  if (lastUserIndex === -1) {
    throw new Error("RunAgentInput.messages must include at least one user message");
  }

  const lastUser = messages[lastUserIndex] as Extract<Message, { role: "user" }>;
  const userPrompt = contentToText(lastUser.content);

  const transcript = messages
    .slice(0, lastUserIndex)
    .filter((m): m is Extract<Message, { role: "user" | "assistant" }> => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role}: ${m.role === "assistant" ? (m.content ?? "") : contentToText(m.content)}`)
    .filter((line) => line.length > "user: ".length || line.length > "assistant: ".length)
    .join("\n");

  return {
    systemPrompt: transcript ? `Prior conversation for context:\n${transcript}` : undefined,
    userPrompt,
  };
}

export interface RunAgUiRequestParams {
  input: RunAgentInput;
  githubToken: string;
  githubMcpUrl: string;
  defaultProvider: Provider;
  res: Response;
  acceptHeader?: string;
}

/**
 * Runs the GitHub MCP agent for one AG-UI `RunAgentInput`, streaming the
 * result to `res` as AG-UI protocol events (SSE by default).
 */
export async function runAgUiRequest(params: RunAgUiRequestParams): Promise<void> {
  const { input, githubToken, githubMcpUrl, defaultProvider, res, acceptHeader } = params;
  const encoder = new EventEncoder({ accept: acceptHeader });

  res.writeHead(200, {
    "Content-Type": encoder.getContentType(),
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const emit = (event: BaseEvent) => {
    res.write(encoder.encode(event));
  };

  const threadId = input.threadId ?? randomUUID();
  const runId = input.runId ?? randomUUID();

  emit({ type: EventType.RUN_STARTED, threadId, runId });

  try {
    const provider = isProvider(input.forwardedProps?.provider) ? input.forwardedProps.provider : defaultProvider;
    const { systemPrompt, userPrompt } = extractPrompt(input.messages);

    await runGithubAgent(provider, {
      prompt: userPrompt,
      systemPrompt,
      githubToken,
      githubMcpUrl,
      onAssistantText: (text) => {
        const messageId = randomUUID();
        emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
        emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text });
        emit({ type: EventType.TEXT_MESSAGE_END, messageId });
      },
      onToolCall: (name, args, toolCallId) => {
        emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: name });
        emit({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: JSON.stringify(args ?? {}) });
        emit({ type: EventType.TOOL_CALL_END, toolCallId });
      },
      onToolResult: (toolCallId, _name, result) => {
        emit({
          type: EventType.TOOL_CALL_RESULT,
          messageId: randomUUID(),
          toolCallId,
          content: result,
          role: "tool",
        });
      },
    });

    emit({ type: EventType.RUN_FINISHED, threadId, runId });
  } catch (error) {
    emit({
      type: EventType.RUN_ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    res.end();
  }
}

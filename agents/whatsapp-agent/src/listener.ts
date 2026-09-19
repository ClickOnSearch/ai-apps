import { setTimeout as sleep } from "node:timers/promises";
import { McpManager } from "@clickonsearch/openai-remote-mcp-bridge";
import { runAssistantAgent, whatsappServerConfig, type Provider } from "./providers.js";

interface WhatsAppMessageEvent {
  chatId: string;
  fromMe: boolean;
  senderName?: string;
  text: string;
  timestamp: number;
}

/** Polls the whatsapp-mcp-server's /health until it reports a connected session, returning the self JID. */
async function waitForSelfId(mcpServerUrl: string, onLog?: (line: string) => void): Promise<string> {
  const healthUrl = new URL("/health", mcpServerUrl).toString();

  for (;;) {
    try {
      const res = await fetch(healthUrl);
      const body = (await res.json()) as { connected: boolean; self: string | null };
      if (body.connected && body.self) return body.self;
    } catch {
      // whatsapp-mcp-server isn't up yet
    }
    onLog?.("Waiting for whatsapp-mcp-server to report a connected WhatsApp session...");
    await sleep(2000);
  }
}

/** Delivers the assistant's reply back to the user's own "Message yourself" chat. */
async function replyToSelf(mcpServerUrl: string, selfId: string, text: string): Promise<void> {
  const mcp = new McpManager();
  await mcp.connectAll([whatsappServerConfig(mcpServerUrl)]);
  try {
    await mcp.callTool("whatsapp__send_message", { to: selfId, text });
  } finally {
    await mcp.closeAll();
  }
}

export interface StartListenerOptions {
  mcpServerUrl: string;
  provider: Provider;
  onLog?: (line: string) => void;
}

/**
 * Connects to the whatsapp-mcp-server's SSE /events stream and watches for
 * messages the user sent to themselves — that's the "instruction inbox".
 * Each one runs through the agent loop (with the WhatsApp MCP tools
 * available) and the final answer is sent back to the same self-chat.
 */
export async function startListener(options: StartListenerOptions): Promise<void> {
  const { mcpServerUrl, provider, onLog } = options;

  const selfId = await waitForSelfId(mcpServerUrl, onLog);
  onLog?.(`Connected. Listening for instructions in your "Message yourself" chat (${selfId}).`);

  const eventsUrl = new URL("/events", mcpServerUrl).toString();
  const res = await fetch(eventsUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to connect to whatsapp-mcp-server's events stream: HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;

      let event: WhatsAppMessageEvent;
      try {
        event = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }

      if (!event.fromMe || event.chatId !== selfId) continue;

      onLog?.(`Instruction: ${event.text}`);

      try {
        const answer = await runAssistantAgent(provider, {
          prompt: event.text,
          mcpServerUrl,
          onToolCall: (name, args) => onLog?.(`  tool call: ${name}(${JSON.stringify(args)})`),
        });
        await replyToSelf(mcpServerUrl, selfId, answer.trim() || "Done.");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onLog?.(`  error: ${message}`);
        await replyToSelf(mcpServerUrl, selfId, `Sorry, something went wrong: ${message}`);
      }
    }
  }
}

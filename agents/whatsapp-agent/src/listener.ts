import { setTimeout as sleep } from "node:timers/promises";
import { McpManager } from "@clickonsearch/openai-remote-mcp-bridge";
import { runAssistantAgent, whatsappAuthHeaders, whatsappServerConfig, type Provider } from "./providers.js";

interface WhatsAppMessageEvent {
  chatId: string;
  fromMe: boolean;
  /**
   * Computed by whatsapp-mcp-server, which owns the real identity data.
   * Do NOT re-derive this by comparing `chatId` to the self JID here —
   * WhatsApp's LID rollout means a chat's `remoteJid` and the self JID
   * reported at connect time can be in different, non-comparable JID
   * namespaces (@lid vs @s.whatsapp.net) even when they refer to you.
   */
  isSelfChat: boolean;
  senderName?: string;
  text: string;
  timestamp: number;
}

class UnauthorizedError extends Error {
  constructor() {
    super("whatsapp-mcp-server rejected our credentials (HTTP 401). Set WHATSAPP_MCP_TOKEN to the same value the server uses.");
  }
}

/** Polls the whatsapp-mcp-server's /health until it reports a connected session, returning the self JID. */
async function waitForSelfId(mcpServerUrl: string, onLog?: (line: string) => void): Promise<string> {
  const healthUrl = new URL("/health", mcpServerUrl).toString();
  let lastState: "unreachable" | "unlinked" | undefined;

  for (let poll = 0; ; poll++) {
    let state: "unreachable" | "unlinked";
    try {
      const res = await fetch(healthUrl, { headers: whatsappAuthHeaders() });
      if (res.status === 401) throw new UnauthorizedError();
      const body = (await res.json()) as { connected: boolean; self: string | null };
      if (body.connected && body.self) return body.self;
      state = "unlinked";
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      state = "unreachable";
    }

    // Say it when the situation changes, then remind every ~30s instead of every poll.
    if (state !== lastState || poll % 15 === 0) {
      onLog?.(
        state === "unreachable"
          ? `Can't reach whatsapp-mcp-server at ${mcpServerUrl}. Start it in another terminal:\n` +
              "  npx @clickonsearch/whatsapp-mcp-server\n" +
              "The first time, it shows a QR code to scan. Waiting..."
          : "whatsapp-mcp-server is running, but WhatsApp isn't linked yet. Scan the QR code in the terminal " +
              "where it's running (WhatsApp > Settings > Linked devices > Link a device). Waiting...",
      );
    }
    lastState = state;
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
 *
 * The provider is fixed for the life of this process (from the PROVIDER
 * env var) — see agents/whatsapp-agent's AG-UI server if you want to pick
 * a provider per-request instead.
 */
export async function startListener(options: StartListenerOptions): Promise<void> {
  const { mcpServerUrl, provider, onLog } = options;

  const selfId = await waitForSelfId(mcpServerUrl, onLog);
  onLog?.(`Connected. Listening for instructions in your "Message yourself" chat (${selfId}). Provider: ${provider}.`);
  await replyToSelf(mcpServerUrl, selfId, `Assistant is online (provider: ${provider}).`);

  const eventsUrl = new URL("/events", mcpServerUrl).toString();
  const res = await fetch(eventsUrl, { headers: whatsappAuthHeaders() });
  if (res.status === 401) throw new UnauthorizedError();
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

      if (!event.isSelfChat) continue;

      onLog?.(`Instruction (${provider}): ${event.text}`);

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

# whatsapp-agent

A personal WhatsApp assistant, usable two ways:

- **Over WhatsApp itself** — message **yourself** ("Message yourself" —
  Settings → your own contact) to give it an instruction, and it replies in
  that same chat.
- **From a browser chat UI** — an AG-UI protocol server (same pattern as
  [`github-agent`](../github-agent)) with a bundled chat page, for when
  typing in a web page is easier than typing on your phone, or you want to
  embed it in your own tooling.

Both modes share the same underlying agent loop and the same WhatsApp MCP
tools, so "send Alex a message asking if she's free tomorrow" works
identically either way — it really sends it, through your linked account.

Requires [`@clickonsearch/whatsapp-mcp-server`](../../mcp-servers/whatsapp-mcp-server)
running first — that's the piece that actually holds your WhatsApp session.
This package is just the agent loop(s) on top of it.

## How it works: WhatsApp mode

Unlike `github-agent` (which only waits for an HTTP request), this mode is
push-driven:

1. Connects to `whatsapp-mcp-server`'s `/events` SSE stream and watches for
   messages where `fromMe` is true and the chat is your own JID — i.e.
   messages you sent to yourself.
2. Each one becomes the prompt for the normal provider tool-calling loop
   (same `openai/claude/deepseek-remote-mcp-bridge` packages `github-agent`
   uses), with the WhatsApp MCP tools (`send_message`, `list_chats`,
   `get_recent_messages`, `search_contacts`) available — so "send Alex a
   message asking if she's free tomorrow" or "summarize my last 20 messages
   with Sam" both work as tool calls, not just chat.
3. The agent's final answer is sent back to you in the same self-chat via
   `send_message`.

```
you: message yourself on WhatsApp
        │
        ▼
whatsapp-mcp-server (Baileys) ──/events──▶ whatsapp-agent
        ▲                                        │
        │                                        ▼
        └──────── send_message ─────── model + WhatsApp tools
```

## Setup

```bash
# 1. start the MCP server first (separate terminal, separate package)
cd mcp-servers/whatsapp-mcp-server
npm install && cp .env.example .env
npm run dev   # scan the QR code it prints

# 2. then this agent
cd agents/whatsapp-agent
npm install
cp .env.example .env
# fill in WHATSAPP_MCP_URL (if not localhost:4100) and your provider's API key
```

## Run: WhatsApp mode

```bash
npm run dev
```

Then open WhatsApp on your phone, message yourself something like "list my
most recent chats" or "send a message to +1555... saying I'm running 10
minutes late", and watch the reply come back in the same chat.

## Run: browser chat UI (AG-UI server)

```bash
npm run build
npm run serve          # or `npm run dev:serve` for tsx, no build step
```

This starts an HTTP server (default `http://localhost:3100`) with:

- `GET /` — a self-contained chat page (`public/index.html`) with a
  provider dropdown. Open it in a browser and talk to the assistant.
- `POST /agent` — the AG-UI protocol endpoint (`RunAgentInput` in, AG-UI
  SSE events out) — the exact same shape as `github-agent`'s, so any
  AG-UI client can drive this one too, not just the bundled page.
- `GET /health` — liveness check.

You can run this alongside WhatsApp mode (`npm run dev` in one terminal,
`npm run serve` in another) — they're independent processes hitting the
same `whatsapp-mcp-server`, so either one can send/read messages at any
time.

## Config

| Env var             | Required               | Notes                                              |
| -------------------- | ----------------------- | --------------------------------------------------- |
| `WHATSAPP_MCP_URL`   | no (default `http://localhost:4100`) | where whatsapp-mcp-server is running   |
| `PORT`               | no (default `3100`)     | browser chat UI / AG-UI server only                  |
| `PROVIDER`           | no (default `openai`)   | `openai`, `claude`, or `deepseek`                    |
| `OPENAI_API_KEY`     | when provider=openai    |                                                       |
| `OPENAI_MODEL`       | no (default `gpt-4.1`)  |                                                       |
| `ANTHROPIC_API_KEY`  | when provider=claude    |                                                       |
| `ANTHROPIC_MODEL`    | no (default `claude-sonnet-5`) |                                                |
| `DEEPSEEK_API_KEY`   | when provider=deepseek  |                                                       |
| `DEEPSEEK_MODEL`     | no (default `deepseek-chat`) |                                                  |

## Known limitations (v1)

- WhatsApp mode is single-turn per instruction: each self-message is its
  own fresh prompt, with no memory across separate instructions. The
  browser chat UI (AG-UI mode) doesn't have this limitation — like
  `github-agent`, it flattens prior turns in the conversation into a system
  preamble, so follow-up questions in the same chat session work.
- Only your own "Message yourself" chat triggers the WhatsApp-mode
  assistant. Any other incoming message is ignored by design, so it can't
  be triggered by someone messaging you.
- `whatsapp-mcp-server`'s chat/message recall is in-memory only (not
  persisted across restarts) and capped at the last 200 messages per chat —
  it does get real history via WhatsApp's own backfill-on-connect, just not
  unbounded history.

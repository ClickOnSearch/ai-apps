# whatsapp-agent

A personal assistant for your WhatsApp account. Message yourself to give it
instructions ("summarize my last chat with Sam", "send Alex a message
saying I'm running late"), or talk to it from a browser instead. Pick which
AI model does the thinking — OpenAI, Claude, or DeepSeek.

## What you need

- Node.js 18+
- A WhatsApp account you can scan a QR code with (this links the agent as
  a device on your account, same as WhatsApp Web)
- An API key for at least one of: OpenAI, Anthropic (Claude), DeepSeek

## Setup

**1. Start the WhatsApp connection** (keep this running in its own terminal):

```bash
cd mcp-servers/whatsapp-mcp-server
npm install
cp .env.example .env
npm run dev
```

Scan the QR code it prints with your phone (WhatsApp → Settings → Linked
devices → Link a device).

**2. Set up this agent** (in a second terminal):

```bash
cd agents/whatsapp-agent
npm install
cp .env.example .env
```

Open `.env` and fill in the API key for whichever provider you want to use.

## Use it: over WhatsApp

```bash
npm run dev
```

Now message **yourself** on WhatsApp ("Message yourself" in your contacts)
with something like "list my most recent chats" — the reply comes back in
that same conversation.

## Use it: browser chat

```bash
npm run build
npm run serve
```

Then open `http://localhost:3100` and start chatting — pick your provider
from the dropdown. You can run this at the same time as WhatsApp mode; they
don't conflict.

## Config reference

| Env var             | Required            | Default                 |
| -------------------- | -------------------- | -------------------------- |
| `PROVIDER`            | no                    | `openai`                    |
| `OPENAI_API_KEY`      | if using OpenAI       |                             |
| `OPENAI_MODEL`        | no                    | `gpt-4.1`                   |
| `ANTHROPIC_API_KEY`   | if using Claude       |                             |
| `ANTHROPIC_MODEL`     | no                    | `claude-sonnet-5`           |
| `DEEPSEEK_API_KEY`    | if using DeepSeek     |                             |
| `DEEPSEEK_MODEL`      | no                    | `deepseek-chat`             |
| `WHATSAPP_MCP_URL`    | no                    | `http://localhost:4100`     |
| `PORT`                | no, browser chat only | `3100`                      |

## Good to know

- Only messages in your own "Message yourself" chat trigger the assistant
  — nobody else can trigger it by messaging you.
- Each WhatsApp message is its own fresh instruction with no memory of
  earlier ones. The browser chat remembers the conversation; WhatsApp mode
  doesn't (yet).
- Chat history is only kept in memory while `whatsapp-mcp-server` is
  running (up to 200 messages per chat) — it's not saved anywhere
  permanent.

---

## For developers

WhatsApp mode is push-driven, not request/response: it subscribes to
`whatsapp-mcp-server`'s `/events` stream, and any message you send yourself
becomes a prompt for the same provider tool-calling loop `github-agent`
uses, with WhatsApp's tools (`send_message`, `list_chats`,
`get_recent_messages`, `search_contacts`) available. The reply is sent back
via `send_message` once the model finishes.

The browser chat is an [AG-UI protocol](https://ag-ui.com) server, same
shape as `github-agent`'s (`POST /agent`, streaming SSE) — any AG-UI
client can drive it.

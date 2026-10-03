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

## Use it: over WhatsApp

**1. Start the WhatsApp connection** (own terminal, keep it running):

```bash
npx @clickonsearch/whatsapp-mcp-server
```

Scan the QR code it prints with your phone (WhatsApp → Settings → Linked
devices → Link a device).

**2. Start the assistant** (second terminal):

```bash
ANTHROPIC_API_KEY=<your-key> npx @clickonsearch/whatsapp-agent
```

Now message **yourself** on WhatsApp ("Message yourself" in your contacts)
with something like "list my most recent chats" — the reply comes back in
that same conversation.

Swap in `OPENAI_API_KEY` + `PROVIDER=openai`, or `DEEPSEEK_API_KEY` +
`PROVIDER=deepseek`, to use a different model.

## Use it: browser chat

```bash
ANTHROPIC_API_KEY=<your-key> npx -p @clickonsearch/whatsapp-agent whatsapp-agent-serve
```

Then open `http://localhost:3100` and start chatting — pick your provider
from the dropdown. You can run this at the same time as WhatsApp mode; they
don't conflict.

## Use it: embedded in another tool

The browser chat server speaks the [AG-UI protocol](https://ag-ui.com)
(`POST /agent`, streaming SSE) — any AG-UI-compatible client can drive it
as a backend, not just the bundled page.

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

**Running from source:**

```bash
# terminal 1
cd mcp-servers/whatsapp-mcp-server
npm install
cp .env.example .env
npm run dev

# terminal 2
cd agents/whatsapp-agent
npm install
cp .env.example .env    # fill in a provider key
npm run dev              # WhatsApp mode
npm run serve             # or browser chat
```

WhatsApp mode is push-driven, not request/response: it subscribes to
`whatsapp-mcp-server`'s `/events` stream, and any message you send yourself
becomes a prompt for the same provider tool-calling loop `github-agent`
uses, with WhatsApp's tools (`send_message`, `list_chats`,
`get_recent_messages`, `search_contacts`) available. The reply is sent back
via `send_message` once the model finishes.

The browser chat is an AG-UI protocol server, same shape as
`github-agent`'s (`POST /agent`, streaming SSE).

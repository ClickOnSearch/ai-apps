# whatsapp-agent

A personal assistant for your WhatsApp account. Message yourself to give it
instructions ("summarize my last chat with Sam", "send Alex a message
saying I'm running late"), or talk to it from a browser instead. Pick which
AI model does the thinking — OpenAI, Claude, or DeepSeek.

```
your WhatsApp message to yourself
               │
               ▼
┌─────────────────────────────┐
│       whatsapp-agent        │   reads the message
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           bridge            │   openai / claude / deepseek — talks to the AI model
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     whatsapp-mcp-server     │   acts on your account
└──────────────┬──────────────┘
               │
               ▼
reply sent back on WhatsApp
```

## What you need

- Node.js 18+
- A WhatsApp account you can scan a QR code with (this links the agent as
  a device on your account, same as WhatsApp Web)
- An API key for at least one of: OpenAI, Anthropic (Claude), DeepSeek

## Choose your AI model

The agent works with three AI providers. Use whichever one you have an API key for:

| Provider | Set this API key | Get a key | Choose it with |
| --- | --- | --- | --- |
| OpenAI (GPT) | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `PROVIDER=openai` |
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | `PROVIDER=claude` |
| DeepSeek | `DEEPSEEK_API_KEY` | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | `PROVIDER=deepseek` |

Set just one key and that provider is used automatically. If you set several, pick one with `PROVIDER=<name>`. In the browser chat, the provider is the dropdown at the top of the page; it starts on the provider your key selects.

**Not sure which?** Use whichever key you already have. Every agent works with all three, and you can switch later without changing anything else. Starting from scratch? Any of them is fine to try; DeepSeek is usually the cheapest.

## Use it: over WhatsApp

This takes two programs running side by side, each in its own terminal:
one links your WhatsApp account, the other is the assistant.

**1. Link your WhatsApp** (first terminal, keep it running):

```bash
npx @clickonsearch/whatsapp-mcp-server
```

After a few seconds it prints a QR code. On your phone open **WhatsApp →
Settings → Linked devices → Link a device** and scan it. When it works you'll
see `WhatsApp connected as ...`. You only do this once — the link is
remembered, whichever folder you run it from.

**2. Start the assistant** (second terminal):

```bash
ANTHROPIC_API_KEY=<your-key> npx @clickonsearch/whatsapp-agent
```

Now message **yourself** on WhatsApp ("Message yourself" in your contacts)
with something like "list my most recent chats" — the reply comes back in
that same conversation.

The assistant uses whichever model you have an API key for (OpenAI, Claude
or DeepSeek). If you set more than one, choose with `PROVIDER=openai`,
`claude` or `deepseek`.

**Stuck on "Waiting..."?** The message says why:
- *Can't reach whatsapp-mcp-server* — step 1 isn't running. Start it.
- *WhatsApp isn't linked yet* — scan the QR code in the step 1 terminal. If
  it looks garbled, make that terminal window bigger or zoom out and run it
  again.

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
| `PROVIDER`            | no                    | whichever API key is set    |
| `OPENAI_API_KEY`      | if using OpenAI       |                             |
| `OPENAI_MODEL`        | no                    | `gpt-4.1`                   |
| `ANTHROPIC_API_KEY`   | if using Claude       |                             |
| `ANTHROPIC_MODEL`     | no                    | `claude-sonnet-5`           |
| `DEEPSEEK_API_KEY`    | if using DeepSeek     |                             |
| `DEEPSEEK_MODEL`      | no                    | `deepseek-chat`             |
| `WHATSAPP_MCP_URL`    | no                    | `http://127.0.0.1:4100`     |
| `WHATSAPP_MCP_TOKEN`  | only if the server needs one | |
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

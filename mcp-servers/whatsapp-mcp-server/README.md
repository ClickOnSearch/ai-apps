# @clickonsearch/whatsapp-mcp-server

Links a personal WhatsApp account to this repo's agents, the same way
WhatsApp Web does — scan a QR code once, it stays connected. Usually you
won't run this directly; [`whatsapp-agent`](../../agents/whatsapp-agent)'s
README tells you when to start it.

> **Heads up:** this isn't the official WhatsApp Business API — it's an
> unofficial library ([Baileys](https://github.com/WhiskeySockets/Baileys))
> automating a personal account, which WhatsApp's terms don't really
> cover. Risk is low for normal personal use, but there's a small chance of
> the account getting flagged.

```
whatsapp-agent (or any MCP client)
               │
               ▼
┌─────────────────────────────┐
│     whatsapp-mcp-server     │   Streamable HTTP MCP
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           Baileys           │   WhatsApp Web protocol
└──────────────┬──────────────┘
               │
               ▼
your WhatsApp account
```

## Run

```bash
npx @clickonsearch/whatsapp-mcp-server
```

The first time, it prints a QR code — scan it with your phone: **WhatsApp →
Settings → Linked devices → Link a device**. After that it reconnects
automatically, no need to scan again (unless you unlink the device from
your phone).

Once connected, it's listening on `http://127.0.0.1:4100` for whatever
agent you point at it. No environment variables are required to try it —
everything below has a default.

## Config reference

| Env var             | Default            | Notes                                         |
| -------------------- | ------------------ | ---------------------------------------------- |
| `PORT`               | `4100`              |                                                 |
| `BIND_HOST`          | `127.0.0.1`         | Who can connect. The default means only this computer |
| `WHATSAPP_MCP_TOKEN` | unset               | Secret every caller must send. Required whenever `BIND_HOST` isn't `127.0.0.1` |
| `WHATSAPP_AUTH_DIR`  | `./whatsapp-auth`   | Your session — never share or commit this folder |
| `BAILEYS_LOG_LEVEL`  | `silent`            | Set to `info` or `debug` to see connection details |

### Letting another machine connect

By default only programs on the same computer can reach this server. To
allow others (an agent in a container, or on another machine), pick a
secret and set both:

```bash
export WHATSAPP_MCP_TOKEN=$(openssl rand -hex 32)
BIND_HOST=0.0.0.0 npx @clickonsearch/whatsapp-mcp-server
```

Give `whatsapp-agent` the same `WHATSAPP_MCP_TOKEN` and it sends it
automatically. The server refuses to start on any other address without a
token. Anyone holding the token can read your chats and send messages as
you, so treat it like a password — and since it travels over plain HTTP,
only use this on a network you trust or behind TLS (for example a reverse
proxy).

## What it exposes

| Tool                  | What it does                          |
| ---------------------- | --------------------------------------- |
| `send_message`         | Sends a text message to a phone number or chat |
| `list_chats`           | Lists chats seen since connecting (includes WhatsApp's own recent history) |
| `get_recent_messages`  | Gets recent messages from one chat (up to 200, in memory only) |
| `search_contacts`      | Finds a contact by name or number       |

---

## For developers

**Running from source:**

```bash
cd mcp-servers/whatsapp-mcp-server
npm install
cp .env.example .env
npm run dev
```

This runs as a standard MCP server (Streamable HTTP on `/mcp`), so any of
this repo's bridges can connect to it with no special-casing — it just had
to speak the same protocol GitHub's own remote MCP server does. It also
exposes `GET /events` (a plain SSE stream of incoming messages) and
`GET /health` (`{ ok, connected, self }`) for anything that wants to react
to messages live, like `whatsapp-agent` does.

```ts
import { WhatsAppConnection } from "./src/whatsapp.js";
import { createServer } from "./src/server.js";

const whatsapp = new WhatsAppConnection("./whatsapp-auth");
await whatsapp.start();

const app = createServer(whatsapp);
app.listen(4100);
```

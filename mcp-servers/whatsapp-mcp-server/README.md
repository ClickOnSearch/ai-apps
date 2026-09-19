# @clickonsearch/whatsapp-mcp-server

Connects to **your personal WhatsApp account** (the same way WhatsApp Web
does — scan a QR code, keep a linked-device session) via
[Baileys](https://github.com/WhiskeySockets/Baileys), and exposes it as an
MCP server: `send_message`, `list_chats`, `get_recent_messages`,
`search_contacts`, plus a plain SSE stream of incoming messages for anything
that wants to react to them live.

> **This is not the official WhatsApp Business API.** It's an unofficial
> library automating a personal account, which is outside WhatsApp's ToS for
> bots. Risk is generally low for personal, low-volume use, but there's a
> real (if small) chance of the account being flagged. Go in aware of that.

## Why an MCP server, not just a script

Any of this repo's remote MCP bridges (`openai-remote-mcp-bridge`,
`claude-remote-mcp-bridge`, `deepseek-remote-mcp-bridge`) can already
connect to **any** MCP server over Streamable HTTP — including this one,
running on `localhost`. This server needed zero special-casing in those
bridges; it just had to speak the same protocol GitHub's remote MCP server
does.

## Setup

```bash
cd mcp-servers/whatsapp-mcp-server
npm install
cp .env.example .env
```

## Run

```bash
npm run dev
```

On first run it prints a QR code in the terminal — scan it from your phone:
**WhatsApp → Settings → Linked devices → Link a device**. The session is
then saved to `WHATSAPP_AUTH_DIR` (default `./whatsapp-auth`) so you won't
need to re-scan on restart, unless you log the device out from your phone.

Once connected:

- `POST http://localhost:4100/mcp` — the MCP endpoint (Streamable HTTP,
  stateless — same shape as the SDK's own reference server).
- `GET http://localhost:4100/events` — SSE stream of every incoming
  message: `{ chatId, fromMe, senderName, text, timestamp }`.
- `GET http://localhost:4100/health` — `{ ok, connected, self }`, where
  `self` is your own normalized JID once connected.

## Config

| Env var             | Default            | Notes                                         |
| -------------------- | ------------------ | ---------------------------------------------- |
| `PORT`               | `4100`              |                                                 |
| `WHATSAPP_AUTH_DIR`  | `./whatsapp-auth`   | Your session — never commit this directory     |
| `BAILEYS_LOG_LEVEL`  | `silent`            | `info`/`debug` if you need to see WA internals |

## Tools

| Tool                  | Args                          | Notes                                          |
| ---------------------- | ------------------------------ | ----------------------------------------------- |
| `send_message`         | `to`, `text`                    | `to` accepts a phone number or a raw JID        |
| `list_chats`           | —                               | Chats seen since the server started, not history from before it started |
| `get_recent_messages`  | `chat`, `limit` (default 20)   | In-memory only, capped at the last 200/chat     |
| `search_contacts`      | `query`                        | Matches by name or number substring             |

## Using it as a library

```ts
import { WhatsAppConnection } from "./src/whatsapp.js";
import { createServer } from "./src/server.js";

const whatsapp = new WhatsAppConnection("./whatsapp-auth");
await whatsapp.start();

const app = createServer(whatsapp);
app.listen(4100);
```

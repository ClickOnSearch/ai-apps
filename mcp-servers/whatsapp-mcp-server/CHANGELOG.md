# Changelog

All notable changes to `@clickonsearch/whatsapp-mcp-server` are documented
here. Each entry corresponds to the npm version it shipped in. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2026-10-06

### Security

- The server called `app.listen(port)` with no host, so it listened on every
  network interface with no caller authentication. The SDK's Host-header
  check only defends against browser DNS-rebinding and is bypassed by any
  network client sending `Host: localhost`, which gave unauthenticated
  access to `/mcp` (send messages, list chats, read messages, search
  contacts), the `/events` message stream, and `/health`. Affects 0.1.0 and
  0.1.1.
  See the [advisory](../../advisories/2026-10-06-mcp-servers-network-exposure.md). Reported by 0xwaidwerk.
- Now listens on `127.0.0.1` only by default.
- New `BIND_HOST` and `WHATSAPP_MCP_TOKEN` settings. When a token is set,
  every route requires `Authorization: Bearer <token>` (constant-time
  comparison). The server refuses to start on any non-loopback `BIND_HOST`
  without a token of at least 16 characters.

### Changed

- **Breaking:** if you relied on reaching this server from another
  machine, it will no longer be reachable until you set `BIND_HOST` and
  `WHATSAPP_MCP_TOKEN` (see the README) and give the same token to
  `whatsapp-agent` (0.1.2 or later; older agents can't send a token).
- Default URLs in docs now use `127.0.0.1` instead of `localhost`, which can
  resolve to IPv6 `::1` first and miss a loopback-only IPv4 listener.

## [0.1.1] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/whatsapp-mcp-server`
  (no cloning or building required) instead of the monorepo `npm run dev`
  workflow, which is now under "For developers".
- Added an architecture diagram showing how a request flows from an MCP
  client through this server to your WhatsApp account via Baileys.

## [0.1.0] - 2026-09-19

### Added

- Initial release: an MCP server built on Baileys that exposes your own
  WhatsApp account's send/receive capability as MCP tools.

### Fixed

- Prevented an infinite loop where the bot's own sent messages, echoed back
  through WhatsApp's multi-device sync as incoming (`fromMe: true`)
  messages, were re-processed as new instructions.
- Fixed self-chat detection across WhatsApp's two identity formats — the
  newer LID (Linked ID) and the older phone-number JID — by tracking both
  server-side instead of relying on fragile client-side string matching.
- Added a `messaging-history.set` listener so the in-memory message store
  isn't empty after every server restart (only live `messages.upsert`
  events were handled before).

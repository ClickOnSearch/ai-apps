# Changelog

All notable changes to `@clickonsearch/whatsapp-mcp-server` are documented
here. Each entry corresponds to the npm version it shipped in. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

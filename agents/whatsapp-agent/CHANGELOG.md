# Changelog

All notable changes to `@clickonsearch/whatsapp-agent` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.2] - 2026-10-06

### Added

- Reads `WHATSAPP_MCP_TOKEN` and sends it as a bearer token on MCP calls,
  `/health` and `/events`, for `whatsapp-mcp-server` 0.2.0+ when it's run
  with a token (required there whenever it listens beyond localhost).
- A rejected token now stops with "set WHATSAPP_MCP_TOKEN" instead of
  waiting forever for the server to appear.

### Changed

- `WHATSAPP_MCP_URL` defaults to `http://127.0.0.1:4100` (was `localhost`),
  matching `whatsapp-mcp-server`'s new loopback-only default bind.

## [0.1.1] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/whatsapp-agent` (no
  cloning or building required) instead of the monorepo `npm run dev`
  workflow, which is now under "For developers". Added an "embedded in
  another tool" section pointing at the AG-UI `/agent` endpoint.
- Added an architecture diagram showing how a WhatsApp message flows
  through whatsapp-agent, the chosen provider bridge, and
  whatsapp-mcp-server.

## [0.1.0] - 2026-09-19

### Added

- Initial release: a personal-assistant agent you talk to over your own
  WhatsApp number (via `@clickonsearch/whatsapp-mcp-server`) or a browser
  chat page, routed through your choice of OpenAI, Claude, or DeepSeek.
- `runAgent` accepts a `history` option so the browser chat UI can carry
  multi-turn context into each run.

### Fixed

- The chat UI's provider dropdown now defaults to the server's actual
  configured `PROVIDER` on load, instead of always defaulting to the first
  option (OpenAI).
- Removed a redundant `/provider` WhatsApp chat command — the provider is
  already fixed by the `PROVIDER` environment variable, so WhatsApp never
  needed its own way to choose one.

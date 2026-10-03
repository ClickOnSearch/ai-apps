# Changelog

All notable changes to `@clickonsearch/whatsapp-agent` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

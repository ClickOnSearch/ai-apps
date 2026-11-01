# Changelog

All notable changes to `@clickonsearch/whatsapp-agent` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.5] - 2026-11-01

### Security

- Removes the vulnerable `zod` 3.25.x that came in through `@ag-ui/encoder`
  (via `@ag-ui/proto`), which can exhaust memory while validating oversized
  constrained collections (GitHub Dependabot alert for `zod`, fixed in 4.6.6).
  The agents now format the browser chat's Server-Sent Events themselves, and
  declare `zod` ^4.6.7 directly because `@ag-ui/core` needs it. `npm audit`
  now reports no vulnerabilities.

### Changed

- The browser chat is unchanged: the same events, in the same order, in the
  same `data: {json}` format. It now always sends Server-Sent Events; a client
  that asks only for the Protobuf format gets Server-Sent Events instead.

## [0.1.4] - 2026-11-01

### Changed

- README: new "Choose your AI model" section near the top, with a table of
  provider, API key variable, where to get a key and how to select it, plus a
  "not sure which?" note.

## [0.1.3] - 2026-11-01

### Fixed

- `ANTHROPIC_API_KEY=... npx @clickonsearch/whatsapp-agent` (the README's own
  example) failed on the first message with "Missing OPENAI_API_KEY", because
  the model defaulted to OpenAI regardless of which key you set. It now uses
  the provider whose API key is set (`PROVIDER` still wins; OpenAI remains the
  default when its key is set or none is). The browser chat's default model
  follows the same rule.
- A missing API key is now reported at startup, with the exact command to fix
  it, instead of when the first WhatsApp message arrives.

### Changed

- Updated dependencies: `openai` 4 to 7, `@anthropic-ai/sdk` 0.32 to 1.3,
  `@ag-ui/core` and `@ag-ui/encoder` 1.0.3, and the provider bridges to
  `^0.3.0`, plus patched transitive packages. Behavior is unchanged.
- While waiting for WhatsApp, the agent now says what is actually wrong:
  either `whatsapp-mcp-server` isn't running (with the command to start it) or
  it's running but WhatsApp isn't linked yet (scan the QR code). It repeats
  the reminder every ~30 seconds rather than every 2 seconds.
- README: the two-program setup is explained up front, with what to expect
  and what each "Waiting..." message means.

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

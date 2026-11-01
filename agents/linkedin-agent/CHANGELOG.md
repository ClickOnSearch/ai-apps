# Changelog

All notable changes to `@clickonsearch/linkedin-agent` are documented here.
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

### Fixed

- With only one API key set (for example `ANTHROPIC_API_KEY`) and no
  `--provider` or `PROVIDER`, the agent assumed OpenAI and failed with
  "Missing OPENAI_API_KEY". It now uses the provider whose key is set; OpenAI
  remains the default when its key is set or none is. The browser chat's
  starting provider follows the same rule.

### Changed

- README: new "Choose your AI model" section near the top, with a table of
  provider, API key variable, where to get a key and how to select it, plus a
  "not sure which?" note.

## [0.1.3] - 2026-11-01

### Changed

- Updated dependencies: `openai` 4 to 7, `@anthropic-ai/sdk` 0.32 to 1.3,
  `@ag-ui/core` and `@ag-ui/encoder` 1.0.3, and the provider bridges to
  `^0.3.0`. Also picks up patched transitive packages (`body-parser`, `qs`,
  `fast-uri`, `ip-address`). Behavior is unchanged.

## [0.1.2] - 2026-10-06

### Added

- Reads `LINKEDIN_MCP_TOKEN` and sends it as a bearer token to
  `linkedin-mcp-server` 0.2.0+ when it's run with a token (required there
  whenever it listens beyond localhost).

### Changed

- `LINKEDIN_MCP_URL` defaults to `http://127.0.0.1:4300` (was `localhost`),
  matching `linkedin-mcp-server`'s new loopback-only default bind.

## [0.1.1] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/linkedin-agent` (no
  cloning or building required) instead of the monorepo `npm run dev`
  workflow, which is now under "For developers". Added an "embedded in
  another tool" section pointing at the AG-UI `/agent` endpoint.
- Added an architecture diagram showing how a prompt flows through
  linkedin-agent, the chosen provider bridge, and linkedin-mcp-server.

## [0.1.0] - 2026-09-19

### Added

- Initial release: read your LinkedIn profile and publish posts in plain
  English, via `@clickonsearch/linkedin-mcp-server`, routed through your
  choice of OpenAI, Claude, or DeepSeek.

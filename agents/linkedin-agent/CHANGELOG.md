# Changelog

All notable changes to `@clickonsearch/linkedin-agent` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

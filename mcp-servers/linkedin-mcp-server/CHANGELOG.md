# Changelog

All notable changes to `@clickonsearch/linkedin-mcp-server` are documented
here. Each entry corresponds to the npm version it shipped in. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2026-10-06

### Security

- Same flaw as `whatsapp-mcp-server` 0.1.1: `app.listen(port)` with no host
  exposed `/mcp` on every network interface with no caller authentication,
  letting any network client (including one sending `Host: localhost`) call
  `get_profile` and `create_post` — publishing to your LinkedIn feed as you.
  Affects 0.1.0 and 0.1.1.
  See the [advisory](../../advisories/2026-10-06-mcp-servers-network-exposure.md). Reported by 0xwaidwerk.
- Now listens on `127.0.0.1` only by default.
- New `BIND_HOST` and `LINKEDIN_MCP_TOKEN` settings. When a token is set,
  every route requires `Authorization: Bearer <token>` (constant-time
  comparison). The server refuses to start on any non-loopback `BIND_HOST`
  without a token of at least 16 characters.

### Changed

- **Breaking:** if you relied on reaching this server from another
  machine, it will no longer be reachable until you set `BIND_HOST` and
  `LINKEDIN_MCP_TOKEN` (see the README) and give the same token to
  `linkedin-agent` (0.1.2 or later; older agents can't send a token).
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` are no longer required to
  start the server — only to refresh an expiring token. A still-valid saved
  token works without them, and a refresh attempted without them now fails
  with a clear message instead of a startup error.
- Default URLs in docs now use `127.0.0.1` instead of `localhost`.

## [0.1.1] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/linkedin-mcp-server`
  (no cloning or building required) instead of the monorepo `npm run dev`
  workflow, which is now under "For developers".
- Added an architecture diagram showing how a request flows from an MCP
  client through this server to your LinkedIn account via OAuth.

## [0.1.0] - 2026-09-19

### Added

- Initial release: an MCP server using LinkedIn's OAuth v2 API, exposing
  `get_profile` and `create_post` as MCP tools.

### Fixed

- Updated the default `LINKEDIN_API_VERSION` after the previous default
  fell outside LinkedIn's ~1-year rolling version window and started
  returning a `426 NONEXISTENT_VERSION` error; added explicit detection and
  a clearer error message for that specific failure.

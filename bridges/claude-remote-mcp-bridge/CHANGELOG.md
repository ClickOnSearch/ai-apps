# Changelog

All notable changes to `@clickonsearch/claude-remote-mcp-bridge` are
documented here. Each entry corresponds to the npm version it shipped in.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.0] - 2026-11-01

### Changed

- Updated `@anthropic-ai/sdk` 0.32 to 1.3, plus patched transitive dependencies (`body-parser`, `qs`,
  `fast-uri`, `ip-address`). Behavior is unchanged: requests to the model and
  the tool-calling loop are identical.
- If you pass your own client into `runAgent` from TypeScript, upgrade your
  `@anthropic-ai/sdk` package to match, since the client type now comes from the new major
  version. This is why it's a minor (`0.3.0`) rather than a patch release.

## [0.2.2] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/claude-remote-mcp-bridge
  "prompt"` (no cloning or building required) instead of the monorepo
  `npm run dev` workflow, which is now under "For developers".

## [0.2.1] - 2026-10-03

### Fixed

- `runAgent`'s defaults raised: `maxTurns` from 8 to 20, `maxTokens` from
  1024 to 4096 — a multi-step tool-calling task (e.g. reading several files
  before posting a long review comment) could exceed either cap.
- The loop now throws a clear error (naming the `stop_reason`) instead of
  silently returning an empty string. Previously, if a response was cut off
  by `max_tokens` before any text block was produced, the run would resolve
  to `""` with no indication anything went wrong.

## [0.2.0] - 2026-09-25

### Added

- `runAgent` accepts a `history` option (earlier conversation turns, oldest
  first) so callers can carry multi-turn context into a run.

## [0.1.0] - 2026-09-19

### Added

- Initial release: lets a Claude model (Messages API tool use) discover and
  call tools exposed by one or more remote MCP servers, via `McpManager` +
  `runAgent`.

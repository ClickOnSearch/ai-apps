# Changelog

All notable changes to `@clickonsearch/claude-remote-mcp-bridge` are
documented here. Each entry corresponds to the npm version it shipped in.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

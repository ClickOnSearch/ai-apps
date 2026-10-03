# Changelog

All notable changes to `@clickonsearch/openai-remote-mcp-bridge` are documented
here. Each entry corresponds to the npm version it shipped in. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.1] - 2026-10-03

### Fixed

- `runAgent`'s default `maxTurns` raised from 8 to 20 — a tool-calling task
  that needs several steps (list files, read each one, write a result) was
  hitting the old cap too easily.
- The loop now throws a clear error (naming the `finish_reason`) instead of
  silently returning an empty string when the model stops without any text
  or tool calls.

## [0.2.0] - 2026-09-25

### Added

- `runAgent` accepts a `history` option (earlier conversation turns, oldest
  first) so callers can carry multi-turn context into a run.

## [0.1.0] - 2026-09-19

### Added

- Initial release: lets an OpenAI model (Chat Completions tool-calling)
  discover and call tools exposed by one or more remote MCP servers, via
  `McpManager` + `runAgent`.

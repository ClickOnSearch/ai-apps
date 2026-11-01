# Changelog

All notable changes to `@clickonsearch/jira-mcp-server` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-11-01

### Added

- Initial release: an MCP server for Jira Cloud with `create_story`,
  `get_story`, `search_stories` and `add_comment`.
- Stories carry required, numbered acceptance criteria (`AC1`, `AC2`...) that
  `get_story` parses back out, including hand-written lists under an
  "Acceptance criteria" heading.
- Dry run: with the `X-Dry-Run: 1` header, `create_story` and `add_comment`
  return the draft and never contact Jira.
- Listens on `127.0.0.1` by default; any other `BIND_HOST` requires a
  `JIRA_MCP_TOKEN`, checked on every route.

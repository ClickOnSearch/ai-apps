# Changelog

All notable changes to `@clickonsearch/github-agent` are documented here.
Each entry corresponds to the npm version it shipped in. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.2] - 2026-10-03

### Changed

- README rewritten to lead with `npx @clickonsearch/github-agent "prompt"`
  (no cloning or building required) instead of the monorepo `npm run dev`
  workflow, which is now under "For developers". Added an "embedded in
  another tool" section pointing at the AG-UI `/agent` endpoint.
- Added an architecture diagram showing how a prompt flows through
  github-agent, the chosen provider bridge, and GitHub's remote MCP server.

## [0.1.1] - 2026-10-03

### Fixed

- GitHub's remote MCP server only exposes an undocumented default toolset
  unless the client asks for more. `githubServerConfig()` now requests the
  `all` toolset by default via the `X-MCP-Toolsets` header (override with
  `GITHUB_MCP_TOOLSETS`) — without this, the agent could review code but
  had no tool to post the findings back, since comment/review tools live in
  the `pull_requests` toolset, which wasn't guaranteed to be in the default.
- `--skill` now falls back to a `SKILL` env var, mirroring how `--provider`
  already falls back to `PROVIDER` — previously `--skill` had to be passed
  on every single run.

### Changed

- The `code-review` skill example in the README now targets a real pull
  request (`review PR #12 in owner/repo and post a comment`) instead of a
  bare local diff, which has nothing for the agent to comment on even with
  the right tool available.

## [0.1.0] - 2026-09-19

### Added

- Initial release: ask about your GitHub repos, pull requests, and issues
  in plain English, routed through your choice of OpenAI, Claude, or
  DeepSeek via the remote MCP bridges.
- `--skill` flag to layer reusable reasoning instructions (from
  `@clickonsearch/agent-skills`) onto the agent without changing what
  tools it can use.
- Browser chat UI served over the AG-UI protocol (`npm run serve`).

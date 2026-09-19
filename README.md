# urav-ai-apps

An npm workspaces monorepo (`bridges/*`, `agents/*`) for connecting model
providers to remote MCP servers.

- **`bridges/`** — one package per model provider, each letting that
  provider's tool-calling loop discover and call tools on remote MCP
  servers: [`openai-remote-mcp-bridge`](bridges/openai-remote-mcp-bridge),
  [`claude-remote-mcp-bridge`](bridges/claude-remote-mcp-bridge),
  [`deepseek-remote-mcp-bridge`](bridges/deepseek-remote-mcp-bridge).
- **`agents/`** — purpose-built agents on top of one or more bridges:
  [`github-agent`](agents/github-agent) talks to GitHub via its remote MCP
  server, letting the caller pick which bridge/provider to route through.

## Shared MCP config

Every bridge's CLI reads its list of remote MCP servers from an
`mcp.config.json` (JSON, gitignored — it can carry real tokens via
`${ENV_VAR}` interpolation). Rather than keeping three copies in sync,
they default to one shared file **at this repo root**:

```bash
cp mcp.config.example.json mcp.config.json   # point at your remote MCP server(s)
```

Each bridge's `.env.example` sets `MCP_CONFIG_PATH=../../mcp.config.json`
to point here. A bridge that needs a different set of servers than the
others can override `MCP_CONFIG_PATH` to point at its own local file
instead — see each bridge's README.

`agents/github-agent` doesn't use this file at all: it builds its single
GitHub MCP server config in code from `GITHUB_TOKEN`, so there's nothing
to keep in sync there.

## Setup

```bash
npm install
npm run build   # builds every bridges/* and agents/* workspace
```

Then follow the README in whichever package you want to run.

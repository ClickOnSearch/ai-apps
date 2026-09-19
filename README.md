# ai-apps

An npm workspaces monorepo (`bridges/*`, `mcp-servers/*`, `agents/*`) for
connecting model providers to remote MCP servers.

- **`bridges/`** — one package per model provider, each letting that
  provider's tool-calling loop discover and call tools on remote MCP
  servers: [`openai-remote-mcp-bridge`](bridges/openai-remote-mcp-bridge),
  [`claude-remote-mcp-bridge`](bridges/claude-remote-mcp-bridge),
  [`deepseek-remote-mcp-bridge`](bridges/deepseek-remote-mcp-bridge).
- **`mcp-servers/`** — MCP servers this repo owns and runs itself (as
  opposed to third-party ones like GitHub's):
  [`whatsapp-mcp-server`](mcp-servers/whatsapp-mcp-server) connects to a
  personal WhatsApp account via Baileys;
  [`linkedin-mcp-server`](mcp-servers/linkedin-mcp-server) connects to a
  personal LinkedIn account via OAuth2 (read your profile, publish posts —
  LinkedIn's public API doesn't allow much more than that).
- **`agents/`** — purpose-built agents on top of one or more bridges:
  [`github-agent`](agents/github-agent) talks to GitHub via its remote MCP
  server, [`whatsapp-agent`](agents/whatsapp-agent) is a personal assistant
  driven by messaging yourself on WhatsApp, and
  [`linkedin-agent`](agents/linkedin-agent) reads your LinkedIn profile and
  posts on your behalf — all three let the caller pick which bridge/provider
  to route through.

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

None of the `agents/*` packages use this file: each builds its one MCP
server's config in code (from `GITHUB_TOKEN`, or from `WHATSAPP_MCP_URL` /
`LINKEDIN_MCP_URL` pointing at the local server), so there's nothing to keep
in sync there.

## Setup

```bash
npm install
npm run build   # builds every bridges/*, mcp-servers/* and agents/* workspace
```

Then follow the README in whichever package you want to run.

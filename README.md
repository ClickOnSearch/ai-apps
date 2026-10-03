# ai-apps

AI agents that talk to your accounts in plain English — GitHub, WhatsApp,
LinkedIn — and let you pick which AI model (OpenAI, Claude, or DeepSeek)
does the thinking.

## Quick start

Each agent below is a separate package with its own setup. Pick one and
follow its README:

- **[github-agent](agents/github-agent)** — ask about your repos, PRs, and issues.
- **[whatsapp-agent](agents/whatsapp-agent)** — a personal assistant you talk to over WhatsApp.
- **[linkedin-agent](agents/linkedin-agent)** — read your LinkedIn profile and post to your feed.

To build everything in this repo first:

```bash
npm install
npm run build
```

## What's in here

- **`agents/`** — the three agents above. Each one picks which AI model to
  use, and talks to one external service.
- **`mcp-servers/`** — the WhatsApp and LinkedIn integrations those agents
  use under the hood (GitHub's equivalent is hosted by GitHub itself, so
  there's nothing to run for that one).
- **`bridges/`** — one package per AI model (OpenAI, Claude, DeepSeek) that
  lets that model call tools. The agents use these; you don't need to touch
  them directly.
- **`shared/`** — small libraries shared across agents, like
  [`agent-skills`](shared/agent-skills) (reusable instructions you can turn
  on with `--skill <name>`).

## Using a bridge directly (advanced)

If you want to experiment with a bridge on its own instead of through an
agent, each one reads its list of MCP servers from a shared
`mcp.config.json` at this repo root:

```bash
cp mcp.config.example.json mcp.config.json   # point at your MCP server(s)
```

See the bridge's own README for details.

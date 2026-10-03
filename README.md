# ai-apps

AI agents that talk to your accounts in plain English — GitHub, WhatsApp,
LinkedIn — and let you pick which AI model (OpenAI, Claude, or DeepSeek)
does the thinking.

## Quick start

Each agent below is a published npm package you run with `npx` — no
cloning, no building. Pick one and follow its README for the exact command:

- **[github-agent](agents/github-agent)** — ask about your repos, PRs, and issues.
- **[whatsapp-agent](agents/whatsapp-agent)** — a personal assistant you talk to over WhatsApp.
- **[linkedin-agent](agents/linkedin-agent)** — read your LinkedIn profile and post to your feed.

## What's in here

- **`agents/`** — the three agents above. Each one picks which AI model to
  use, and talks to one external service.
- **`mcp-servers/`** — the WhatsApp and LinkedIn integrations those agents
  use under the hood (GitHub's equivalent is hosted by GitHub itself, so
  there's nothing to run for that one).
- **`bridges/`** — one package per AI model (OpenAI, Claude, DeepSeek) that
  lets that model call tools. The agents use these; you don't need to touch
  them directly.
- **`skills/`** — reusable instruction sets agents can turn on, like
  [`agent-skills`](skills/agent-skills) (`--skill <name>`, or usable
  outside this repo entirely via MCP or a plain markdown export).

Each package keeps its own `CHANGELOG.md`, with one entry per npm version
(e.g. [`agents/github-agent/CHANGELOG.md`](agents/github-agent/CHANGELOG.md)).

---

## Developing in this repo

Working on this repo's own code, not just using the published packages?
Clone it and build from source:

```bash
npm install
npm run build
```

Every package's README has a "For developers" section with the matching
`npm run dev` commands for running it from source.

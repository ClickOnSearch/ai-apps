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

Every folder below is one or more independently published npm packages
(`@clickonsearch/...`). You only need the three agents above to actually
*use* this repo — everything else is what they're built from, for anyone
who wants to see how, swap a piece out, or use a piece on its own.

### How the pieces connect

Each agent needs two independent things, and plugs in one of each:

```
"list my 5 most recently updated PRs"
               │
               ▼
┌─────────────────────────────┐
│            agent            │   github-agent / whatsapp-agent / linkedin-agent
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           bridge            │   picks the AI model: openai / claude / deepseek
└──────────────┬──────────────┘
               │  tool calls
               ▼
┌─────────────────────────────┐
│         MCP server          │   GitHub's own remote server, or a local mcp-servers/* package
└──────────────┬──────────────┘
               │
               ▼
      your GitHub / WhatsApp / LinkedIn account
```

Swapping `--provider` changes which **bridge** (and so which AI model)
answers you — it never changes which **MCP server** (so which account) the
agent is allowed to act on, and vice versa. The two choices are independent.

### `bridges/` — one package per AI model

Lets that model call tools from any remote MCP server. An agent picks one
per request; you don't need to touch these directly unless you're
experimenting with a model's tool-calling on its own.

| Package | Model |
| --- | --- |
| [`openai-remote-mcp-bridge`](bridges/openai-remote-mcp-bridge) | OpenAI (Chat Completions tool-calling) |
| [`claude-remote-mcp-bridge`](bridges/claude-remote-mcp-bridge) | Claude (Messages API tool use) |
| [`deepseek-remote-mcp-bridge`](bridges/deepseek-remote-mcp-bridge) | DeepSeek (OpenAI-compatible tool-calling) |

### `mcp-servers/` — the integrations agents act on

Each one links a personal account and exposes it as MCP tools. GitHub
already runs its own remote MCP server, so there's no `mcp-servers/github`
— these two are for the services that don't host one themselves:

| Package | Connects to |
| --- | --- |
| [`whatsapp-mcp-server`](mcp-servers/whatsapp-mcp-server) | Your WhatsApp account (via Baileys) — send/list/search messages |
| [`linkedin-mcp-server`](mcp-servers/linkedin-mcp-server) | Your LinkedIn account (via OAuth) — read profile, publish posts |

### `skills/` — reusable instructions agents can turn on

Not a tool, not an account — just reasoning instructions an agent layers
onto its own system prompt with `--skill <name>`, without changing what
it's capable of doing.

| Package | What it does |
| --- | --- |
| [`agent-skills`](skills/agent-skills) | The `code-review` skill, plus the machinery to add more. Usable from an agent here, or externally via MCP / a plain markdown export — see its README |

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

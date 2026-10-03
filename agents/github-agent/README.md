# github-agent

Ask about your GitHub repos, pull requests, and issues in plain English.
Pick which AI model does the thinking — OpenAI, Claude, or DeepSeek.

## What you need

- Node.js 18+
- A [GitHub personal access token](https://github.com/settings/tokens)
- An API key for at least one of: OpenAI, Anthropic (Claude), DeepSeek

## Setup

```bash
# from the repo root, once
npm install
npm run build

# then, in this folder
cd agents/github-agent
cp .env.example .env
```

Open `.env` and fill in `GITHUB_TOKEN` plus the API key for whichever
provider you want to use.

## Use it: command line

```bash
npm run dev -- --provider openai "list my 5 most recently updated open PRs"
npm run dev -- --provider claude "summarize open issues labeled bug in this repo"
npm run dev -- --provider deepseek "what's changed in this repo this week?"
```

(`--provider` can be left out if you set `PROVIDER` in `.env`.)

## Use it: browser chat

```bash
npm run build
npm run serve
```

Then open `http://localhost:3000` in your browser and start chatting — pick
your provider from the dropdown at the top.

## Skills

Add `--skill code-review` (or any other skill from
[`agent-skills`](../../shared/agent-skills)) to change how the agent
reasons, without changing what it can do:

```bash
npm run dev -- --skill code-review "review pull request #12 in owner/repo and post your findings as a comment on it"
```

Point it at a real pull request (owner/repo + PR number) if you want the
findings posted back to GitHub — the agent can only comment on something it
can look up. A bare local diff (e.g. `$(git diff main)`) has nothing to
comment on, so the agent just returns the findings as text instead.

## Config reference

| Env var             | Required               | Default                              |
| -------------------- | ----------------------- | -------------------------------------- |
| `GITHUB_TOKEN`        | yes                      |                                         |
| `PROVIDER`            | no                       | `openai`                                |
| `OPENAI_API_KEY`      | if using OpenAI          |                                         |
| `OPENAI_MODEL`        | no                       | `gpt-4.1`                               |
| `ANTHROPIC_API_KEY`   | if using Claude          |                                         |
| `ANTHROPIC_MODEL`     | no                       | `claude-sonnet-5`                       |
| `DEEPSEEK_API_KEY`    | if using DeepSeek        |                                         |
| `DEEPSEEK_MODEL`      | no                       | `deepseek-chat`                         |
| `GITHUB_MCP_URL`      | no                       | `https://api.githubcopilot.com/mcp/`    |
| `GITHUB_MCP_TOOLSETS` | no                       | `all`                                   |
| `PORT`                | no, browser chat only    | `3000`                                  |

---

## For developers

This agent talks to [GitHub's remote MCP server](https://api.githubcopilot.com/mcp/)
through whichever provider bridge you pick
([`openai`](../../bridges/openai-remote-mcp-bridge) /
[`claude`](../../bridges/claude-remote-mcp-bridge) /
[`deepseek`](../../bridges/deepseek-remote-mcp-bridge)) — all three expose
the same interface, so swapping providers doesn't change how GitHub access
works.

GitHub's remote MCP server groups its tools into toolsets (`repos`,
`issues`, `pull_requests`, `actions`, ...) and only exposes an undocumented
default subset unless asked for more, via the `X-MCP-Toolsets` header. This
agent requests `all` by default so comment/review tools are always
available; narrow it with `GITHUB_MCP_TOOLSETS` (comma-separated) if you
want to restrict what the model can do.

The browser chat is an [AG-UI protocol](https://ag-ui.com) server
(`POST /agent`, streaming SSE events), so any AG-UI client can drive it, not
just the bundled page. Multi-turn memory in the browser chat is handled by
flattening prior messages into the prompt (the underlying provider calls
are single-turn).

**Adding a new provider:** add a `runWith*` function in `src/providers.ts`,
add its name to `PROVIDERS` — CLI flags, env var checks, and the chat UI
dropdown all read off that list automatically — then document its env vars
above.

**Using it as a library:**

```ts
import { runGithubAgent } from "./src/index.js";

const answer = await runGithubAgent("claude", {
  prompt: "list my open PRs",
  githubToken: process.env.GITHUB_TOKEN!,
  githubMcpUrl: "https://api.githubcopilot.com/mcp/",
});
```

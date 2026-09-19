# github-agent

Talks to GitHub through [GitHub's remote MCP server](https://api.githubcopilot.com/mcp/),
routed through [`openai-remote-mcp-bridge`](../../bridges/openai-remote-mcp-bridge),
[`claude-remote-mcp-bridge`](../../bridges/claude-remote-mcp-bridge), or
[`deepseek-remote-mcp-bridge`](../../bridges/deepseek-remote-mcp-bridge) depending on
which model provider you prefer — chosen per run, not hardcoded.

Two ways to use it:

- **CLI** (`src/cli.ts`) — one-shot prompt in, answer out.
- **AG-UI server + browser chat UI** (`src/server.ts` + `public/index.html`)
  — a long-running HTTP server that speaks the
  [AG-UI protocol](https://ag-ui.com), so any AG-UI-compatible frontend
  (the bundled chat page, or your own using `@ag-ui/client`) can drive the
  agent as an end user, watching text and tool calls stream in live.

## How it works

`src/providers.ts` builds one `McpServerConfig` pointing at the GitHub MCP
endpoint (authenticated with `GITHUB_TOKEN`) and hands it to whichever
bridge's `McpManager` + `runAgent` the caller picked:

- `provider: "openai"` → `openai-remote-mcp-bridge`'s `McpManager`
  (OpenAI tool schema) + Chat Completions tool-calling loop.
- `provider: "claude"` → `claude-remote-mcp-bridge`'s `McpManager`
  (Anthropic tool schema) + Messages API tool-use loop.
- `provider: "deepseek"` → `deepseek-remote-mcp-bridge`'s `McpManager`
  (OpenAI-compatible tool schema) + Chat Completions tool-calling loop,
  via the `openai` SDK pointed at DeepSeek's endpoint.

Every bridge implements the same `McpServerConfig` shape, so this package
just swaps which one it imports at call time — the GitHub MCP connection
and tool discovery work identically either way.

```
                    ┌── provider: openai   ──▶ openai-remote-mcp-bridge   ──┐
prompt + GITHUB_TOKEN ┤── provider: claude   ──▶ claude-remote-mcp-bridge   ├──▶ GitHub remote MCP server
                    └── provider: deepseek ──▶ deepseek-remote-mcp-bridge ──┘
```

**Adding a new provider:** add a `runWith*` function in `src/providers.ts`
following the existing three, add its name to the `Provider` type and the
`PROVIDERS` array (everything else — CLI flag validation, the `PROVIDER`
env var, the AG-UI `forwardedProps.provider` check, and the chat UI's
dropdown in `public/index.html` — reads off that one list or needs one
matching `<option>` added), then document its env vars below and in
`.env.example`.

## Setup

This package depends on its sibling bridges via npm workspaces, so install
and build from the repo root once:

```bash
cd /Users/gauravbansal74/projects/urav-ai-apps
npm install
npm run build   # builds every workspace (agents/* and bridges/*), including the bridges this depends on
```

Then configure this agent:

```bash
cd agents/github-agent
cp .env.example .env
# fill in GITHUB_TOKEN, and whichever of OPENAI_API_KEY / ANTHROPIC_API_KEY / DEEPSEEK_API_KEY you'll use
```

## Run: CLI

Pick the provider with `--provider` (or leave it on the `PROVIDER` env var
default):

```bash
npm run dev -- --provider openai "list my 5 most recently updated open PRs"
npm run dev -- --provider claude "summarize open issues labeled bug in this repo"
npm run dev -- --provider deepseek "what's changed in this repo this week?"
```

or build and run the compiled CLI:

```bash
npm run build
npm start -- --provider claude "your prompt here"
```

## Run: AG-UI server + chat UI

```bash
npm run build
npm run serve          # or `npm run dev:serve` for tsx, no build step
```

This starts an HTTP server (default `http://localhost:3000`) with:

- `GET /` — a self-contained chat page (`public/index.html`, no build step,
  no dependencies) with a provider dropdown. Open it in a browser and talk
  to the agent.
- `POST /agent` — the AG-UI protocol endpoint. Accepts a `RunAgentInput`
  JSON body (`threadId`, `runId`, `messages`, optional `forwardedProps`)
  and streams back AG-UI events over SSE: `RUN_STARTED`, `TEXT_MESSAGE_*`
  for assistant replies, `TOOL_CALL_START`/`TOOL_CALL_ARGS`/`TOOL_CALL_END`/
  `TOOL_CALL_RESULT` for each GitHub MCP tool call, then `RUN_FINISHED`
  (or `RUN_ERROR`). Point any AG-UI client at this endpoint — e.g.
  `@ag-ui/client`'s `HttpAgent`, or CopilotKit's AG-UI adapter — not just
  the bundled page.
- `GET /health` — liveness check.

Per-request provider override (falls back to the server's `PROVIDER` env
var default): set `forwardedProps: { provider: "openai" | "claude" | "deepseek" }`
on the `RunAgentInput` you POST — the bundled chat UI's dropdown does this
for you.

**Known limitation:** the underlying bridges run a single-turn agent loop
(one `userPrompt` in, one answer out), so multi-turn memory isn't native.
The server works around this by flattening prior `user`/`assistant`
messages in the posted history into a text transcript passed as a system
preamble, with the latest user message as the actual prompt — real
continuity, but coarser than a provider-native multi-turn conversation.

## Config

| Env var             | Required            | Notes                                              |
| -------------------- | -------------------- | --------------------------------------------------- |
| `GITHUB_TOKEN`        | always                | token for the GitHub MCP server                      |
| `PROVIDER`            | no (default `openai`) | CLI: overridden by `--provider`. Server: default only, overridden per-request by `forwardedProps.provider` |
| `GITHUB_MCP_URL`      | no                    | defaults to `https://api.githubcopilot.com/mcp/`      |
| `PORT`                | no (default `3000`)   | server only                                          |
| `OPENAI_API_KEY`      | when provider=openai  |                                                       |
| `OPENAI_MODEL`        | no (default `gpt-4.1`)|                                                       |
| `ANTHROPIC_API_KEY`   | when provider=claude  |                                                       |
| `ANTHROPIC_MODEL`     | no (default `claude-sonnet-5`) |                                              |
| `DEEPSEEK_API_KEY`    | when provider=deepseek |                                                      |
| `DEEPSEEK_MODEL`      | no (default `deepseek-chat`) |                                                |
| `DEEPSEEK_BASE_URL`   | no (default `https://api.deepseek.com`) |                                     |

## Using it as a library

```ts
import { runGithubAgent } from "./src/index.js";

const answer = await runGithubAgent("claude", {
  prompt: "list my open PRs",
  githubToken: process.env.GITHUB_TOKEN!,
  githubMcpUrl: "https://api.githubcopilot.com/mcp/",
});
```

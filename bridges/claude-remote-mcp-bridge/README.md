# claude-remote-mcp-bridge

Lets a Claude agent (Messages API tool use) discover and invoke tools
exposed by one or more **remote** MCP servers. Mirrors
[`../openai-remote-mcp-bridge`](../openai-remote-mcp-bridge) with the
Anthropic SDK's tool-use loop in place of OpenAI's Chat Completions loop.

> Note: Anthropic's Messages API also has a built-in (beta) MCP connector
> (`mcp_servers` on `messages.create`) that lets Claude call a remote MCP
> server directly, no bridge required. Use this project when you want your
> own process in the loop — for auth injection, logging/auditing tool
> calls, filtering which tools are exposed, or fanning out across multiple
> MCP servers with custom namespacing.

## How it works

1. `McpManager` connects to each remote MCP server listed in the configured
   `mcp.config.json` (shared at the repo root by default — see
   [Config](#config) — or a bridge-local file) via Streamable HTTP or SSE
   transport, and lists its tools.
2. Each MCP tool's JSON Schema is exposed to Claude as a tool definition
   (`name` + `input_schema`), namespaced as `<serverName>__<toolName>` to
   avoid collisions across servers.
3. `runAgent` drives the standard Claude tool-use loop: send messages +
   tools to the model, and whenever `stop_reason` is `"tool_use"`, dispatch
   each `tool_use` block to the matching MCP server via
   `McpManager.callTool` and feed the result back as a `tool_result`
   content block. Repeats until Claude returns a final text answer (or
   `maxTurns` is hit).

```
Claude --tool_use--> McpManager --MCP protocol--> remote MCP server
   ^                                                     |
   └───────────────────── tool_result ──────────────────┘
```

## Setup

```bash
cd bridges/claude-remote-mcp-bridge
npm install
cp .env.example .env            # fill in ANTHROPIC_API_KEY
```

MCP servers are configured once, shared across every bridge in this repo —
see [Config](#config). If the shared config doesn't exist yet:

```bash
cd ../..
cp mcp.config.example.json mcp.config.json   # point at your remote MCP server(s), then fill in tokens
```

## Run

```bash
npm run dev -- "What's the weather in the servers you have access to?"
```

or build and run the compiled CLI:

```bash
npm run build
npm start -- "your prompt here"
```

## Config

`../../mcp.config.json` (repo root) — shared by every bridge in this repo,
pointed at via `MCP_CONFIG_PATH` in `.env`:

```json
{
  "servers": [
    {
      "name": "Github",
      "url": "https://api.githubcopilot.com/mcp/",
      "transport": "http",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    }
  ]
}
```

- `transport` is `"http"` (Streamable HTTP, the current MCP standard) or
  `"sse"` for legacy servers.
- Header values support `${ENV_VAR}` interpolation, resolved from `.env`.
- Want this bridge to use a different set of MCP servers than the others?
  Point `MCP_CONFIG_PATH` at its own file instead, e.g.
  `MCP_CONFIG_PATH=./mcp.config.json` plus a local
  `cp ../../mcp.config.example.json mcp.config.json`.

## Using it as a library

```ts
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./src/mcpManager.js";
import { runAgent } from "./src/agent.js";
import { loadMcpConfig } from "./src/config.js";

const mcp = new McpManager();
await mcp.connectAll((await loadMcpConfig("../../mcp.config.json")).servers);

const answer = await runAgent({
  anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  model: "claude-sonnet-5",
  userPrompt: "...",
  mcp,
});

await mcp.closeAll();
```

### Conversation history

Pass earlier turns as `history` (oldest first) to give the model the context
of an ongoing conversation. They are sent before `userPrompt`:

```ts
const answer = await runAgent({
  // ...client, model, mcp as above
  history: [
    { role: "user", content: "Call me Ash" },
    { role: "assistant", content: "Sure, Ash!" },
  ],
  userPrompt: "What's my name?",
});
```

History is plain text: tool calls and results from earlier turns are not
replayed. Keep it bounded (for example, the last 20 messages) to control cost.

The Messages API expects the conversation to open with a user turn, so any
assistant messages before the first user message in `history` are skipped.


# openai-remote-mcp-bridge

Lets an OpenAI tool-calling agent (Chat Completions API) discover and invoke
tools exposed by one or more **remote** MCP servers.

## How it works

1. `McpManager` connects to each remote MCP server listed in the configured
   `mcp.config.json` (shared at the repo root by default — see
   [Config](#config) — or a bridge-local file) via Streamable HTTP or SSE
   transport, and lists its tools.
2. Each MCP tool's JSON Schema is exposed to OpenAI as a `function` tool,
   namespaced as `<serverName>__<toolName>` to avoid collisions across servers.
3. `runAgent` drives the standard OpenAI tool-calling loop: send messages +
   tools to the model, and whenever it emits a `tool_calls`, dispatch the
   call to the matching MCP server via `McpManager.callTool` and feed the
   result back as a `tool` message. Repeats until the model returns a final
   answer (or `maxTurns` is hit).

```
OpenAI model --tool_calls--> McpManager --MCP protocol--> remote MCP server
     ^                                                           |
     └────────────────────── tool result ───────────────────────┘
```

## Setup

```bash
cd bridges/openai-remote-mcp-bridge
npm install
cp .env.example .env            # fill in OPENAI_API_KEY
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
import OpenAI from "openai";
import { McpManager } from "./src/mcpManager.js";
import { runAgent } from "./src/agent.js";
import { loadMcpConfig } from "./src/config.js";

const mcp = new McpManager();
await mcp.connectAll((await loadMcpConfig("../../mcp.config.json")).servers);

const answer = await runAgent({
  openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }),
  model: "gpt-4.1",
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


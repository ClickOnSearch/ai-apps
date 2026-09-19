# deepseek-remote-mcp-bridge

Lets a DeepSeek agent discover and invoke tools exposed by one or more
**remote** MCP servers. Mirrors
[`../openai-remote-mcp-bridge`](../openai-remote-mcp-bridge) — DeepSeek's
API is OpenAI-compatible, so this uses the `openai` SDK itself, just
pointed at DeepSeek's endpoint (`baseURL: "https://api.deepseek.com"`)
instead of a dedicated DeepSeek SDK.

## How it works

1. `McpManager` connects to each remote MCP server listed in the configured
   `mcp.config.json` (shared at the repo root by default — see
   [Config](#config) — or a bridge-local file) via Streamable HTTP or SSE
   transport, and lists its tools.
2. Each MCP tool's JSON Schema is exposed to DeepSeek as a `function` tool
   (the same shape OpenAI's Chat Completions API uses), namespaced as
   `<serverName>__<toolName>` to avoid collisions across servers.
3. `runAgent` drives the standard OpenAI-style tool-calling loop: send
   messages + tools to the model, and whenever it emits `tool_calls`,
   dispatch each call to the matching MCP server via
   `McpManager.callTool` and feed the result back as a `tool` message.
   Repeats until the model returns a final answer (or `maxTurns` is hit).

```
DeepSeek --tool_calls--> McpManager --MCP protocol--> remote MCP server
   ^                                                        |
   └──────────────────────── tool result ───────────────────┘
```

## Setup

```bash
cd bridges/deepseek-remote-mcp-bridge
npm install
cp .env.example .env            # fill in DEEPSEEK_API_KEY
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

`DEEPSEEK_MODEL` defaults to `deepseek-chat` (DeepSeek-V3). `deepseek-reasoner`
(DeepSeek-R1) has historically had limited or no function-calling support —
check DeepSeek's current docs before pointing this bridge at it.

## Using it as a library

```ts
import OpenAI from "openai";
import { McpManager } from "./src/mcpManager.js";
import { runAgent } from "./src/agent.js";
import { loadMcpConfig } from "./src/config.js";

const mcp = new McpManager();
await mcp.connectAll((await loadMcpConfig("../../mcp.config.json")).servers);

const answer = await runAgent({
  deepseek: new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: "https://api.deepseek.com",
  }),
  model: "deepseek-chat",
  userPrompt: "...",
  mcp,
});

await mcp.closeAll();
```

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

1. `McpManager` connects to each remote MCP server listed in `mcp.config.json`
   (Streamable HTTP or SSE transport) and lists its tools.
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
cp .env.example .env            # fill in ANTHROPIC_API_KEY, any MCP tokens
cp mcp.config.example.json mcp.config.json   # point at your remote MCP server(s)
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

`mcp.config.json`:

```json
{
  "servers": [
    {
      "name": "example",
      "url": "https://example.com/mcp",
      "transport": "http",
      "headers": { "Authorization": "Bearer ${EXAMPLE_MCP_TOKEN}" }
    }
  ]
}
```

- `transport` is `"http"` (Streamable HTTP, the current MCP standard) or
  `"sse"` for legacy servers.
- Header values support `${ENV_VAR}` interpolation, resolved from `.env`.

## Using it as a library

```ts
import Anthropic from "@anthropic-ai/sdk";
import { McpManager } from "./src/mcpManager.js";
import { runAgent } from "./src/agent.js";
import { loadMcpConfig } from "./src/config.js";

const mcp = new McpManager();
await mcp.connectAll((await loadMcpConfig("./mcp.config.json")).servers);

const answer = await runAgent({
  anthropic: new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }),
  model: "claude-sonnet-5",
  userPrompt: "...",
  mcp,
});

await mcp.closeAll();
```

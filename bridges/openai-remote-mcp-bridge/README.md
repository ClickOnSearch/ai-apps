# openai-remote-mcp-bridge

Lets an OpenAI tool-calling agent (Chat Completions API) discover and invoke
tools exposed by one or more **remote** MCP servers.

## How it works

1. `McpManager` connects to each remote MCP server listed in `mcp.config.json`
   (Streamable HTTP or SSE transport) and lists its tools.
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
cp .env.example .env            # fill in OPENAI_API_KEY, any MCP tokens
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
import OpenAI from "openai";
import { McpManager } from "./src/mcpManager.js";
import { runAgent } from "./src/agent.js";
import { loadMcpConfig } from "./src/config.js";

const mcp = new McpManager();
await mcp.connectAll((await loadMcpConfig("./mcp.config.json")).servers);

const answer = await runAgent({
  openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }),
  model: "gpt-4.1",
  userPrompt: "...",
  mcp,
});

await mcp.closeAll();
```

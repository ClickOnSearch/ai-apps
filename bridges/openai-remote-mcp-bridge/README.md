# openai-remote-mcp-bridge

Lets OpenAI call tools from any remote MCP server. Most people use this
through [`github-agent`](../../agents/github-agent) rather than directly —
this README is for using the bridge on its own.

## Setup

Create an `mcp.config.json` in the folder you'll run this from:

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

- `transport` is `"http"` or `"sse"`.
- Header values can reference env vars with `${ENV_VAR}` (e.g. `GITHUB_TOKEN` above).
- Point `MCP_CONFIG_PATH` at a different file if you don't want it named `mcp.config.json`.

## Run

```bash
OPENAI_API_KEY=<your-key> GITHUB_TOKEN=<your-token> \
  npx @clickonsearch/openai-remote-mcp-bridge "your prompt here"
```

---

## For developers

**Running from source:**

```bash
cd bridges/openai-remote-mcp-bridge
npm install
cp .env.example .env            # fill in OPENAI_API_KEY
cd ../..
cp mcp.config.example.json mcp.config.json
# edit it to point at your MCP server(s), and fill in any tokens it references
cd bridges/openai-remote-mcp-bridge
npm run dev -- "your prompt here"
```

**How it works:** `McpManager` connects to each configured MCP server and
lists its tools, exposing each one to OpenAI as a `function` tool
(namespaced `<serverName>__<toolName>` to avoid collisions). `runAgent`
then runs the standard OpenAI tool-calling loop — send messages + tools,
dispatch any `tool_calls` to the matching MCP server, feed the result back
— until the model returns a final answer.

```
OpenAI model --tool_calls--> McpManager --MCP protocol--> remote MCP server
     ^                                                           |
     └────────────────────── tool result ───────────────────────┘
```

**Using it as a library:**

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

**Conversation history:** pass earlier turns as `history` (oldest first,
plain text, sent before `userPrompt`) to give the model context from an
ongoing conversation:

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

Tool calls/results from earlier turns aren't replayed — keep `history`
bounded (e.g. the last 20 messages) to control cost.

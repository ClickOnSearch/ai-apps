# claude-remote-mcp-bridge

Lets Claude call tools from any remote MCP server. Most people use this
through [`github-agent`](../../agents/github-agent) rather than directly —
this README is for using the bridge on its own.

> Anthropic's Messages API also has a built-in (beta) MCP connector that
> lets Claude call a remote MCP server directly, no bridge needed. Use this
> bridge instead when you want your own process in the loop — auth
> injection, logging tool calls, filtering which tools are exposed, or
> combining multiple MCP servers.

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
ANTHROPIC_API_KEY=<your-key> GITHUB_TOKEN=<your-token> \
  npx @clickonsearch/claude-remote-mcp-bridge "your prompt here"
```

---

## For developers

**Running from source:**

```bash
cd bridges/claude-remote-mcp-bridge
npm install
cp .env.example .env            # fill in ANTHROPIC_API_KEY
cd ../..
cp mcp.config.example.json mcp.config.json
# edit it to point at your MCP server(s), and fill in any tokens it references
cd bridges/claude-remote-mcp-bridge
npm run dev -- "your prompt here"
```

**How it works:** `McpManager` connects to each configured MCP server and
lists its tools, exposing each one to Claude as a tool definition (`name` +
`input_schema`, namespaced `<serverName>__<toolName>` to avoid
collisions). `runAgent` then runs the standard Claude tool-use loop — send
messages + tools, and whenever `stop_reason` is `"tool_use"`, dispatch each
call to the matching MCP server and feed the result back — until Claude
returns a final text answer.

```
Claude --tool_use--> McpManager --MCP protocol--> remote MCP server
   ^                                                     |
   └───────────────────── tool_result ──────────────────┘
```

**Using it as a library:**

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
bounded (e.g. the last 20 messages) to control cost. The Messages API
requires the conversation to open with a user turn, so any assistant
messages before the first user message in `history` are skipped.

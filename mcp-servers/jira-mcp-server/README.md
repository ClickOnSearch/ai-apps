# @clickonsearch/jira-mcp-server

Lets an AI agent work with Jira Cloud: create stories that have numbered
acceptance criteria, read and search them, and comment. Anything that writes to
Jira can run as a dry run first. Use it from any AI tool that supports MCP, or
from this repo's model bridges.

```
an AI agent (any MCP client)
               │
               ▼
┌─────────────────────────────┐
│       jira-mcp-server       │   Streamable HTTP MCP
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     Jira Cloud REST API     │   create / read / search / comment
└──────────────┬──────────────┘
               │
               ▼
your Jira site
```

## Setup

1. Create an API token at
   [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Run it:

```bash
JIRA_BASE_URL=https://yourcompany.atlassian.net \
JIRA_EMAIL=you@yourcompany.com \
JIRA_API_TOKEN=<your-api-token> \
  npx @clickonsearch/jira-mcp-server
```

It listens on `http://127.0.0.1:4400` for whatever agent you point at it. The
MCP endpoint is `http://127.0.0.1:4400/mcp`.

## Use it from an AI tool

Point any tool that supports HTTP MCP servers at that URL. For example:

```bash
# Claude Code
claude mcp add --transport http jira http://127.0.0.1:4400/mcp
```

```json
// VS Code / GitHub Copilot: .vscode/mcp.json
{ "servers": { "jira": { "type": "http", "url": "http://127.0.0.1:4400/mcp" } } }
```

(Check your tool's docs for the exact file or command.) Ask it to turn a
requirement into stories with testable acceptance criteria, or to read a story
and comment on it.

## What it exposes

| Tool | What it does |
| --- | --- |
| `create_story` | Creates a Story with a summary, description and **required** acceptance criteria, stored as `AC1`, `AC2`... |
| `get_story` | Reads a story and returns its acceptance criteria parsed into `AC1`, `AC2`... |
| `search_stories` | Searches with JQL (read-only) |
| `add_comment` | Adds a comment to an issue |

**Dry run:** send the header `X-Dry-Run: 1` and `create_story` and `add_comment`
return the draft instead of touching Jira, so a plan can be shown before
anything is created. Tools that can't set headers always get real writes, so
point them at a Jira project you are happy to write to.

## Config reference

| Env var | Default | Notes |
| --- | --- | --- |
| `JIRA_BASE_URL` | | Your site; must be `https://` |
| `JIRA_EMAIL`, `JIRA_API_TOKEN` | | Required |
| `JIRA_PROJECT_KEY` | | Used when `create_story` is given no project |
| `PORT` | `4400` | |
| `BIND_HOST` | `127.0.0.1` | Who can connect. The default means only this computer |
| `JIRA_MCP_TOKEN` | unset | Secret every caller must send. Required whenever `BIND_HOST` isn't `127.0.0.1` |

### Letting another machine connect

By default only programs on the same computer can reach this server. To allow
others, pick a secret and set both:

```bash
export JIRA_MCP_TOKEN=$(openssl rand -hex 32)
BIND_HOST=0.0.0.0 npx @clickonsearch/jira-mcp-server
```

The server refuses to start on any other address without a token. Anyone holding
the token can create and comment on Jira issues as you, so treat it like a
password, and only use this on a network you trust or behind TLS.

## Good to know

- Jira Cloud only (email and API token). Jira Server / Data Center isn't supported.
- Stories use the issue type `Story`; a project without it will return Jira's error.
- Your API token is only ever sent to the Jira site you configure.

---

## For developers

**Running from source:**

```bash
cd mcp-servers/jira-mcp-server
npm install
cp .env.example .env
npm run dev
```

Jira stores rich text as Atlassian Document Format; `src/adf.ts` converts the
plain text this server uses to and from it. Acceptance criteria are written and
parsed by `src/acceptance.ts`.

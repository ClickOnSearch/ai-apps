# linkedin-agent

Read your LinkedIn profile and publish posts to your feed, through chat.
Pick which AI model does the thinking — OpenAI, Claude, or DeepSeek.

## What you need

- Node.js 18+
- A LinkedIn Developer app (see [`linkedin-mcp-server`](../../mcp-servers/linkedin-mcp-server)'s README for the 5-minute setup)
- An API key for at least one of: OpenAI, Anthropic (Claude), DeepSeek

## Setup

**1. Set up and authorize LinkedIn access** (one-time, in its own terminal):

```bash
cd mcp-servers/linkedin-mcp-server
npm install
cp .env.example .env   # fill in LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
npm run dev:authorize   # opens a consent link in your browser, one time
npm run dev
```

**2. Set up this agent** (in a second terminal):

```bash
cd agents/linkedin-agent
npm install
cp .env.example .env
```

Open `.env` and fill in the API key for whichever provider you want to use.

## Use it: command line

```bash
npm run dev -- --provider claude "what does my profile look like?"
npm run dev -- --provider openai "post: excited to share our new release today"
```

## Use it: browser chat

```bash
npm run build
npm run serve
```

Then open `http://localhost:3200` and start chatting.

## Config reference

| Env var             | Required            | Default                 |
| -------------------- | -------------------- | -------------------------- |
| `PROVIDER`            | no                    | `openai`                    |
| `OPENAI_API_KEY`      | if using OpenAI       |                             |
| `OPENAI_MODEL`        | no                    | `gpt-4.1`                   |
| `ANTHROPIC_API_KEY`   | if using Claude       |                             |
| `ANTHROPIC_MODEL`     | no                    | `claude-sonnet-5`           |
| `DEEPSEEK_API_KEY`    | if using DeepSeek     |                             |
| `DEEPSEEK_MODEL`      | no                    | `deepseek-chat`             |
| `LINKEDIN_MCP_URL`    | no                    | `http://localhost:4300`     |
| `PORT`                | no, browser chat only | `3200`                      |

## Good to know

This agent can only do two things: read your own profile, and post to your
own feed. It **can't** send LinkedIn messages (no public API exists for
that, for anyone) or reply to other people's posts (needs special LinkedIn
approval most apps don't have). If you ask it to do either, it'll tell you
it can't rather than pretend.

---

## For developers

Same shape as [`github-agent`](../github-agent): both the CLI and the
browser chat UI (an [AG-UI protocol](https://ag-ui.com) server, same
`POST /agent` shape) call through to
[`linkedin-mcp-server`](../../mcp-servers/linkedin-mcp-server)'s two tools.

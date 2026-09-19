# linkedin-agent

An agent for your personal LinkedIn account — read your own profile, publish
posts to your feed. Same shape as [`github-agent`](../github-agent): a
one-shot CLI and an AG-UI browser chat UI, both routed through whichever
provider you pick (OpenAI, Claude, or DeepSeek).

Requires [`@clickonsearch/linkedin-mcp-server`](../../mcp-servers/linkedin-mcp-server)
running (and already authorized — see that package's README) first.

## Known limits, inherited from linkedin-mcp-server

This agent only has two real capabilities: reading your own profile and
posting to your own feed. It **cannot** send LinkedIn messages (no public
API for that, at all) or read/reply to other people's posts (needs a
LinkedIn Developer Program approval most apps don't have). If you ask it to
do either, it's instructed to say so rather than pretend.

## Setup

```bash
# 1. make sure linkedin-mcp-server is running and authorized (separate terminal)
cd mcp-servers/linkedin-mcp-server
npm install && cp .env.example .env   # fill in LINKEDIN_CLIENT_ID/SECRET
npm run dev:authorize                  # one-time OAuth consent
npm run dev

# 2. then this agent
cd agents/linkedin-agent
npm install
cp .env.example .env
# fill in LINKEDIN_MCP_URL (if not localhost:4300) and your provider's API key
```

## Run: CLI

```bash
npm run dev -- --provider claude "what does my profile look like?"
npm run dev -- --provider openai "post: excited to share our new release today"
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

This starts an HTTP server (default `http://localhost:3200`) with:

- `GET /` — a self-contained chat page (`public/index.html`) with a provider dropdown.
- `POST /agent` — the AG-UI protocol endpoint, same shape as `github-agent`'s.
- `GET /health` — liveness check.

## Config

| Env var             | Required               | Notes                                              |
| -------------------- | ----------------------- | ----------------------------------------------------- |
| `LINKEDIN_MCP_URL`   | no (default `http://localhost:4300`) | where linkedin-mcp-server is running    |
| `PORT`               | no (default `3200`)     | AG-UI server only                                    |
| `PROVIDER`           | no (default `openai`)   | CLI: overridden by `--provider`. Server: default only, overridden per-request by `forwardedProps.provider` |
| `OPENAI_API_KEY`     | when provider=openai    |                                                       |
| `OPENAI_MODEL`       | no (default `gpt-4.1`)  |                                                       |
| `ANTHROPIC_API_KEY`  | when provider=claude    |                                                       |
| `ANTHROPIC_MODEL`    | no (default `claude-sonnet-5`) |                                                |
| `DEEPSEEK_API_KEY`   | when provider=deepseek  |                                                       |
| `DEEPSEEK_MODEL`     | no (default `deepseek-chat`) |                                                  |

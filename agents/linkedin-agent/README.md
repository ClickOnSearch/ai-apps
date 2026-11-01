# linkedin-agent

Read your LinkedIn profile and publish posts to your feed, through chat.
Pick which AI model does the thinking — OpenAI, Claude, or DeepSeek.

```
your prompt
               │
               ▼
┌─────────────────────────────┐
│       linkedin-agent        │   reads your prompt
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│           bridge            │   openai / claude / deepseek — talks to the AI model
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     linkedin-mcp-server     │   reads/posts your profile
└──────────────┬──────────────┘
               │
               ▼
an answer, or a new post on your feed
```

## What you need

- Node.js 18+
- A LinkedIn Developer app (free, a few minutes — see step 1 below)
- An API key for at least one of: OpenAI, Anthropic (Claude), DeepSeek

## Choose your AI model

The agent works with three AI providers. Use whichever one you have an API key for:

| Provider | Set this API key | Get a key | Choose it with |
| --- | --- | --- | --- |
| OpenAI (GPT) | `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `--provider openai` or `PROVIDER=openai` |
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) | `--provider claude` or `PROVIDER=claude` |
| DeepSeek | `DEEPSEEK_API_KEY` | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | `--provider deepseek` or `PROVIDER=deepseek` |

Set just one key and that provider is used automatically. If you set several, pick one with `--provider <name>` or `PROVIDER=<name>`. In the browser chat, the provider is the dropdown at the top of the page; it starts on the provider your key selects.

**Not sure which?** Use whichever key you already have. Every agent works with all three, and you can switch later without changing anything else. Starting from scratch? Any of them is fine to try; DeepSeek is usually the cheapest.

## Setup

**1. Create a LinkedIn app:**

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → Create app.
2. Under **Products**, add **"Sign In with LinkedIn using OpenID Connect"** and **"Share on LinkedIn"**.
3. Under **Auth**, add an **Authorized redirect URL**: `http://localhost:3300/callback`.
4. Copy the app's **Client ID** and **Client Secret**.

**2. Authorize it** (one time — run from a folder you'll reuse in step 3):

```bash
LINKEDIN_CLIENT_ID=<id> LINKEDIN_CLIENT_SECRET=<secret> \
  npx -p @clickonsearch/linkedin-mcp-server linkedin-authorize
```

This opens a link — sign in, approve, done. It saves a token to
`linkedin-token.json` in the current folder, so step 3 needs to run from
this same folder.

**3. Start the LinkedIn connection** (own terminal, keep it running):

```bash
LINKEDIN_CLIENT_ID=<id> LINKEDIN_CLIENT_SECRET=<secret> \
  npx @clickonsearch/linkedin-mcp-server
```

## Use it: command line

```bash
ANTHROPIC_API_KEY=<your-key> npx @clickonsearch/linkedin-agent --provider claude "what does my profile look like?"
```

Swap in `OPENAI_API_KEY` + `--provider openai`, or `DEEPSEEK_API_KEY` +
`--provider deepseek`, to use a different model.

## Use it: browser chat

```bash
ANTHROPIC_API_KEY=<your-key> npx -p @clickonsearch/linkedin-agent linkedin-agent-serve
```

Then open `http://localhost:3200` and start chatting.

## Use it: embedded in another tool

The browser chat server speaks the [AG-UI protocol](https://ag-ui.com)
(`POST /agent`, streaming SSE) — any AG-UI-compatible client can drive it
as a backend, not just the bundled page.

## Config reference

| Env var             | Required            | Default                 |
| -------------------- | -------------------- | -------------------------- |
| `PROVIDER`            | no                    | whichever API key is set    |
| `OPENAI_API_KEY`      | if using OpenAI       |                             |
| `OPENAI_MODEL`        | no                    | `gpt-4.1`                   |
| `ANTHROPIC_API_KEY`   | if using Claude       |                             |
| `ANTHROPIC_MODEL`     | no                    | `claude-sonnet-5`           |
| `DEEPSEEK_API_KEY`    | if using DeepSeek     |                             |
| `DEEPSEEK_MODEL`      | no                    | `deepseek-chat`             |
| `LINKEDIN_MCP_URL`    | no                    | `http://127.0.0.1:4300`     |
| `LINKEDIN_MCP_TOKEN`  | only if the server needs one | |
| `PORT`                | no, browser chat only | `3200`                      |

## Good to know

This agent can only do two things: read your own profile, and post to your
own feed. It **can't** send LinkedIn messages (no public API exists for
that, for anyone) or reply to other people's posts (needs special LinkedIn
approval most apps don't have). If you ask it to do either, it'll tell you
it can't rather than pretend.

---

## For developers

**Running from source:**

```bash
# terminal 1
cd mcp-servers/linkedin-mcp-server
npm install
cp .env.example .env   # fill in LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
npm run dev:authorize   # opens a consent link in your browser, one time
npm run dev

# terminal 2
cd agents/linkedin-agent
npm install
cp .env.example .env    # fill in a provider key
npm run dev -- --provider claude "what does my profile look like?"
npm run serve             # or browser chat
```

Same shape as [`github-agent`](../github-agent): both the CLI and the
browser chat UI (an AG-UI protocol server, same `POST /agent` shape) call
through to [`linkedin-mcp-server`](../../mcp-servers/linkedin-mcp-server)'s
two tools.

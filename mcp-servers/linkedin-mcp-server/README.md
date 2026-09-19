# @clickonsearch/linkedin-mcp-server

MCP server for a **personal** LinkedIn account via LinkedIn's OAuth 2.0 API.
Exposes exactly two tools: `get_profile` and `create_post`.

## Why only two tools

LinkedIn's public API is far more restricted than GitHub's or Gmail's. A
standard, self-serve developer app can only:

- Read the authenticated member's own basic profile (OpenID Connect).
- Publish a post to their own feed (`w_member_social`).

**Sending LinkedIn messages is not available via any public API** — it only
exists under partner programs (Talent Solutions, Sales Navigator) that
require a formal application and LinkedIn's manual approval; there is no
self-serve path to it at all.

**Replying/commenting on posts** has a documented endpoint
(`/v2/socialActions/{urn}/comments`), but creating comments requires a
separate LinkedIn Developer Program product ("Community Management API" or
similar) that also needs LinkedIn's case-by-case approval — it is not
included in standard "Sign In with LinkedIn" / "Share on LinkedIn" access.
This server doesn't implement it; if you get that access approved, adding
a `create_comment` tool following the same pattern as `create_post` would
be straightforward.

## Setup

1. Create an app at [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps).
2. Under **Products**, add **"Sign In with LinkedIn using OpenID Connect"**
   and **"Share on LinkedIn"** — both are self-serve, no approval wait.
3. Under **Auth**, add an **Authorized redirect URL** matching
   `LINKEDIN_REDIRECT_URI` below exactly (default `http://localhost:3300/callback`).
4. Copy the app's **Client ID** and **Client Secret**.

```bash
cd mcp-servers/linkedin-mcp-server
npm install
cp .env.example .env
# fill in LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
```

## Authorize (one-time)

```bash
npm run dev:authorize
```

This prints a URL — open it, sign in, approve — and it saves a token to
`LINKEDIN_TOKEN_PATH` (default `./linkedin-token.json`, gitignored).

**Important:** LinkedIn only issues a refresh token to apps it has approved
for offline access. For a standard app, the access token this saves is
valid for **~60 days** and there is no automatic renewal — re-run this
command once it expires (tools will fail with a clear "access token has
expired" error when that happens).

## Run

```bash
npm run dev
```

- `POST http://localhost:4300/mcp` — the MCP endpoint (Streamable HTTP, stateless).
- `GET http://localhost:4300/health` — liveness check.

## Tools

| Tool           | Args   | Notes                                                |
| -------------- | ------ | ----------------------------------------------------- |
| `get_profile`  | —      | Name, email, picture — from the OpenID Connect userinfo endpoint |
| `create_post`  | `text` | Publishes to the authenticated member's own feed, `visibility: PUBLIC` |

## Using it as a library

```ts
import { TokenManager, LinkedInClient, createServer } from "./src/index.js";

const tokens = new TokenManager(
  {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: "http://localhost:3300/callback",
    scopes: ["openid", "profile", "email", "w_member_social"],
  },
  "./linkedin-token.json",
);

const app = createServer(new LinkedInClient(tokens));
app.listen(4300);
```

# @clickonsearch/linkedin-mcp-server

Connects a personal LinkedIn account to this repo's agents: read your
profile, publish posts. Usually you won't run this directly —
[`linkedin-agent`](../../agents/linkedin-agent)'s README tells you when to.

## Setup

**1. Create a LinkedIn app** (free, a few minutes):

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

> LinkedIn's access tokens last ~60 days and (for a standard app) don't
> auto-renew. When yours expires, just re-run the authorize command above —
> you'll get a clear error telling you to when that happens.

## Run

```bash
LINKEDIN_CLIENT_ID=<id> LINKEDIN_CLIENT_SECRET=<secret> \
  npx @clickonsearch/linkedin-mcp-server
```

It's now listening on `http://localhost:4300` for whatever agent you point
at it.

## What it exposes

| Tool           | What it does                                          |
| -------------- | -------------------------------------------------------- |
| `get_profile`  | Your name, email, and picture                              |
| `create_post`  | Publishes a text post to your own feed                     |

## Good to know

LinkedIn's public API only allows reading your own profile and posting to
your own feed — that's genuinely everything a standard app can do. It
**can't** send messages (no public API for that at all) or comment on
other people's posts (needs special LinkedIn approval). This server
doesn't pretend otherwise.

---

## For developers

**Running from source:**

```bash
cd mcp-servers/linkedin-mcp-server
npm install
cp .env.example .env   # fill in LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
npm run dev:authorize   # opens a consent link in your browser, one time
npm run dev
```

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

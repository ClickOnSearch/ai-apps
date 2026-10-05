# Unauthenticated network access to `whatsapp-mcp-server` and `linkedin-mcp-server`

| | |
| --- | --- |
| **Date** | 2026-10-06 |
| **Severity** | High (CVSS 3.1: **8.1**, `AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`). Critical (9.1, `AV:N`) if the port is reachable beyond the local network. |
| **Weakness** | CWE-306 Missing Authentication for Critical Function; CWE-1327 Binding to an Unrestricted IP Address |
| **Affected** | `@clickonsearch/whatsapp-mcp-server` `<= 0.1.1`; `@clickonsearch/linkedin-mcp-server` `<= 0.1.1` |
| **Patched** | `0.2.0` of both servers (with `whatsapp-agent` / `linkedin-agent` `0.1.2`, which send the token) |
| **Credit** | Reported by **0xwaidwerk** |

## Summary

Both servers called `app.listen(port)` without a host, so they listened on
**every network interface**, and neither authenticated callers. Anyone who
could reach the port could use the server's MCP tools as the account owner.

The MCP SDK's Host-header check does not prevent this. It only defends
against browser DNS-rebinding, and it can be bypassed by a network client
that sends `Host: localhost`. In testing, a request to the machine's LAN
address with its real Host header returned `403`, while the same
unauthenticated request with `Host: localhost` returned an MCP `initialize`
`200` and a session.

## Impact

Exposure depends on which server you run and whether the account is linked:

- **`whatsapp-mcp-server`** — with a linked WhatsApp account, an
  unauthenticated caller could, through `/mcp`, send messages as you, list
  your chats, read recent messages and search your contacts. `/events`
  streamed every incoming message to any caller, and `/health` disclosed the
  linked account identifier. With no account linked there is nothing to read
  or send; the report confirmed tool listing only, and no messages were read
  or sent during testing.
- **`linkedin-mcp-server`** — with an authorized account, an unauthenticated
  caller could call `get_profile` and `create_post`, publishing public posts
  to your LinkedIn feed as you.

Who could reach the port depends on your network: other devices on the same
Wi-Fi/LAN by default, and anyone on the internet if the port was forwarded or
the host was directly exposed (for example a cloud VM without a firewall).

The servers keep no access logs, so past access cannot be ruled out after the
fact.

## Am I affected?

You are affected if you ran `0.1.0` or `0.1.1` of either server. Check what it
is bound to while it is running:

```bash
lsof -nP -iTCP:4100 -sTCP:LISTEN   # whatsapp-mcp-server (default port)
lsof -nP -iTCP:4300 -sTCP:LISTEN   # linkedin-mcp-server (default port)
```

`*:4100` / `*:4300` (or `0.0.0.0`) means every interface was exposed.
`127.0.0.1:...` means only your own machine. A server that was never running
on a network you don't control, with the port not forwarded, had limited
exposure.

## Fix

Upgrade both servers to `0.2.0`, and the matching agents to `0.1.2` (they now
send the token):

```bash
npx @clickonsearch/whatsapp-mcp-server@latest
npx @clickonsearch/linkedin-mcp-server@latest
```

`0.2.0` changes the defaults:

- The servers listen on `127.0.0.1` only.
- New `BIND_HOST` setting. Any non-loopback value requires a token, and the
  server refuses to start without one: `WHATSAPP_MCP_TOKEN` /
  `LINKEDIN_MCP_TOKEN` (16+ characters, for example `openssl rand -hex 32`).
- When a token is set, every route (`/mcp`, `/events`, `/health`) requires
  `Authorization: Bearer <token>`, compared in constant time.
- `whatsapp-agent` and `linkedin-agent` `0.1.2` read the same token variable
  and send it automatically. Their default server URLs are now
  `http://127.0.0.1:...`.

Host-header validation is unchanged and remains a separate defense against
browser-origin attacks; it is not treated as authentication.

**Breaking change** (hence a minor bump while the packages are `0.x`): anything that reached these servers from another machine
will stop working until `BIND_HOST` and the token are set. See each server's
README, "Letting another machine connect".

## Workarounds (if you cannot upgrade yet)

- Block inbound connections to the port with a host firewall, or run the
  server in a container published only to loopback
  (`-p 127.0.0.1:4100:4100`).
- Do not forward the port and do not run the server on an untrusted network.
- Put it behind a reverse proxy that requires authentication.

## If you may have been exposed

- **WhatsApp:** on your phone, open Settings → Linked devices and log the
  device out, then delete the server's `whatsapp-auth` folder and link again.
  This revokes the session.
- **LinkedIn:** revoke the app's access to your account in LinkedIn's
  permitted-services settings (or regenerate the app's client secret), delete
  `linkedin-token.json`, and re-run the authorize step. Review your recent
  posts for anything you did not publish.

## Timeline

- **2026-10-06** — Reported by 0xwaidwerk; fix developed for both servers;
  servers `0.2.0` and agents `0.1.2` released with this advisory.

## Credit

Thank you to **0xwaidwerk** for the report, including the reproduction that
showed the Host-header check being bypassed and the clear separation between
Host validation and caller authentication.

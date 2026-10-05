# Security policy

## Reporting a vulnerability

Please report security issues privately rather than in a public issue. Use
GitHub's private reporting: open the **Security** tab of this repository and
choose **Report a vulnerability**.

Include the affected package and version, what an attacker can do, and steps
to reproduce. A reproduction against your own account or a test account is
ideal; please don't read or change other people's data while testing.

## Supported versions

Fixes go into the latest published version of each package. Older versions
are not patched, so upgrade to the latest release.

## Security advisories

| Date | Advisory | Affected | Fixed in |
| --- | --- | --- | --- |
| 2026-10-06 | [Unauthenticated network access to `whatsapp-mcp-server` and `linkedin-mcp-server`](advisories/2026-10-06-mcp-servers-network-exposure.md) | `<= 0.1.1` of both | `0.2.0` |

## Credits

Thanks to everyone who reports issues responsibly:

- **0xwaidwerk** — unauthenticated network access to the MCP servers (2026-10-06)

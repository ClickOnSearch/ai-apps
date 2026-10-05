import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "::1"];
const MIN_TOKEN_LENGTH = 16;

export interface ListenConfig {
  host: string;
  /** Bearer token every caller must present. Always set when `host` isn't loopback. */
  authToken?: string;
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.includes(host);
}

/**
 * Listens on loopback only unless BIND_HOST says otherwise, and refuses to
 * listen on anything else without a token — the MCP tools can send
 * WhatsApp messages and read chats, so a network-reachable server with no
 * caller authentication is never acceptable.
 */
export function resolveListenConfig(env: NodeJS.ProcessEnv = process.env): ListenConfig {
  const host = env.BIND_HOST || "127.0.0.1";
  const authToken = env.WHATSAPP_MCP_TOKEN || undefined;

  if (authToken && authToken.length < MIN_TOKEN_LENGTH) {
    throw new Error(`WHATSAPP_MCP_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters (try: openssl rand -hex 32)`);
  }
  if (!isLoopbackHost(host) && !authToken) {
    throw new Error(
      `Refusing to listen on ${host} without authentication. Set WHATSAPP_MCP_TOKEN ` +
        `(try: openssl rand -hex 32), or unset BIND_HOST to listen on 127.0.0.1 only.`,
    );
  }

  return { host, authToken };
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Rejects any request without `Authorization: Bearer <token>`. Compared in constant time. */
export function requireBearerToken(token: string): RequestHandler {
  const expected = sha256(token);

  return (req, res, next) => {
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
    if (match && timingSafeEqual(sha256(match[1]), expected)) {
      next();
      return;
    }
    res.status(401).set("WWW-Authenticate", "Bearer").json({ error: "unauthorized" });
  };
}

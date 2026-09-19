import { readFile, writeFile } from "node:fs/promises";

const AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
  scope: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export function buildAuthorizationUrl(config: LinkedInOAuthConfig, state: string): string {
  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scopes.join(" "));
  return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<StoredToken> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`LinkedIn token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export function exchangeCodeForToken(config: LinkedInOAuthConfig, code: string): Promise<StoredToken> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
}

export async function refreshAccessToken(config: LinkedInOAuthConfig, refreshToken: string): Promise<StoredToken> {
  const token = await requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  );
  // LinkedIn doesn't always re-issue a refresh_token on refresh; keep the old one if so.
  return { ...token, refreshToken: token.refreshToken ?? refreshToken };
}

export async function loadToken(path: string): Promise<StoredToken | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as StoredToken;
  } catch {
    return undefined;
  }
}

export async function saveToken(path: string, token: StoredToken): Promise<void> {
  await writeFile(path, JSON.stringify(token, null, 2), "utf-8");
}

/**
 * Loads the persisted token on first use and hands out a valid access
 * token, transparently refreshing it when it's expiring soon — as long as
 * LinkedIn actually issued a refresh token, which it only does for apps
 * approved for a product that grants offline access. Otherwise the token
 * is simply valid for ~60 days and re-authorizing is a manual step.
 */
export class TokenManager {
  private token?: StoredToken;

  constructor(
    private readonly config: LinkedInOAuthConfig,
    private readonly tokenPath: string,
  ) {}

  async getValidAccessToken(): Promise<string> {
    if (!this.token) {
      this.token = await loadToken(this.tokenPath);
    }
    if (!this.token) {
      throw new Error(
        'Not authorized yet. Run "npm run authorize" (see README) to link your LinkedIn account first.',
      );
    }

    const expiringSoon = Date.now() > this.token.expiresAt - 60_000;
    if (expiringSoon) {
      if (!this.token.refreshToken) {
        throw new Error(
          "LinkedIn access token has expired. LinkedIn only issues refresh tokens to apps approved for " +
            'offline access; without one, re-run "npm run authorize" to get a new token.',
        );
      }
      this.token = await refreshAccessToken(this.config, this.token.refreshToken);
      await saveToken(this.tokenPath, this.token);
    }

    return this.token.accessToken;
  }
}

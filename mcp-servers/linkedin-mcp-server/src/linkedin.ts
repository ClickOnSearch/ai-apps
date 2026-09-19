import type { TokenManager } from "./auth.js";

const API_BASE = "https://api.linkedin.com";

/**
 * LinkedIn requires a version header (YYYYMM) on its versioned REST APIs
 * (like /rest/posts). LinkedIn ships new versions monthly; if create_post
 * starts failing, check LinkedIn's current API docs for whether this needs
 * bumping.
 */
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202409";

export interface LinkedInProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** Talks to LinkedIn's OpenID Connect userinfo endpoint and its versioned Posts API. */
export class LinkedInClient {
  constructor(private readonly tokens: TokenManager) {}

  private async authHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.tokens.getValidAccessToken();
    return { Authorization: `Bearer ${accessToken}` };
  }

  /** The authenticated member's basic profile, via OpenID Connect (scopes: openid profile email). */
  async getProfile(): Promise<LinkedInProfile> {
    const res = await fetch(`${API_BASE}/v2/userinfo`, { headers: await this.authHeaders() });
    if (!res.ok) {
      throw new Error(`LinkedIn userinfo request failed: ${res.status} ${await readErrorBody(res)}`);
    }
    return (await res.json()) as LinkedInProfile;
  }

  /** Publishes a text post to the authenticated member's own feed (scope: w_member_social). */
  async createPost(text: string): Promise<{ id: string }> {
    const [profile, authHeaders] = await Promise.all([this.getProfile(), this.authHeaders()]);

    const res = await fetch(`${API_BASE}/rest/posts`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_API_VERSION,
      },
      body: JSON.stringify({
        author: `urn:li:person:${profile.sub}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`LinkedIn create post failed: ${res.status} ${await readErrorBody(res)}`);
    }

    const id = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "unknown";
    return { id };
  }
}

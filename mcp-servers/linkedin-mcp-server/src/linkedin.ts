import type { TokenManager } from "./auth.js";

const API_BASE = "https://api.linkedin.com";

/**
 * LinkedIn requires a version header (YYYYMM) on its versioned REST APIs
 * (like /rest/posts). LinkedIn ships new versions monthly and only keeps
 * each one supported for roughly a year before sunsetting it — this WILL
 * go stale again. If create_post starts failing with a 426
 * ("NONEXISTENT_VERSION"), check LinkedIn's current API docs
 * (https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/protocol-version)
 * for a current YYYYMM value and set LINKEDIN_API_VERSION.
 */
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202609";

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

/** Throws a clear, actionable error for a failed LinkedIn API response. */
async function assertOk(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  const body = await readErrorBody(res);

  if (res.status === 426 || body.includes("NONEXISTENT_VERSION")) {
    throw new Error(
      `LinkedIn rejected ${action}: the LINKEDIN_API_VERSION this server is sending (${LINKEDIN_API_VERSION}) ` +
        "has been sunset by LinkedIn (it only supports each monthly version for about a year). Set " +
        "LINKEDIN_API_VERSION in your .env to a current YYYYMM value — see " +
        "https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/protocol-version — and restart the server.",
    );
  }

  throw new Error(`LinkedIn ${action} failed: ${res.status} ${body}`);
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
    await assertOk(res, "get_profile");
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

    await assertOk(res, "create_post");

    const id = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "unknown";
    return { id };
  }
}

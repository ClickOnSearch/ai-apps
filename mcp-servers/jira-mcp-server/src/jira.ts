import { adfToText, textToAdf, type AdfNode } from "./adf.js";

const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;
const PROJECT_KEY = /^[A-Z][A-Z0-9_]+$/;

export interface JiraConfig {
  /** e.g. https://yourcompany.atlassian.net */
  baseUrl: string;
  email: string;
  /** An API token from https://id.atlassian.com/manage-profile/security/api-tokens */
  apiToken: string;
}

export class JiraError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface IssueSummary {
  key: string;
  summary: string;
  status: string;
  url: string;
}

export interface Issue extends IssueSummary {
  type: string;
  labels: string[];
  /** Description as plain text (ADF flattened), including any acceptance criteria. */
  description: string;
}

export function assertIssueKey(key: string): string {
  if (!ISSUE_KEY.test(key)) throw new JiraError(`"${key}" is not a Jira issue key (expected something like PROJ-123)`);
  return key;
}

export function assertProjectKey(project: string): string {
  if (!PROJECT_KEY.test(project)) throw new JiraError(`"${project}" is not a Jira project key (expected something like PROJ)`);
  return project;
}

interface RawIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string };
    issuetype?: { name?: string };
    labels?: string[];
    description?: AdfNode | null;
  };
}

/** Jira Cloud REST API v3 with an email + API token. (Jira Server / Data Center is not supported.) */
export class JiraClient {
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor(
    config: JiraConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const url = new URL(config.baseUrl);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) {
      throw new JiraError("JIRA_BASE_URL must use https:// (your API token is sent with every request)");
    }
    this.baseUrl = url.origin;
    this.authorization = "Basic " + Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: { Authorization: this.authorization, Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      let detail = raw.slice(0, 300);
      try {
        const parsed = JSON.parse(raw) as { errorMessages?: string[]; errors?: Record<string, string> };
        detail = [...(parsed.errorMessages ?? []), ...Object.entries(parsed.errors ?? {}).map(([k, v]) => `${k}: ${v}`)].join("; ") || detail;
      } catch {
        // not JSON; keep the raw snippet
      }
      const hint = res.status === 401 || res.status === 403 ? " (check JIRA_EMAIL, JIRA_API_TOKEN and your permissions)" : "";
      throw new JiraError(`Jira ${method} ${path.split("?")[0]} failed: HTTP ${res.status}${detail ? ` — ${detail}` : ""}${hint}`, res.status);
    }

    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private toIssue(raw: RawIssue): Issue {
    return {
      key: raw.key,
      summary: raw.fields.summary ?? "",
      status: raw.fields.status?.name ?? "",
      type: raw.fields.issuetype?.name ?? "",
      labels: raw.fields.labels ?? [],
      description: adfToText(raw.fields.description),
      url: `${this.baseUrl}/browse/${raw.key}`,
    };
  }

  async createIssue(input: { project: string; issueType: string; summary: string; description: string; labels?: string[] }): Promise<IssueSummary> {
    assertProjectKey(input.project);
    const created = await this.request<{ key: string }>("POST", "/rest/api/3/issue", {
      fields: {
        project: { key: input.project },
        issuetype: { name: input.issueType },
        summary: input.summary,
        description: textToAdf(input.description),
        ...(input.labels?.length ? { labels: input.labels } : {}),
      },
    });
    return { key: created.key, summary: input.summary, status: "", url: `${this.baseUrl}/browse/${created.key}` };
  }

  async getIssue(key: string): Promise<Issue> {
    assertIssueKey(key);
    const raw = await this.request<RawIssue>("GET", `/rest/api/3/issue/${key}?fields=summary,description,status,issuetype,labels`);
    return this.toIssue(raw);
  }

  async search(jql: string, maxResults: number): Promise<IssueSummary[]> {
    const result = await this.request<{ issues: RawIssue[] }>("POST", "/rest/api/3/search/jql", {
      jql,
      maxResults,
      fields: ["summary", "status", "issuetype"],
    });
    return result.issues.map((raw) => {
      const { key, summary, status, url } = this.toIssue(raw);
      return { key, summary, status, url };
    });
  }

  async addComment(key: string, text: string): Promise<{ id: string }> {
    assertIssueKey(key);
    const created = await this.request<{ id: string }>("POST", `/rest/api/3/issue/${key}/comment`, { body: textToAdf(text) });
    return { id: created.id };
  }
}

import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { Express } from "express";
import { formatAcceptanceCriteria, parseAcceptanceCriteria } from "./acceptance.js";
import { requireBearerToken, type ListenConfig } from "./access.js";
import type { JiraClient } from "./jira.js";

export interface ServerOptions {
  /** Used when create_story is called without a project. */
  defaultProject?: string;
  /** Expose only these tools (default: all). Lets a caller guarantee a run cannot, say, create stories. */
  enabledTools?: string[];
}

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });
const json = (value: unknown) => text(JSON.stringify(value, null, 2));

function buildMcpServer(jira: JiraClient, options: ServerOptions, dryRun: boolean): McpServer {
  const server = new McpServer({ name: "jira-mcp-server", version: "0.1.0" }, { capabilities: {} });
  const enabled = (tool: string) => !options.enabledTools || options.enabledTools.includes(tool);

  if (enabled("create_story")) {
  server.registerTool(
    "create_story",
    {
      description:
        "Create a Jira story. Acceptance criteria are required and are stored as a numbered AC1, AC2... list in the description. " +
        "Write each criterion so it can be checked by a test.",
      inputSchema: {
        summary: z.string().min(1).max(255).describe("Story title, ideally 'As a <user> I want <goal> so that <benefit>'"),
        description: z.string().optional().describe("Context and background; do not repeat the acceptance criteria here"),
        acceptanceCriteria: z.array(z.string().min(1)).min(1).max(20).describe("Testable acceptance criteria, one per item, without an AC number"),
        project: z.string().optional().describe("Jira project key, e.g. PROJ. Defaults to JIRA_PROJECT_KEY"),
        labels: z.array(z.string()).optional(),
      },
    },
    async ({ summary, description, acceptanceCriteria, project, labels }) => {
      const key = project ?? options.defaultProject;
      if (!key) throw new Error("No project given and JIRA_PROJECT_KEY is not set");
      const body = [description?.trim(), formatAcceptanceCriteria(acceptanceCriteria)].filter(Boolean).join("\n\n");

      if (dryRun) {
        return text(`DRY RUN: nothing was created in Jira. This is the draft story for project ${key}:\n\n# ${summary}\n\n${body}`);
      }
      const created = await jira.createIssue({ project: key, issueType: "Story", summary, description: body, labels });
      return text(`Created ${created.key}: ${created.url}`);
    },
  );
  }

  if (enabled("get_story")) {
  server.registerTool(
    "get_story",
    {
      description: "Read a Jira story, including its acceptance criteria parsed into AC1, AC2... items.",
      inputSchema: { key: z.string().describe("Issue key, e.g. PROJ-123") },
    },
    async ({ key }) => {
      const issue = await jira.getIssue(key);
      return json({ ...issue, acceptanceCriteria: parseAcceptanceCriteria(issue.description) });
    },
  );
  }

  if (enabled("search_stories")) {
  server.registerTool(
    "search_stories",
    {
      description: "Search Jira with JQL (read-only). Useful to check whether a story already exists before creating one.",
      inputSchema: {
        jql: z.string().min(1).describe('JQL query, e.g. project = PROJ AND text ~ "login" ORDER BY created DESC'),
        maxResults: z.number().int().min(1).max(50).default(20),
      },
    },
    async ({ jql, maxResults }) => json(await jira.search(jql, maxResults)),
  );
  }

  if (enabled("add_comment")) {
  server.registerTool(
    "add_comment",
    {
      description: "Add a comment to a Jira issue.",
      inputSchema: { key: z.string(), text: z.string().min(1).describe("Comment text; '-' lines become bullets") },
    },
    async ({ key, text: comment }) => {
      if (dryRun) return text(`DRY RUN: nothing was posted to Jira. This is the draft comment for ${key}:\n\n${comment}`);
      const created = await jira.addComment(key, comment);
      return text(`Comment ${created.id} added to ${key}`);
    },
  );
  }

  return server;
}

/**
 * `POST /mcp` is the stateless MCP endpoint and `GET /health` a liveness check.
 *
 * Writes (create_story, add_comment) are real only when the caller does not
 * send `X-Dry-Run: 1`. A dry-run caller gets the draft back and Jira is never
 * contacted, which lets an agent show a plan before anyone approves it.
 *
 * `listen` must match what the caller passes to `app.listen`; when it carries
 * an `authToken`, every route requires `Authorization: Bearer <token>`.
 */
export function createServer(jira: JiraClient, listen: ListenConfig = { host: "127.0.0.1" }, options: ServerOptions = {}): Express {
  const app = createMcpExpressApp({ host: listen.host });
  if (listen.authToken) app.use(requireBearerToken(listen.authToken));

  app.post("/mcp", async (req, res) => {
    try {
      const server = buildMcpServer(jira, options, req.header("x-dry-run") === "1");
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
          id: null,
        });
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

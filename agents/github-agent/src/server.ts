import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import type { RunAgentInput } from "@ag-ui/core";
import { runAgUiRequest } from "./agui.js";
import type { Provider } from "./providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CreateServerOptions {
  githubToken: string;
  githubMcpUrl: string;
  defaultProvider: Provider;
}

export function createServer(options: CreateServerOptions): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, defaultProvider: options.defaultProvider });
  });

  app.post("/agent", async (req, res) => {
    const body = req.body as Partial<RunAgentInput> | undefined;

    if (!body || !Array.isArray(body.messages)) {
      res.status(400).json({ error: 'Request body must be a RunAgentInput with a "messages" array' });
      return;
    }

    const input: RunAgentInput = {
      threadId: body.threadId ?? "",
      runId: body.runId ?? "",
      messages: body.messages,
      tools: body.tools ?? [],
      context: body.context ?? [],
      forwardedProps: body.forwardedProps,
    };

    try {
      await runAgUiRequest({
        input,
        githubToken: options.githubToken,
        githubMcpUrl: options.githubMcpUrl,
        defaultProvider: options.defaultProvider,
        res,
        acceptHeader: req.headers.accept,
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      } else {
        res.end();
      }
    }
  });

  return app;
}

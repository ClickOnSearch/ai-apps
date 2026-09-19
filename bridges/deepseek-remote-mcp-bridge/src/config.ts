import { readFile } from "node:fs/promises";

export interface McpServerConfig {
  /** Short unique name, used to namespace tool calls (e.g. "search"). */
  name: string;
  /** Remote MCP endpoint URL. */
  url: string;
  /** Transport the server speaks. Defaults to "http" (Streamable HTTP). */
  transport?: "http" | "sse";
  /** Extra headers sent on every request, e.g. Authorization. Supports ${ENV_VAR} interpolation. */
  headers?: Record<string, string>;
}

export interface BridgeConfig {
  servers: McpServerConfig[];
}

function interpolateEnv(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, name) => {
    const envValue = process.env[name];
    if (envValue === undefined) {
      throw new Error(`Missing environment variable "${name}" referenced in mcp config`);
    }
    return envValue;
  });
}

export async function loadMcpConfig(path: string): Promise<BridgeConfig> {
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as BridgeConfig;

  if (!Array.isArray(parsed.servers) || parsed.servers.length === 0) {
    throw new Error(`mcp config at "${path}" must define a non-empty "servers" array`);
  }

  for (const server of parsed.servers) {
    if (!server.name || !server.url) {
      throw new Error(`each mcp server entry needs "name" and "url": ${JSON.stringify(server)}`);
    }
    if (server.headers) {
      for (const [key, value] of Object.entries(server.headers)) {
        server.headers[key] = interpolateEnv(value);
      }
    }
  }

  return parsed;
}

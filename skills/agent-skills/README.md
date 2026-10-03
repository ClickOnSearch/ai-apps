# @clickonsearch/agent-skills

A library of reusable instructions ("skills") any agent in this repo can
turn on to change how it reasons — without changing what it can do.

```
a skill, e.g. code-review
               │
               ▼
┌─────────────────────────────┐
│        agent-skills         │   the instructions
└──────────────┬──────────────┘
               │
               ▼
--skill on an agent, an MCP prompt, or a static .md export
```

## Available skills

| Name          | What it does                                                        |
| ------------- | ---------------------------------------------------------------------- |
| `code-review` | Reviews a diff or piece of code against a checklist (correctness, security, simplicity, test coverage) and reports concrete findings. |

## Using a skill

**From an agent that supports `--skill`** (currently
[`github-agent`](../../agents/github-agent)):

```bash
GITHUB_TOKEN=<your-token> ANTHROPIC_API_KEY=<your-key> \
  npx @clickonsearch/github-agent --skill code-review "review pull request #12 in owner/repo and post a comment"
```

**From an external tool (GitHub Copilot, Cursor, Claude Desktop, Windsurf,
...)** — two ways, depending on whether your tool speaks MCP:

1. **MCP (live, recommended):** run `npx @clickonsearch/agent-skills-mcp` as
   an MCP server and the tool can list/fetch skills directly, by name, as
   MCP "prompts" — no copying, always up to date. Add it to your tool's MCP
   config, e.g.:

   ```json
   {
     "mcpServers": {
       "agent-skills": {
         "command": "npx",
         "args": ["-y", "@clickonsearch/agent-skills-mcp"]
       }
     }
   }
   ```

   (VS Code / GitHub Copilot: `.vscode/mcp.json`. Claude Desktop:
   `claude_desktop_config.json`. Check your tool's docs for the exact file.)

2. **Static export (works anywhere):** for tools that only read plain
   instruction files, export a skill to markdown and drop it where that
   tool looks for custom instructions:

   ```bash
   npx @clickonsearch/agent-skills export code-review .github/copilot-instructions.md
   # or: CLAUDE.md, .cursor/rules/code-review.mdc, etc.
   ```

   This is a static copy — re-run the export after the skill changes.
   `npx @clickonsearch/agent-skills list` shows all available skill names.

---

## For developers

A skill is just instructions — it never assumes a specific tool exists, so
the same skill works unmodified on any agent, whatever MCP server it's
connected to. If a capability needs a new tool (e.g. "post an inline PR
comment"), that's not a skill, it's a tool on the relevant MCP server.

```ts
import { composeSystemPrompt } from "@clickonsearch/agent-skills";

const systemPrompt = composeSystemPrompt(baseSystemPromptOrUndefined, "code-review");
// pass `systemPrompt` into runAgent/runGithubAgent/etc as usual
```

`composeSystemPrompt(base, undefined)` returns `base` unchanged, so an
agent that doesn't request a skill behaves exactly as before.

**Adding a new skill:**

1. Create `src/skills/<name>.ts` exporting a `Skill` (`name`, `description`,
   `instructions`) — keep `instructions` free of any tool assumptions.
2. Register it in `src/index.ts`'s `SKILLS` map.
3. Any agent wiring up `--skill` (see `github-agent`'s `cli.ts`) picks it
   up automatically — no per-agent code needed. It's also picked up
   automatically by `agent-skills-mcp` (`src/mcpServer.ts`, one MCP prompt
   per entry in `SKILLS`) and by `agent-skills export`/`list`
   (`src/cli.ts`) — nothing else to wire up.

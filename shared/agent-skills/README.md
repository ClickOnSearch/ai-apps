# @clickonsearch/agent-skills

A library of reusable instructions ("skills") any agent in this repo can
turn on to change how it reasons — without changing what it can do.

## Available skills

| Name          | What it does                                                        |
| ------------- | ---------------------------------------------------------------------- |
| `code-review` | Reviews a diff or piece of code against a checklist (correctness, security, simplicity, test coverage) and reports concrete findings. |

## Using a skill

From an agent that supports `--skill` (currently
[`github-agent`](../../agents/github-agent)):

```bash
npm run dev -- --skill code-review "review this diff: $(git diff main)"
```

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
   up automatically — no per-agent code needed.

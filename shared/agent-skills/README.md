# @clickonsearch/agent-skills

Reusable, provider- and MCP-server-agnostic system-prompt modules ("skills")
that any agent in this repo can layer on top of its own base instructions.

## Why this exists

`github-agent`, `whatsapp-agent`, and `linkedin-agent` each already have
their own base behavior (and in some cases a default system prompt) tied to
their specific MCP tools. A **skill** is different: it's pure instructions
— no tool assumptions — so the exact same skill works unmodified on any
agent. If a capability needs a new tool (e.g. "post an inline PR comment"),
that's not a skill, it's a tool on the relevant MCP server.

## Usage

```ts
import { composeSystemPrompt } from "@clickonsearch/agent-skills";

const systemPrompt = composeSystemPrompt(baseSystemPromptOrUndefined, "code-review");
// pass `systemPrompt` into runAgent/runGithubAgent/etc as usual
```

`composeSystemPrompt(base, undefined)` returns `base` unchanged — every
agent using this keeps working exactly as before when no skill is
requested.

## Skills

| Name          | Description                                                        |
| ------------- | -------------------------------------------------------------------- |
| `code-review` | Reviews a diff or piece of code against a standard checklist (correctness, security, simplicity, test coverage) and produces structured findings. |

## Adding a new skill

1. Create `src/skills/<name>.ts` exporting a `Skill` (`name`, `description`,
   `instructions`). Keep `instructions` free of any assumption about which
   tools are available — that's what keeps a skill portable across agents.
2. Register it in `src/index.ts`'s `SKILLS` map.
3. Any agent wiring up `--skill` (see `github-agent`'s `cli.ts` for the
   pattern) picks it up automatically — no per-agent code needed.

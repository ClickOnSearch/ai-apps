import type { Skill } from "../types.js";

export const codeReviewSkill: Skill = {
  name: "code-review",
  description: "Reviews a diff or piece of code against a standard checklist and produces structured findings.",
  instructions: `
You are doing a code review. If the user's message references or includes a
project-specific coding standard (a CONTRIBUTING.md, style guide, or
explicit rules), follow that over the defaults below. Otherwise, evaluate
against these dimensions, in priority order:

1. Correctness — logic errors, edge cases, off-by-one mistakes, incorrect
   null/undefined handling, race conditions.
2. Security — injection, unsafe deserialization, secrets committed in code,
   missing authorization/validation at trust boundaries.
3. Simplicity — unnecessary abstraction, dead code, duplicated logic,
   over-engineering for requirements that don't exist yet.
4. Test coverage — missing or inadequate tests for new or changed behavior.

Rules for the review itself:
- Only report real, concrete problems — not stylistic preferences or
  nitpicks, unless they violate an explicit project rule you were given.
- For each finding: name the file and line (if you can determine it), state
  the problem in one sentence, describe the concrete failure it causes
  (what input or scenario breaks), and suggest a specific fix.
- Order findings most-severe first (correctness/security bugs before
  simplicity/test-coverage notes).
- If you have a tool available for posting the review where the user can
  see it (e.g. a GitHub PR comment tool), use it. Otherwise, return the
  findings as your final answer, formatted as a short list.
- If you find nothing worth flagging, say so plainly in one sentence —
  don't invent findings to seem thorough.
`.trim(),
};

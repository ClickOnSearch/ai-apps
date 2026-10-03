/**
 * A skill is a named, self-contained block of system-prompt instructions —
 * nothing more. It never assumes specific tools exist: it only shapes how
 * the model reasons and what it produces, so the exact same skill works
 * unmodified on github-agent, whatsapp-agent, linkedin-agent, or any future
 * one. If a capability needs a new tool (e.g. "post an inline PR comment"),
 * that's not a skill — it's a tool on the relevant MCP server.
 */
export interface Skill {
  name: string;
  /** One line, shown in --skill validation errors and CLI help. */
  description: string;
  /** Appended to the agent's own base system prompt when this skill is active. */
  instructions: string;
}

import type { Skill } from "./types.js";

/**
 * Renders a skill as a standalone markdown file, for tools that read plain
 * instruction files instead of speaking MCP (e.g. GitHub Copilot's
 * `.github/copilot-instructions.md`, a `CLAUDE.md`, `.cursor/rules/*.mdc`).
 * This is a static copy: re-run the export after the skill changes.
 */
export function exportSkillMarkdown(skill: Skill): string {
  return `<!-- From @clickonsearch/agent-skills: "${skill.name}" -->\n<!-- ${skill.description} -->\n\n${skill.instructions}\n`;
}

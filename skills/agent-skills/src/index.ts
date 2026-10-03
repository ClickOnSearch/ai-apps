import type { Skill } from "./types.js";
import { codeReviewSkill } from "./skills/code-review.js";

export type { Skill } from "./types.js";

/**
 * Single source of truth for which skills exist. Adding a new skill means:
 * write it in src/skills/<name>.ts (instructions only — no tool
 * assumptions), then register it here.
 */
export const SKILLS: Readonly<Record<string, Skill>> = {
  [codeReviewSkill.name]: codeReviewSkill,
};

export const SKILL_NAMES: readonly string[] = Object.keys(SKILLS);

export function isSkillName(value: unknown): value is string {
  return typeof value === "string" && value in SKILLS;
}

export function getSkill(name: string): Skill | undefined {
  return SKILLS[name];
}

/**
 * Layers a skill's instructions onto an agent's own base system prompt.
 * Returns `basePrompt` unchanged if `skillName` is omitted — every agent
 * using this must keep working exactly as before when no skill is given.
 */
export function composeSystemPrompt(basePrompt: string | undefined, skillName?: string): string | undefined {
  if (!skillName) return basePrompt;

  const skill = getSkill(skillName);
  if (!skill) {
    throw new Error(`Unknown skill "${skillName}". Available: ${SKILL_NAMES.join(", ")}`);
  }

  return basePrompt ? `${basePrompt}\n\n${skill.instructions}` : skill.instructions;
}

export { codeReviewSkill };

#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { SKILLS, SKILL_NAMES, getSkill } from "./index.js";
import { exportSkillMarkdown } from "./export.js";

function usage(): void {
  console.error("Usage:");
  console.error("  agent-skills list");
  console.error("  agent-skills export <skill-name> [output-file]   (prints to stdout if omitted)");
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "list") {
    for (const name of SKILL_NAMES) {
      console.log(`${name} — ${SKILLS[name].description}`);
    }
    return;
  }

  if (command === "export") {
    const [name, outFile] = rest;
    const skill = name ? getSkill(name) : undefined;
    if (!skill) {
      console.error(`Unknown skill "${name ?? "<missing>"}". Available: ${SKILL_NAMES.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const markdown = exportSkillMarkdown(skill);
    if (outFile) {
      await writeFile(outFile, markdown, "utf8");
      console.error(`Wrote ${outFile}`);
    } else {
      console.log(markdown);
    }
    return;
  }

  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

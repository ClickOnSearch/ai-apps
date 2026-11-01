export interface AcceptanceCriterion {
  id: string;
  text: string;
}

/** Numbered so tests and reports can refer to "AC2" unambiguously. */
export function formatAcceptanceCriteria(criteria: string[]): string {
  const items = criteria.map((c, i) => `- AC${i + 1}: ${c.trim().replace(/^AC\d+\s*[:.)-]\s*/i, "")}`);
  return ["## Acceptance criteria", ...items].join("\n");
}

const SECTION_HEADING = /^\s*(?:#{1,6}\s*)?acceptance criteria\s*:?\s*$/i;
const ANY_HEADING = /^\s*#{1,6}\s+\S/;
const LIST_ITEM = /^\s*(?:[-*]|\d+[.)])\s*(.+)$/;
const LABELLED = /^(AC\d+)\s*[:.)-]\s*(.+)$/i;

/**
 * Reads the criteria back out of a story description. Understands our own
 * "AC1: ..." format, and falls back to numbering plain list items under an
 * "Acceptance criteria" heading so stories written by hand still work.
 */
export function parseAcceptanceCriteria(description: string): AcceptanceCriterion[] {
  const lines = description.split("\n");
  const start = lines.findIndex((l) => SECTION_HEADING.test(l));
  const section = start === -1 ? lines : lines.slice(start + 1);

  const found: AcceptanceCriterion[] = [];
  for (const line of section) {
    if (start !== -1 && found.length > 0 && ANY_HEADING.test(line)) break;
    const item = LIST_ITEM.exec(line);
    if (!item) continue;
    const labelled = LABELLED.exec(item[1].trim());
    if (labelled) {
      found.push({ id: labelled[1].toUpperCase(), text: labelled[2].trim() });
    } else if (start !== -1) {
      found.push({ id: `AC${found.length + 1}`, text: item[1].trim() });
    }
  }
  return found;
}

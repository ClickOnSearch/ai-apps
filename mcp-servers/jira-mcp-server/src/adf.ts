/**
 * Jira Cloud stores rich text as Atlassian Document Format (ADF), a JSON
 * tree. These helpers convert the small subset we need — paragraphs,
 * headings, bullet/numbered lists — to and from plain text.
 */
export interface AdfNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
}

const text = (value: string): AdfNode => ({ type: "text", text: value });
const paragraph = (lines: string[]): AdfNode => {
  const content: AdfNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) content.push({ type: "hardBreak" });
    if (line) content.push(text(line));
  });
  return { type: "paragraph", content };
};
const list = (type: "bulletList" | "orderedList", items: string[]): AdfNode => ({
  type,
  content: items.map((item) => ({ type: "listItem", content: [paragraph([item])] })),
});

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;

export function textToAdf(input: string): AdfNode {
  const content: AdfNode[] = [];
  const lines = input.replace(/\r\n/g, "\n").split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      content.push({ type: "heading", attrs: { level: heading[1].length }, content: [text(heading[2].trim())] });
      i++;
      continue;
    }

    const kind = BULLET.test(line) ? "bulletList" : NUMBERED.test(line) ? "orderedList" : undefined;
    if (kind) {
      const matcher = kind === "bulletList" ? BULLET : NUMBERED;
      const items: string[] = [];
      while (i < lines.length && matcher.test(lines[i])) {
        items.push(matcher.exec(lines[i])![1].trim());
        i++;
      }
      content.push(list(kind, items.filter(Boolean)));
      continue;
    }

    const block: string[] = [];
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
      block.push(lines[i].trim());
      i++;
    }
    content.push(paragraph(block));
  }

  return { type: "doc", version: 1, content } as AdfNode;
}

function render(node: AdfNode): string {
  const children = (node.content ?? []).map(render);
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "hardBreak":
      return "\n";
    case "mention":
      return String(node.attrs?.text ?? "@user");
    case "paragraph":
      return children.join("") + "\n";
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${children.join("")}\n`;
    case "bulletList":
      return (node.content ?? []).map((item) => `- ${render(item).trim()}\n`).join("");
    case "orderedList":
      return (node.content ?? []).map((item, n) => `${n + 1}. ${render(item).trim()}\n`).join("");
    case "codeBlock":
      return "```\n" + children.join("") + "\n```\n";
    default:
      return children.join("");
  }
}

export function adfToText(node: AdfNode | string | null | undefined): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  return render(node).replace(/\n{3,}/g, "\n\n").trim();
}

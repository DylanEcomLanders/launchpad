/* ── Markdown section parsing ──
 * Splits FAQ + Objections markdown into stable, addressable sections so
 * the CRO lead can edit each one independently. The original markdown
 * file is the source of truth for defaults — overrides (stored in
 * offer_content_overrides) replace the section's full markdown block.
 */

export interface MarkdownSection {
  /** Stable slug derived from the original heading text (ordinal-suffixed if duplicate). */
  id: string;
  /** Markdown heading text without the leading hashes. */
  heading: string;
  /** Full markdown block: heading line + body (what gets edited/overridden). */
  markdown: string;
}

export interface MarkdownGroup {
  /** Optional non-editable group header (e.g. FAQ's "Client-Facing FAQs"). */
  heading: string | null;
  sections: MarkdownSection[];
}

export interface ParsedMarkdown {
  /** Top-level `# title` line (if present), without the `# `. */
  title: string | null;
  /** Markdown text between the title and the first sectioning heading (intro paragraph). */
  intro: string;
  /** Sections grouped by the optional level-2 heading above them. */
  groups: MarkdownGroup[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}

function ensureUnique(slug: string, used: Set<string>): string {
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let n = 2;
  while (used.has(`${slug}-${n}`)) n++;
  const out = `${slug}-${n}`;
  used.add(out);
  return out;
}

/**
 * Parse markdown into sections, using the given heading level as the
 * section boundary. Headings at lower levels (e.g. `##` when sectionLevel
 * is 3) become group headers — non-editable wrappers around their sections.
 */
export function parseMarkdown(
  content: string,
  sectionLevel: 2 | 3
): ParsedMarkdown {
  const lines = content.split("\n");
  const result: ParsedMarkdown = { title: null, intro: "", groups: [] };
  const usedIds = new Set<string>();

  let i = 0;

  // Title (single leading `# `)
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    result.title = lines[i].replace(/^#\s+/, "").trim();
    i++;
  }

  // Helpers
  const sectionHeadingRe = new RegExp(`^${"#".repeat(sectionLevel)}\\s+`);
  const groupHeadingRe = sectionLevel === 3 ? /^##\s+/ : null;

  // Intro = everything up to the first section or group heading
  const introLines: string[] = [];
  while (i < lines.length) {
    if (sectionHeadingRe.test(lines[i])) break;
    if (groupHeadingRe && groupHeadingRe.test(lines[i])) break;
    introLines.push(lines[i]);
    i++;
  }
  result.intro = introLines.join("\n").trim();

  let currentGroup: MarkdownGroup = { heading: null, sections: [] };

  const pushCurrentGroup = () => {
    if (currentGroup.heading !== null || currentGroup.sections.length > 0) {
      result.groups.push(currentGroup);
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Group header (only matters when sectionLevel is 3, i.e. FAQ)
    if (groupHeadingRe && groupHeadingRe.test(line)) {
      pushCurrentGroup();
      currentGroup = {
        heading: line.replace(/^##\s+/, "").trim(),
        sections: [],
      };
      i++;
      continue;
    }

    // Section
    if (sectionHeadingRe.test(line)) {
      const heading = line.replace(sectionHeadingRe, "").trim();
      const sectionLines: string[] = [line];
      i++;
      while (i < lines.length) {
        if (sectionHeadingRe.test(lines[i])) break;
        if (groupHeadingRe && groupHeadingRe.test(lines[i])) break;
        sectionLines.push(lines[i]);
        i++;
      }
      const id = ensureUnique(slugify(heading), usedIds);
      // Trim trailing blank lines from the section body
      while (sectionLines.length > 1 && sectionLines[sectionLines.length - 1].trim() === "") {
        sectionLines.pop();
      }
      currentGroup.sections.push({
        id,
        heading,
        markdown: sectionLines.join("\n"),
      });
      continue;
    }

    // Stray line (e.g. `---` between sections) — keep with current group's
    // last section so the rendered output stays faithful.
    if (currentGroup.sections.length > 0) {
      const last = currentGroup.sections[currentGroup.sections.length - 1];
      last.markdown += "\n" + line;
    }
    i++;
  }

  pushCurrentGroup();

  return result;
}

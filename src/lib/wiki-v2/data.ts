/* ── Wiki v2 loader ──
 * Reads markdown files from src/content/wiki-v2/ at build/request time.
 * Each file has YAML frontmatter:
 *   ---
 *   title: Page title
 *   section: Section name
 *   subsection: Optional sub-grouping inside a section
 *   order: 10
 *   ---
 *   markdown body...
 *
 * No moduleMap, no hardcoded titles. Frontmatter is the source of truth so
 * adding a page is just dropping a new .md file in the directory. */

import fs from "fs";
import path from "path";

const contentDir = path.join(process.cwd(), "src/content/wiki-v2");

export interface WikiPage {
  slug: string;
  title: string;
  section: string;
  subsection?: string;
  order: number;
  body: string;
}

export interface WikiSubsection {
  name: string;
  order: number;
  pages: WikiPage[];
}

export interface WikiSection {
  name: string;
  order: number;
  pages: WikiPage[]; // pages with no subsection sit here
  subsections: WikiSubsection[];
}

/* Minimal frontmatter parser — accepts flat key: value pairs, which is all
 * this wiki needs. Avoids pulling in gray-matter as a dependency. */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }
  return { meta, body: match[2] };
}

function readPage(file: string): WikiPage {
  const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = file.replace(/\.md$/, "");
  return {
    slug,
    title: meta.title ?? slug,
    section: meta.section ?? "Uncategorised",
    subsection: meta.subsection || undefined,
    order: Number(meta.order ?? 999),
    body,
  };
}

export function getAllPages(): WikiPage[] {
  if (!fs.existsSync(contentDir)) return [];
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"));
  return files.map(readPage).sort((a, b) => a.order - b.order);
}

export function getPageBySlug(slug: string): WikiPage | null {
  const file = path.join(contentDir, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return readPage(`${slug}.md`);
}

/* Groups pages by section, then by subsection. Order is derived from the
 * lowest-ordered page inside each group so authors only need to set order
 * on the page they want to promote — the whole section/subsection moves
 * with it. */
export function getSections(): WikiSection[] {
  const pages = getAllPages();
  const sectionMap = new Map<string, WikiPage[]>();
  for (const page of pages) {
    const list = sectionMap.get(page.section) ?? [];
    list.push(page);
    sectionMap.set(page.section, list);
  }

  return Array.from(sectionMap.entries())
    .map(([sectionName, sectionPages]) => {
      const direct: WikiPage[] = [];
      const subMap = new Map<string, WikiPage[]>();
      for (const page of sectionPages) {
        if (!page.subsection) {
          direct.push(page);
        } else {
          const list = subMap.get(page.subsection) ?? [];
          list.push(page);
          subMap.set(page.subsection, list);
        }
      }
      const subsections: WikiSubsection[] = Array.from(subMap.entries())
        .map(([name, pages]) => ({
          name,
          order: Math.min(...pages.map((p) => p.order)),
          pages,
        }))
        .sort((a, b) => a.order - b.order);
      return {
        name: sectionName,
        order: Math.min(...sectionPages.map((p) => p.order)),
        pages: direct,
        subsections,
      };
    })
    .sort((a, b) => a.order - b.order);
}

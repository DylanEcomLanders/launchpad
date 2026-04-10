import { getAllWikiModules } from "@/lib/retainer-wiki";
import RetainerWikiClient from "./client";

export default function RetainerWikiPage() {
  const modules = getAllWikiModules();
  const serialized = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    shortTitle: m.shortTitle,
    icon: m.icon,
    content: m.content,
    category: m.category,
    toolHref: m.toolHref,
  }));
  return <RetainerWikiClient modules={serialized} />;
}

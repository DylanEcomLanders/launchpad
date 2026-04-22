import { getAllOpsWikiModules } from "@/lib/ops-wiki";
import OpsWikiClient from "./client";

export default function OpsWikiPage() {
  const modules = getAllOpsWikiModules();
  const serialized = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    shortTitle: m.shortTitle,
    icon: m.icon,
    content: m.content,
    category: m.category,
    toolHref: m.toolHref,
    subGroup: m.subGroup,
  }));
  return <OpsWikiClient modules={serialized} />;
}

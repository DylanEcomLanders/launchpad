import { Suspense } from "react";
import { getAllOpsWikiModules } from "@/lib/ops-wiki";
import OpsWikiClient from "@/app/(dashboard)/tools/ops-wiki/client";

export default function TeamOpsWikiPage() {
  // Hide admin-only modules (pricing, sales process, revenue projector, slide decks,
  // positioning, FAQ, invoicing) from the team view — commercial content the team
  // doesn't need to see.
  const modules = getAllOpsWikiModules().filter((m) => !m.adminOnly);
  const serialized = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    shortTitle: m.shortTitle,
    icon: m.icon,
    content: m.content,
    category: m.category,
    toolHref: m.toolHref,
  }));
  return (
    <Suspense fallback={null}>
      <OpsWikiClient modules={serialized} />
    </Suspense>
  );
}

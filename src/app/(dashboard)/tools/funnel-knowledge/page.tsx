import { getAllFunnelModules } from "@/lib/funnel-knowledge";
import FunnelKnowledgeClient from "./client";

export default function FunnelKnowledgePage() {
  const modules = getAllFunnelModules();

  const serialized = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    shortTitle: m.shortTitle,
    layer: m.layer,
    icon: m.icon,
    content: m.content,
    category: m.category,
  }));

  return <FunnelKnowledgeClient modules={serialized} />;
}

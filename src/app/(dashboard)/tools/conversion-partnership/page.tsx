import { getAllWikiModules } from "@/lib/conversion-partnership";
import ConversionPartnershipClient from "./client";

export default function ConversionPartnershipPage() {
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
  return <ConversionPartnershipClient modules={serialized} />;
}

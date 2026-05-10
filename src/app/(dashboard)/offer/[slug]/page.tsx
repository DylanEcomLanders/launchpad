import { notFound } from "next/navigation";
import { getAllWikiModules, getWikiModule } from "@/lib/conversion-partnership";
import OfferSectionClient from "./client";

export function generateStaticParams() {
  return getAllWikiModules().map((m) => ({ slug: m.slug }));
}

export default async function OfferSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const module = getWikiModule(slug);
  if (!module) notFound();

  const all = getAllWikiModules();
  const idx = all.findIndex((m) => m.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <OfferSectionClient
      module={{
        slug: module.slug,
        title: module.title,
        shortTitle: module.shortTitle,
        content: module.content,
        toolHref: module.toolHref,
      }}
      prev={prev ? { slug: prev.slug, shortTitle: prev.shortTitle } : null}
      next={next ? { slug: next.slug, shortTitle: next.shortTitle } : null}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWorkCatalog, getWorkPiece } from "@/lib/work/catalog";
import { StageView } from "../stage-view";

export const revalidate = 60;

export async function generateStaticParams() {
  const catalog = await getWorkCatalog();
  return catalog.pieces.map((piece) => ({ slug: piece.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const piece = await getWorkPiece(slug);
  if (!piece) return { title: "Work — Ecomlanders" };
  return {
    title: `${piece.name} — Work — Ecomlanders`,
    description: piece.story?.lead ?? `${piece.name} · ${piece.category}`,
  };
}

export default async function WorkStagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [piece, catalog] = await Promise.all([getWorkPiece(slug), getWorkCatalog()]);
  if (!piece) notFound();

  const idx = catalog.pieces.findIndex((p) => p.slug === piece.slug);
  const prev = idx > 0 ? catalog.pieces[idx - 1] : catalog.pieces.length > 1 ? catalog.pieces[catalog.pieces.length - 1] : null;
  const next =
    idx >= 0 && idx < catalog.pieces.length - 1
      ? catalog.pieces[idx + 1]
      : catalog.pieces.length > 1
        ? catalog.pieces[0]
        : null;

  return (
    <StageView
      piece={piece}
      prev={prev ? { slug: prev.slug, name: prev.name } : null}
      next={next ? { slug: next.slug, name: next.name } : null}
    />
  );
}

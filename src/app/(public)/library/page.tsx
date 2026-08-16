import type { Metadata } from "next";
import { getProjects } from "@/lib/portfolio-v2/data";
import { buildLibraryCards } from "@/lib/library/cards";
import LibraryCanvas from "./library-canvas";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Library",
  description: "Work library — page frames on an infinite canvas.",
};

export default async function LibraryPage() {
  const projects = await getProjects();
  const cards = buildLibraryCards(projects);
  return <LibraryCanvas cards={cards} />;
}

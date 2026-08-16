import type { Metadata } from "next";
import { getProjects } from "@/lib/portfolio-v2/data";
import { buildLibraryBoard } from "@/lib/library/cards";
import LibraryCanvas from "./library-canvas";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Library",
  description: "Work library — page frames on an infinite canvas.",
};

export default async function LibraryPage() {
  const projects = await getProjects();
  const board = buildLibraryBoard(projects);
  return <LibraryCanvas board={board} />;
}

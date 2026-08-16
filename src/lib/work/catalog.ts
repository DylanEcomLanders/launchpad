import { getProject, getProjects } from "@/lib/portfolio-v2/data";
import type { PortfolioProject } from "@/lib/portfolio-v2/types";
import {
  HOUND_SLUG,
  HOUND_STORY,
  isHoundProject,
  isSkippedProject,
  pickHoundPair,
} from "./stories";
import type { WorkCatalog, WorkPiece } from "./types";

function featuredPiece(
  project: PortfolioProject | null,
  before: PortfolioProject | null
): WorkPiece {
  return {
    slug: HOUND_SLUG,
    name: HOUND_STORY.name,
    category: project?.category || HOUND_STORY.category,
    kind: "featured",
    project,
    before,
    story: HOUND_STORY,
  };
}

function framePiece(project: PortfolioProject): WorkPiece {
  return {
    slug: project.slug,
    name: project.name,
    category: project.category || "Page",
    kind: "frame",
    project,
    before: null,
    story: null,
  };
}

export async function getWorkCatalog(): Promise<WorkCatalog> {
  const raw = await getProjects();
  const projects = raw.filter((p) => !isSkippedProject(p));
  const { featured: featuredProject, before } = pickHoundPair(
    projects.filter(isHoundProject)
  );
  const featured = featuredPiece(featuredProject, before);
  const used = new Set(
    [featuredProject?.id, before?.id].filter((id): id is string => Boolean(id))
  );
  const frames = projects
    .filter((p) => !used.has(p.id) && !isHoundProject(p))
    .map(framePiece);
  return { featured, frames, pieces: [featured, ...frames] };
}

export async function getWorkPiece(slug: string): Promise<WorkPiece | null> {
  const catalog = await getWorkCatalog();
  if (slug === HOUND_SLUG) return catalog.featured;
  if (catalog.featured.project?.slug === slug) return catalog.featured;
  const fromFrames = catalog.frames.find((p) => p.slug === slug);
  if (fromFrames) return fromFrames;

  const live = await getProject(slug);
  if (!live || isSkippedProject(live)) return null;
  if (isHoundProject(live)) return featuredPiece(live, catalog.featured.before);
  return framePiece(live);
}

import type { PortfolioCategory, PortfolioProject } from "@/lib/portfolio-v2/types";

export type WorkStoryBeat = {
  label: string;
  body: string;
};

export type WorkStory = {
  slug: string;
  name: string;
  category: string;
  eyebrow: string;
  lead: string;
  beats: WorkStoryBeat[];
};

export type WorkPiece = {
  slug: string;
  name: string;
  category: string;
  kind: "featured" | "frame";
  project: PortfolioProject | null;
  before: PortfolioProject | null;
  story: WorkStory | null;
};

export type WorkReel = {
  category: PortfolioCategory;
  slug: string;
  index: string;
  blurb: string;
  frames: WorkPiece[];
};

export type WorkCatalog = {
  featured: WorkPiece;
  reels: WorkReel[];
  frames: WorkPiece[];
  pieces: WorkPiece[];
};

/* ── Case Studies — Type definitions ──
 * Editorial light-mode case study pages with structured proof artifacts.
 * Visual reference: 4-stat hero, problem/solution/design/results sections,
 * before/after metric comparison rows, testimonial + CTA card.
 */

export type ProjectType = "full-funnel" | "single-funnel" | "one-off";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  "full-funnel": "Full funnel partnership",
  "single-funnel": "Single funnel",
  "one-off": "One-off",
};

export type HeroMediaKind = "video" | "gif" | "image";

export type DeviceFrame = "desktop" | "mobile" | "tablet";

export interface CaseStudyImage {
  url: string;
  filename?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PullQuote {
  id: string;
  text: string;
  attribution?: string;
}

/* The 4 KPI cards at the top of the page. Mixed-format display strings;
 * if a number is parseable, it animates on scroll. */
export interface HeadlineStat {
  id: string;
  value: string;     // "+146%", "$145,654", "-62%"
  label: string;     // "Increase in monthly recurring revenue"
}

/* 01 / 02 / 03 numbered solution cards. */
export interface SolutionCard {
  id: string;
  title: string;
  description: string;
}

/* Before/after metric comparison row (the "Compounded Wins" section). */
export interface ResultComparison {
  id: string;
  label: string;            // "Monthly Recurring Revenue"
  before: string;           // "£650K"
  after: string;            // "£1.23M"
  deltaPercent?: number;    // 125 → renders as "+125%"
  deltaDirection?: "up" | "down";
}

/* Structured Intelligems test record. Stored for aggregate filtering /
 * "across all our tests we've driven X" statistics, not displayed prominently
 * on the public render anymore. */
export interface IntelligemsTest {
  id: string;
  name: string;
  variantALabel: string;
  variantBLabel: string;
  primaryMetric: string;
  liftPercent: number;
  confidencePercent: number;
  testDurationDays: number;
  sampleSize: number;
  trafficSplit: string;
  screenshot?: CaseStudyImage;
  notes?: string;
}

export interface FigmaFrame {
  id: string;
  shareUrl: string;
  caption?: string;
  device?: DeviceFrame;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  headshot?: CaseStudyImage;
  videoUrl?: string;
}

export interface CtaBlock {
  headline: string;
  subhead?: string;
  buttonLabel: string;
  buttonHref: string;
  secondaryLabel?: string;     // e.g. "Whatsapp Us"
  secondaryHref?: string;
}

export interface CaseStudyMeta {
  brandName: string;
  logoLight?: CaseStudyImage;
  logoDark?: CaseStudyImage;
  industry?: string;          // → "Niche" in meta row
  verticalTag?: string;
  projectType: ProjectType;
  timeframe?: string;         // → "Engagement" in meta row
  surfacesShipped?: number;
  services?: string;          // → "Services" in meta row, e.g. "Conversion Engine"
}

export interface CaseStudyHero {
  headline: string;           // bold display headline
  subhead?: string;           // body para below the headline
  mediaKind: HeroMediaKind;
  image?: CaseStudyImage;
  videoUrl?: string;
  collageImages?: CaseStudyImage[];   // tilted screenshot collage on the right
}

export interface CaseStudyChallenge {
  headline?: string;          // bold summary headline ("Increased ad spend only led to...")
  prose: string;              // body, rendered in 2 columns
  pullQuotes: PullQuote[];
}

export interface CaseStudyApproach {
  headline?: string;          // "Strip the funnel back to first principles..."
  intro?: string;             // optional lead-in para before the cards
  cards: SolutionCard[];      // 01 / 02 / 03 numbered cards
  methodology?: string;       // legacy free-text; kept for back-compat
  processDiagram?: CaseStudyImage;
}

/* Layout for the screenshot row that sits under the meta strip on the
 * public case study page. Each layout dictates the slot count + their
 * dimensions on the public render. Defaults to "three" for backwards
 * compatibility with case studies created before layouts existed. */
export type ScreenshotLayout =
  | "single"      // 1 image, full width
  | "two"         // 2 equal side-by-side
  | "three"       // 3 equal (default)
  | "wide-stack"  // 1 wide left, 2 stacked right
  | "stack-wide"; // 2 stacked left, 1 wide right

export const SCREENSHOT_LAYOUTS: {
  id: ScreenshotLayout;
  label: string;
  slots: number;
}[] = [
  { id: "single",     label: "1 hero",            slots: 1 },
  { id: "two",        label: "2 side-by-side",    slots: 2 },
  { id: "three",      label: "3 equal",           slots: 3 },
  { id: "wide-stack", label: "1 wide + 2 stack",  slots: 3 },
  { id: "stack-wide", label: "2 stack + 1 wide",  slots: 3 },
];

export function slotsForLayout(layout: ScreenshotLayout): number {
  return SCREENSHOT_LAYOUTS.find((l) => l.id === layout)?.slots ?? 3;
}

export interface CaseStudyResults {
  tests: IntelligemsTest[];
  screenshots: CaseStudyImage[];
  /** How the screenshots render on the public page. Defaults to "three". */
  screenshotLayout?: ScreenshotLayout;
}

export interface CaseStudyDesigns {
  headline?: string;          // "The Same Brand, But Better"
  figmaFrames: FigmaFrame[];
  desktopSlices: CaseStudyImage[];   // full-page screenshots, stacked in modal viewer
  mobileSlices: CaseStudyImage[];
}

export interface CaseStudySettings {
  published: boolean;
  brandColor?: string;        // hex; eyebrow + accent colour
  publishedAt?: string;
}

/* ── Extra blocks ──
 * Inserted between fixed spine sections (Hero → Screenshots → Stats →
 * Problem → Solution → Design → Results → Testimonial+CTA → Tech →
 * Related). The narrative spine stays in order; extra blocks fill the
 * gaps when a case study needs more proof, prose, or a second collage.
 *
 * Each block is anchored to "after <section>". Within the same anchor,
 * `order` decides vertical sequence (drag-to-reorder in the editor). */
export type ExtraBlockAnchor =
  | "hero"          // after the hero section
  | "screenshots"   // after the meta + screenshot row
  | "stats"         // after the 4 KPI cards
  | "problem"       // after The Problem
  | "solution"      // after The Solution
  | "design"        // after The Design
  | "results";      // after Compounded Results (before Testimonial+CTA)

export const EXTRA_BLOCK_ANCHORS: { id: ExtraBlockAnchor; label: string }[] = [
  { id: "hero",        label: "After hero" },
  { id: "screenshots", label: "After screenshot row" },
  { id: "stats",       label: "After headline stats" },
  { id: "problem",     label: "After The Problem" },
  { id: "solution",    label: "After The Solution" },
  { id: "design",      label: "After The Design" },
  { id: "results",     label: "After the Compounded Results" },
];

export type ExtraBlockType = "screenshot-collage" | "prose";

export const EXTRA_BLOCK_TYPES: { id: ExtraBlockType; label: string; description: string }[] = [
  {
    id: "screenshot-collage",
    label: "Screenshot collage",
    description: "Another image row — picks a layout (1 / 2 / 3 / wide-stack / stack-wide), uploads slot images. Same renderer as the main screenshot row.",
  },
  {
    id: "prose",
    label: "Prose block",
    description: "Optional headline + a body paragraph. Use it to insert commentary or tie sections together.",
  },
];

interface ExtraBlockBase {
  id: string;
  anchor: ExtraBlockAnchor;
  /** Position within the same anchor — lower numbers render first. */
  order: number;
}

export interface ScreenshotCollageBlock extends ExtraBlockBase {
  type: "screenshot-collage";
  headline?: string;          // optional H3 above the collage
  screenshots: CaseStudyImage[];
  layout?: ScreenshotLayout;
}

export interface ProseBlock extends ExtraBlockBase {
  type: "prose";
  headline?: string;
  body: string;
}

export type ExtraBlock = ScreenshotCollageBlock | ProseBlock;

export interface CaseStudy {
  id: string;
  slug: string;
  meta: CaseStudyMeta;
  hero: CaseStudyHero;
  headlineStats: HeadlineStat[];
  challenge: CaseStudyChallenge;
  approach: CaseStudyApproach;
  results: CaseStudyResults;
  designs: CaseStudyDesigns;
  compoundedResults: ResultComparison[];
  livePreviewUrl?: string;
  testimonial?: Testimonial;
  techStack: string[];
  relatedCaseStudyIds: string[];
  cta: CtaBlock;
  settings: CaseStudySettings;
  /** Optional extra blocks slotted between fixed spine sections. Each
   * block carries its anchor + order; the public page renders them
   * after their named section in order. Empty/undefined = pure spine. */
  extraBlocks?: ExtraBlock[];
  created_at: string;
  updated_at: string;
}

export const TECH_STACK_OPTIONS = [
  "Shopify",
  "Shopify Plus",
  "Intelligems",
  "Klaviyo",
  "GA4",
  "Hotjar",
  "Webflow",
  "Figma",
  "Loom",
  "Postscript",
  "Yotpo",
  "Recharge",
  "Skio",
] as const;

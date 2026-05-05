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

export interface CaseStudyResults {
  tests: IntelligemsTest[];
  screenshots: CaseStudyImage[];
}

export interface CaseStudyDesigns {
  headline?: string;          // "The Same Brand, But Better"
  figmaFrames: FigmaFrame[];
}

export interface CaseStudySettings {
  published: boolean;
  brandColor?: string;        // hex; eyebrow + accent colour
  publishedAt?: string;
}

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

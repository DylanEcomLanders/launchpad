export type PageType = "PDP" | "Collection" | "Landing Page" | "Homepage";

export interface GallerySection {
  id: string;
  name: string;
  description: string;
  bestPractices: string[];
  pageTypes: PageType[];
}

export const gallerySections: GallerySection[] = [
  {
    id: "hero",
    name: "Hero Section",
    description:
      "The first thing visitors see. Sets the tone, communicates core value prop, and drives the first action.",
    bestPractices: [
      "One clear headline — benefit-led, not feature-led",
      "Subline that qualifies the audience or adds specificity",
      "Single primary CTA above the fold",
      "High-quality hero image or video that shows the product in use",
      "Keep it scannable — under 20 words total above fold",
    ],
    pageTypes: ["PDP", "Landing Page", "Homepage"],
  },
  {
    id: "benefits",
    name: "Benefits / Features",
    description:
      "Translates product features into customer outcomes. The 'why should I care?' section.",
    bestPractices: [
      "Lead with benefits, support with features",
      "3-4 benefit blocks max — don't overwhelm",
      "Use icons or illustrations for scannability",
      "Each benefit should answer 'so what?' for the customer",
      "Include micro-evidence: stats, results, or specifics",
    ],
    pageTypes: ["PDP", "Collection", "Landing Page", "Homepage"],
  },
  {
    id: "social-proof",
    name: "Social Proof / Testimonials",
    description:
      "Third-party validation that builds trust. Reviews, testimonials, press logos, UGC, and case studies.",
    bestPractices: [
      "Use real customer quotes with names and photos",
      "Match testimonials to the objection they overcome",
      "Star ratings with review count (e.g. 4.8 from 2,400 reviews)",
      "Press logos or 'As seen in' for authority",
      "Video testimonials outperform text 2:1",
    ],
    pageTypes: ["PDP", "Collection", "Landing Page", "Homepage"],
  },
  {
    id: "faq",
    name: "FAQ Section",
    description:
      "Handles objections disguised as questions. Reduces support load and builds confidence pre-purchase.",
    bestPractices: [
      "Answer the top 5-7 pre-purchase objections",
      "Lead with the most common hesitation (shipping, returns, sizing)",
      "Use accordion/expandable format for clean UX",
      "Write answers that sell — don't just inform",
      "Include a contact CTA at the bottom for unanswered questions",
    ],
    pageTypes: ["PDP", "Landing Page", "Homepage"],
  },
  {
    id: "cta",
    name: "CTA / Conversion Block",
    description:
      "Final push toward conversion. Summarises the offer and makes the next step crystal clear.",
    bestPractices: [
      "Repeat the core value prop in a single line",
      "One clear, high-contrast CTA button",
      "Add urgency or scarcity if genuine (limited stock, offer expiry)",
      "Include a risk reversal: money-back guarantee, free returns",
      "Sticky ATC bar on mobile for PDPs",
    ],
    pageTypes: ["PDP", "Landing Page", "Homepage"],
  },
  {
    id: "product-grid",
    name: "Product Grid / Collection",
    description:
      "Showcases multiple products in a scannable layout. Used on collection pages and homepage.",
    bestPractices: [
      "Show price, title, and primary image at minimum",
      "Quick-add or hover-to-add for frictionless cart building",
      "Consistent image ratios across all products",
      "Filter and sort functionality on collection pages",
      "Badge system: bestseller, new, sale, low stock",
    ],
    pageTypes: ["Collection", "Homepage"],
  },
  {
    id: "comparison",
    name: "Comparison Table",
    description:
      "Side-by-side comparison of your product vs alternatives. Positions you as the clear winner.",
    bestPractices: [
      "Compare against 2-3 real alternatives customers consider",
      "Highlight your unique advantages with checkmarks",
      "Be honest about areas where competitors match",
      "Use clear column headers: Your Brand vs Generic vs Competitor",
      "Place after benefits section for maximum impact",
    ],
    pageTypes: ["PDP", "Landing Page"],
  },
  {
    id: "guarantee",
    name: "Guarantee / Risk Reversal",
    description:
      "Removes the fear of purchasing. Makes the buyer feel protected and confident.",
    bestPractices: [
      "Bold, specific guarantee (30-day, 60-day, lifetime)",
      "Explain the process: 'Email us, get a full refund. No questions.'",
      "Use a trust badge or seal icon",
      "Place near the primary CTA for maximum impact",
      "Stack guarantees if possible: money-back + free shipping + easy returns",
    ],
    pageTypes: ["PDP", "Landing Page"],
  },
  {
    id: "story",
    name: "Brand Story / About",
    description:
      "Humanises the brand. Connects emotionally and differentiates from commoditised competitors.",
    bestPractices: [
      "Lead with the founder's 'why' — the problem that started it all",
      "Include a real photo of the team or founder",
      "Keep it concise: 3-4 sentences max on non-About pages",
      "Tie the story back to the customer's journey",
      "Works best after social proof, before final CTA",
    ],
    pageTypes: ["Landing Page", "Homepage"],
  },
];

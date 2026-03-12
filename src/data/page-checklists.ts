export type ChecklistPageType = "PDP" | "Collection" | "Landing Page" | "Homepage" | "Advertorial" | "About";

export type SectionPriority = "required" | "recommended" | "optional";

export interface ChecklistItem {
  sectionName: string;
  purpose: string;
  priority: SectionPriority;
}

export const checklistPageTypes: ChecklistPageType[] = [
  "PDP",
  "Collection",
  "Landing Page",
  "Homepage",
  "Advertorial",
  "About",
];

export const pageChecklists: Record<ChecklistPageType, ChecklistItem[]> = {
  PDP: [
    { sectionName: "Hero / Product Showcase", purpose: "First impression — product images, title, price, variant selector, ATC button", priority: "required" },
    { sectionName: "Benefits Section", purpose: "Why this product solves their problem — 3-4 benefit blocks with icons", priority: "required" },
    { sectionName: "Social Proof / Reviews", purpose: "Star ratings, review count, featured testimonials", priority: "required" },
    { sectionName: "Product Description", purpose: "Detailed copy — ingredients, materials, specs, how to use", priority: "required" },
    { sectionName: "Sticky Add to Cart (Mobile)", purpose: "Always-visible ATC button on mobile scroll", priority: "required" },
    { sectionName: "Trust Badges", purpose: "Free shipping, money-back guarantee, secure checkout badges near ATC", priority: "required" },
    { sectionName: "FAQ Section", purpose: "Handle top 5-7 pre-purchase objections (shipping, returns, sizing)", priority: "recommended" },
    { sectionName: "Comparison Table", purpose: "Side-by-side vs competitors or vs doing nothing", priority: "recommended" },
    { sectionName: "UGC / Before & After", purpose: "Real customer photos or results that build trust", priority: "recommended" },
    { sectionName: "Complementary Products", purpose: "Cross-sell related items — 'Complete the look' or 'Pairs well with'", priority: "recommended" },
    { sectionName: "Guarantee / Risk Reversal", purpose: "Money-back guarantee badge with clear explanation", priority: "recommended" },
    { sectionName: "Recently Viewed", purpose: "Help returning visitors find products they browsed before", priority: "optional" },
    { sectionName: "Video Section", purpose: "Product demo, how-to, or brand story video", priority: "optional" },
  ],
  Collection: [
    { sectionName: "Collection Hero", purpose: "Banner image, collection title, brief description", priority: "required" },
    { sectionName: "Product Grid", purpose: "Product cards with image, title, price, quick-add", priority: "required" },
    { sectionName: "Filter & Sort", purpose: "Filter by price, type, colour, etc. Sort by bestselling, price, newest", priority: "required" },
    { sectionName: "Collection Description", purpose: "SEO-friendly intro copy explaining the collection", priority: "required" },
    { sectionName: "Bestseller Badges", purpose: "Visual indicators on top-selling products", priority: "recommended" },
    { sectionName: "Sub-collection Links", purpose: "Quick links to sub-categories within the collection", priority: "recommended" },
    { sectionName: "Social Proof Banner", purpose: "Review count, average rating, or 'Trusted by X customers'", priority: "recommended" },
    { sectionName: "Quick View Modal", purpose: "Product preview without leaving collection page", priority: "optional" },
    { sectionName: "Pagination / Infinite Scroll", purpose: "Load more products without manual page navigation", priority: "optional" },
    { sectionName: "Empty State", purpose: "Helpful message when filters return no products", priority: "optional" },
  ],
  "Landing Page": [
    { sectionName: "Hero Section", purpose: "Benefit-led headline, subline, primary CTA, hero image/video", priority: "required" },
    { sectionName: "Problem / Pain Section", purpose: "Agitate the problem your product solves", priority: "required" },
    { sectionName: "Solution Section", purpose: "Introduce your product as the answer", priority: "required" },
    { sectionName: "Benefits Section", purpose: "3-4 key benefits with supporting evidence", priority: "required" },
    { sectionName: "Social Proof", purpose: "Testimonials, reviews, press logos, case studies", priority: "required" },
    { sectionName: "Product Showcase", purpose: "Product images, key features, pricing", priority: "required" },
    { sectionName: "Final CTA Block", purpose: "Repeat value prop, clear CTA, risk reversal", priority: "required" },
    { sectionName: "FAQ Section", purpose: "Handle remaining objections", priority: "recommended" },
    { sectionName: "Comparison Table", purpose: "Position against alternatives", priority: "recommended" },
    { sectionName: "Guarantee / Risk Reversal", purpose: "Remove purchase anxiety", priority: "recommended" },
    { sectionName: "Brand Story", purpose: "Humanise the brand, build emotional connection", priority: "optional" },
    { sectionName: "Video Section", purpose: "Product demo or customer story video", priority: "optional" },
    { sectionName: "Urgency / Scarcity", purpose: "Limited-time offer or low-stock indicators", priority: "optional" },
  ],
  Homepage: [
    { sectionName: "Hero Section", purpose: "Brand-level value prop, hero image/video, primary CTA", priority: "required" },
    { sectionName: "Featured Collection", purpose: "Bestsellers or new arrivals product grid", priority: "required" },
    { sectionName: "Brand Promise / USPs", purpose: "3-4 key brand differentiators with icons", priority: "required" },
    { sectionName: "Social Proof Bar", purpose: "Review stats, press logos, or 'Trusted by X customers'", priority: "required" },
    { sectionName: "Category Navigation", purpose: "Visual links to main collections", priority: "required" },
    { sectionName: "Testimonials", purpose: "2-3 featured customer testimonials", priority: "recommended" },
    { sectionName: "Brand Story Section", purpose: "Brief brand intro with founder photo", priority: "recommended" },
    { sectionName: "Email Signup", purpose: "Newsletter capture with incentive (discount, guide)", priority: "recommended" },
    { sectionName: "Instagram / UGC Feed", purpose: "Social media integration showing real customers", priority: "optional" },
    { sectionName: "Blog / Content Section", purpose: "Featured articles or guides", priority: "optional" },
    { sectionName: "Announcement Bar", purpose: "Sitewide offer, free shipping threshold, or news", priority: "optional" },
  ],
  Advertorial: [
    { sectionName: "Editorial-Style Headline", purpose: "Curiosity-driven headline that reads like an article, not an ad", priority: "required" },
    { sectionName: "Problem / Hook", purpose: "Open with a relatable scenario or surprising statistic", priority: "required" },
    { sectionName: "Story / Discovery", purpose: "Narrative arc — how the solution was discovered or developed", priority: "required" },
    { sectionName: "Product Introduction", purpose: "Natural transition from story to product", priority: "required" },
    { sectionName: "Benefits with Evidence", purpose: "Key benefits backed by data, quotes, or studies", priority: "required" },
    { sectionName: "Social Proof", purpose: "Customer quotes, before/after, expert endorsements", priority: "required" },
    { sectionName: "CTA Section", purpose: "Clear conversion point with offer details", priority: "required" },
    { sectionName: "FAQ / Objection Handling", purpose: "Address common concerns in editorial tone", priority: "recommended" },
    { sectionName: "Comparison", purpose: "Why this beats the alternatives", priority: "recommended" },
    { sectionName: "Risk Reversal", purpose: "Guarantee details to reduce purchase friction", priority: "recommended" },
    { sectionName: "Author Bio / Source", purpose: "Adds credibility to the editorial format", priority: "optional" },
  ],
  About: [
    { sectionName: "Brand Story Hero", purpose: "Founder story, origin, mission statement with hero image", priority: "required" },
    { sectionName: "Mission / Values", purpose: "What the brand stands for — 3-4 core values", priority: "required" },
    { sectionName: "Team Section", purpose: "Photos and brief bios of key team members", priority: "recommended" },
    { sectionName: "Timeline / Milestones", purpose: "Key moments in the brand's journey", priority: "recommended" },
    { sectionName: "Social Proof", purpose: "Press features, awards, customer count", priority: "recommended" },
    { sectionName: "Sustainability / Ethics", purpose: "Environmental or social responsibility initiatives", priority: "optional" },
    { sectionName: "Contact / Connect CTA", purpose: "Email, social links, or contact form", priority: "optional" },
    { sectionName: "Careers Section", purpose: "Job openings or 'Join our team' CTA", priority: "optional" },
  ],
};

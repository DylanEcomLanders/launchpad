import type { ProposalContent } from "./types";

// ── Default scaffold Claude fills into ──
// Every string is a slot Claude rewrites from the notes + form inputs.
// Structure stays fixed; wording changes per brand.

export const DEFAULT_PROPOSAL_CONTENT: ProposalContent = {
  brandName: "[BRAND]",
  date: "",
  validDays: 30,
  heroEyebrow: "Conversion Engine Proposal",
  heroTitle: "Proposed Scope of Work",
  heroSubtitle:
    "Following our call, we've prepared this proposal outlining how we'd support [BRAND] in closing the gap between paid traffic and conversions. The downstream systems are in good shape. This work focuses on the conversion layer sitting between your ads and your revenue.",
  opportunity: {
    eyebrow: "01. The Opportunity",
    titleLead: "[Strong downstream system],",
    titleMain: "the conversion layer needs work.",
    body: "[One-paragraph summary of where the brand is today, what's working downstream, and where the leak sits.]",
    stats: [
      { label: "[Stat label]", value: "[Value]", sub: "[Context]" },
      { label: "[Stat label]", value: "[Value]", sub: "[Context]" },
      { label: "[Stat label]", value: "[Value]", sub: "[Context]" },
    ],
    leak: {
      title: "Where the leak sits",
      paragraphs: [
        "[First paragraph describing the specific structural issue in the funnel.]",
        "[Second paragraph naming the fix as a matter of segmentation and sequencing, not a full rebuild.]",
      ],
    },
  },
  plugIn: {
    eyebrow: "02. How We Plug In",
    titleLead: "A conversion layer",
    titleMain: "that works with your existing setup.",
    body: "[One paragraph on how we slot in alongside their existing ad and ops teams without disrupting either.]",
    items: [
      "Funnel audit across every touchpoint from ad click to conversion",
      "Traffic segmentation by intent and source",
      "Iterative page redesigns that build on what's performing",
      "Ad-to-page alignment so the scent trail stays consistent",
      "Pre-framing content for colder traffic",
      "A/B testing programme with structured hypothesis chains",
      "Heatmapping and session recording to surface friction points",
      "Monthly reporting tied to revenue impact",
    ],
    closingLine:
      "We don't manage ads, we don't touch your CRM, and we don't staff your operations. Those already work. Our remit starts at the click and ends at the conversion.",
  },
  pricing: {
    eyebrow: "03. Scope & Investment",
    title: "Two ways to start.",
    body: "The retainer is the full engagement. Ongoing, compounding, team-led. The pilot is a scoped project, designed as a standalone piece of work or a stepping stone into the retainer.",
    options: [
      {
        label: "Option A",
        badge: "Highest Return",
        title: "Conversion Engine Retainer",
        description:
          "Full conversion team embedded alongside [BRAND]. Deep audit, full roadmap, ongoing builds, tests, and monthly reporting. Ideal for compounding results over a 6-12 month horizon.",
        price: "£20,000",
        priceSuffix: "/mo",
        priceTerms: "Billed monthly. Cancel with 30 days' notice.",
        inclusions: [
          "Full team: strategist, designer, developer, QA, PM",
          "60-90 day visual roadmap",
          "Ongoing page builds, rebuilds, and testing",
          "A/B testing software + heatmapping",
          "Regular updates in your preferred channel",
          "Monthly strategic review and reporting",
        ],
        dark: true,
      },
      {
        label: "Option B. Phase 1 Pilot",
        title: "[Pilot title — e.g. Three-Page Rebuild]",
        description:
          "[One paragraph describing the scoped pilot project specific to this brand.]",
        price: "£15,000",
        priceTerms: "One-time. 30-day delivery.",
        inclusions: [
          "Conversion audit covering the scoped pages",
          "Rebuild of all scoped pages, segmented by traffic source",
          "Pre-framing content strategy where relevant",
          "Tracking audit and recommendations",
          "Handover report with prioritised next steps",
          "Credit toward the retainer if upgraded within 30 days",
        ],
      },
    ],
  },
  principles: {
    eyebrow: "04. How We Work",
    title: "Four principles that shape every engagement.",
    items: [
      {
        title: "We lead the roadmap.",
        body: "You shouldn't need to direct us page by page. We prioritise based on impact, present a clear plan, and execute against it. Your role is to approve the direction and flag anything that doesn't fit.",
      },
      {
        title: "We focus on the layer nobody else owns.",
        body: "Your ad team cares about CPC. Your ops team cares about downstream performance. Nobody else is watching the space in between. That becomes our entire focus.",
      },
      {
        title: "We plug into your existing process.",
        body: "Framer, Payload, Shopify, Webflow. Whatever you're running, we work within it. No platform migrations, no forcing you off tools that already work. We adapt to your stack.",
      },
      {
        title: "Compounding over cosmetic.",
        body: "Month one is foundational. Month two iterates on month one's data. Month three builds on both. The engagement gets sharper over time because each decision is informed by what's already been tested.",
      },
    ],
  },
  timeline: {
    eyebrow: "05. Timeline",
    title: "First month, mapped out.",
    phases: [
      { week: "Week 1", title: "Deep-dive audit and roadmap", body: "Full review of the funnel, current pages, tracking, and traffic behaviour. Findings compiled into a prioritised roadmap." },
      { week: "Week 2", title: "Design and build begins", body: "Highest-priority pages move into design based on the audit. Copy, structure, and visual direction locked in." },
      { week: "Week 3", title: "Internal review and refinement", body: "Designs go through internal review, client feedback incorporated, and development begins on approved pages." },
      { week: "Week 4", title: "Pages go live", body: "First pages shipped to production with tracking in place. Baseline metrics captured, testing programme begins." },
    ],
    footnote:
      "Ecomlanders is a partner of Intelligems and can provide access to their testing platform if needed during the engagement.",
  },
  signoff: {
    eyebrow: "06. Sign-Off",
    title: "This proposal is valid for 30 days from the date above.",
    quoteLines: [
      { label: "Conversion Engine Retainer", amount: "£20,000 / month" },
      { label: "Phase 1 Pilot", amount: "£15,000 one-time" },
    ],
    quoteFootnote:
      "All figures GBP, inclusive of VAT where applicable. Invoices issued monthly in advance for retainer.",
    signatories: [
      { name: "Ajay Jani", role: "Founder, Ecomlanders" },
      { name: "Dylan Evans", role: "COO, Ecomlanders" },
    ],
    closing:
      "To confirm either option, a reply via WhatsApp or email is sufficient to begin. We'll issue the relevant invoice or payment link, and the kickoff call will be scheduled within 24 hours of confirmation.",
  },
};

---
title: Audit process
section: Delivery
subsection: Strategy (CRO)
order: 632
---

The deep audit. This is the one the Strategist runs in week 1 of a signed retainer (and the more thorough cousin of the sales-side Audit Playbook). The output is a baseline + a prioritised roadmap that the rest of the engagement is built against.

## When we audit

- **New client onboarding** — paid audit, establishes a performance baseline before any design work
- **Retainer clients** — quarterly audit to surface new optimisation opportunities
- **Post-launch** — 30 days after a landing page goes live, audit its actual performance
- **Performance decline** — when a client reports dropping CVR

A new-lead sales audit (Stage 1, free, 2-3 hours) is a different thing. See the sales-side Audit Playbook for that.

## Access we need

Request these from the client before starting:

- [ ] GA4 (Viewer access minimum)
- [ ] Shopify admin (Staff or Analytics access)
- [ ] Heatmap tool (Hotjar, MS Clarity) if installed
- [ ] Session recordings if available
- [ ] Google Search Console (if SEO is in scope)

## Data we pull

### From GA4

- Conversion funnel: Landing page → Product view → ATC → Checkout → Purchase
- CVR by device (desktop vs mobile)
- Bounce rate and exit rate by page
- Average session duration and pages per session
- Revenue per session
- Traffic sources breakdown
- Date range: 30 days minimum, 90 days preferred

### From heatmaps / sessions

- Click heatmaps for landing pages (desktop + mobile)
- Scroll depth map
- 20-30 session recordings, split across converted / bounced / mobile
- Note rage clicks, dead clicks, confusion patterns

### From Shopify

- Sales by traffic source
- Cart abandonment rate
- AOV
- Top-selling products (to check alignment with landing pages)

## The 8-layer scoring method

Score each layer 1-10. Layers under 6 are leaking and get prioritised.

| Layer | What we look at |
| --- | --- |
| 1. First impression | Headline communicates value in under 5s. CTA visible without scrolling on mobile. Hero supports the message. No visual clutter. |
| 2. Value proposition | New visitor understands what's being sold in seconds. Benefits front and centre. USP clear vs competitors. |
| 3. Trust & social proof | Reviews / testimonials visible. Near key decision points, not buried. Authentic (photos, names, specifics). Trust badges and guarantees present. |
| 4. Visual hierarchy | Eye flows naturally down. Clear content hierarchy. CTAs distinct. Page scannable, not a wall of text. |
| 5. CTA strategy | Clear primary CTA. Repeated at sensible intervals. Copy communicates value, not "Submit". Not too many competing CTAs. |
| 6. Objection handling | Page addresses buying objections. Shipping / returns easy to find. FAQ section. Guarantees or risk-reversal present. |
| 7. Mobile experience | Purpose-built mobile, not a squished desktop. Tap targets ≥44x44px. Text readable without zoom. Forms work on mobile. |
| 8. Page performance | LCP under 2.5s. CLS under 0.1. No layout shifts from late loads. Images optimised and lazy-loaded. |

### Scoring summary

| Layer | Score (1-10) | Priority | Notes |
| --- | --- | --- | --- |
| First impression | | | |
| Value proposition | | | |
| Trust & social proof | | | |
| Visual hierarchy | | | |
| CTA strategy | | | |
| Objection handling | | | |
| Mobile experience | | | |
| Page performance | | | |
| **Overall** | **/80** | | |

## Report structure

| Section | Length | What's in it |
| --- | --- | --- |
| Executive summary | 1 page | Overall score /80. Top 3 issues hurting CVR. Estimated impact range. Recommended next steps. |
| Data overview | 1-2 pages | Current conversion metrics, traffic, device split, key funnel drop-offs. |
| Layer-by-layer | 4-6 pages | Each layer its own section. Annotated screenshots. Severity rating (Critical / High / Medium / Low). Specific actionable recommendations. |
| Priority roadmap | 1 page | Quick wins (1-2 days) / Medium (1-2 weeks) / Strategic (design + build) |
| Appendix | varies | Raw data tables, heatmap screenshots, session recording highlights with timestamps |

## Presenting findings

**Do:**

- Lead with the biggest opportunities, not the problems
- Frame everything as revenue impact: "This could increase your CVR by X%"
- Use their own data — screenshots of their analytics, their heatmaps
- Have a clear next-steps proposal ready
- Be specific: "Change the hero CTA from 'Learn More' to 'Shop Now'" not "improve CTAs"

**Don't:**

- Be condescending about their current site
- Present 50 recommendations at once (overwhelm kills action)
- Use jargon without explaining
- Present problems without solutions
- Promise specific numbers. Use ranges and frame as estimates.

## Timeline

| Audit type | Data | Analysis | Report | Total |
| --- | --- | --- | --- | --- |
| Free (sales lead-gen) | 1 hr | 1 hr | 1 hr | 3 hrs |
| Standard (paid) | 2-3 hrs | 4-6 hrs | 3-4 hrs | 2 days |
| Comprehensive (retainer) | 4-6 hrs | 6-8 hrs | 4-6 hrs | 3 days |

> **Free audits are a sales tool, not a deliverable.** They should be impressive enough to win the project but not so thorough that you've given away all the value. Show what's wrong and hint at how to fix it. The detailed roadmap is part of the paid engagement.

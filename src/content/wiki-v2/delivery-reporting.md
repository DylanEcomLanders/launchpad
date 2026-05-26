---
title: Reporting
section: Delivery
subsection: Strategy (CRO)
order: 635
---

Every retainer client gets a monthly performance report from the Strategist. The report should take no more than 2 hours to produce once the data infrastructure is set up.

## Monthly report structure

Five sections, under 5 pages total. Clients don't read 20-page reports.

| Section | Length | Contents |
| --- | --- | --- |
| Executive summary | 1/2 page | Performance up / down / flat vs last month. Key wins. Top priority for next month. |
| KPI dashboard | 1 page | Table: this month vs last month vs 3-month average. Highlight anything outside normal range. |
| What we did | 1/2 page | Changes shipped, tests run + results, optimisations made. |
| Insights & recommendations | 1 page | What the data is telling us. Specific actions for next month, priority-ranked. |
| Next month plan | 1/2 page | Planned work, tests to run, client action items. |

If you need detailed data, put it in an appendix. The report itself stays tight.

## KPIs we track

### Primary (every report)

| KPI | Definition | Healthy range |
| --- | --- | --- |
| Conversion rate (CVR) | Orders / Sessions | 2.5-4% for most DTC |
| Add-to-cart rate (ATC) | ATC events / Sessions | 8-12% |
| Revenue per session | Total revenue / Sessions | Varies by AOV |
| Bounce rate | Single-page sessions / Total | Under 45% for landing pages |
| Average order value (AOV) | Total revenue / Orders | Track trend, not absolute |

### Secondary (when relevant)

| KPI | When |
| --- | --- |
| Cart abandonment rate | Always for ecommerce |
| Scroll depth | Landing page audits |
| CTA click-through rate | A/B test analysis |
| Page load time (LCP) | Monthly, or after changes |
| Return visitor rate | Brand awareness projects |
| Email capture rate | Lead gen landing pages |

## Interpreting the numbers

- **CVR dropped but AOV increased?** Likely fine. Revenue per session is what matters.
- **Bounce rate high but CVR also high?** Page is polarising but converting the right people.
- **ATC high but CVR low?** Checkout friction. Investigate the checkout flow, shipping costs, payment options.
- **All metrics flat MoM?** That's not failure. Stability after changes means the baseline is solid. Look for new growth levers.

## GA4 setup

Required on every client before pulling data.

### Basic

- [ ] Property created, tracking code installed
- [ ] Data stream configured for correct domain
- [ ] Internal traffic filtered (your IP, client's office IP)
- [ ] Enhanced measurement enabled (scroll, outbound clicks, site search)
- [ ] Data retention set to 14 months

### Ecommerce events

- [ ] `view_item` on product pages
- [ ] `add_to_cart` on add
- [ ] `begin_checkout` at checkout start
- [ ] `purchase` on order confirmation (with value, transaction_id)
- [ ] `view_item_list` on collection pages

### Custom (as needed)

- [ ] CTA button clicks (tagged by section)
- [ ] Form submissions
- [ ] Video plays
- [ ] Scroll depth milestones (25%, 50%, 75%, 100%)

### Verification

- [ ] Test every event via GA4 DebugView
- [ ] Confirm purchase event matches Shopify (compare a few orders)
- [ ] Check real-time data after go-live

## Attribution

GA4 uses data-driven attribution by default. Fine for most reporting; don't change unless the client specifically requests another model.

### What to tell clients

- No attribution model is perfect
- GA4 and Shopify will always show different numbers (Shopify uses last-click)
- Pick one source as truth and stick with it
- For most Shopify stores: **Shopify analytics = source of truth for revenue**, **GA4 = source of truth for behaviour**

### UTM tracking

For any traffic we drive (ads, emails, social):

```
?utm_source=[platform]&utm_medium=[type]&utm_campaign=[campaign-name]
```

Examples:

```
?utm_source=facebook&utm_medium=paid&utm_campaign=spring-sale-lp
?utm_source=email&utm_medium=newsletter&utm_campaign=march-promo
```

> **Always lowercase UTM parameters.** Mixed case creates duplicate entries in reports.

## Presenting to clients

1. **Lead with the story, not the numbers.** "Your landing page converted 22% more visitors this month because of the testimonial section we added" — not "CVR went from 2.1% to 2.56%".
2. **Context matters more than raw data.** A 3% CVR means nothing without industry average + historical range + what changed.
3. **Visualise comparisons.** Simple bar charts or line graphs. Don't make clients interpret tables.
4. **Be honest about bad months.** If performance dropped, say so. Explain why (seasonality, traffic quality, a test that didn't work). Present the recovery plan.
5. **Always end with next steps.** Data without action is useless.

### What clients actually care about

- Is my revenue going up?
- Is the money I'm spending on this agency worth it?
- What should I do next?

Build every report to answer those three.

## Automate vs keep manual

**Automate**: data collection from GA4 (Looker Studio or GA4 dashboard), KPI snapshots, comparison tables.

**Keep manual**: insights and recommendations, client-specific context (sales, promotions, seasonality), next month's strategy, the executive summary. That's where the value is.

## Tools

| Tool | Use |
| --- | --- |
| GA4 | Primary analytics data |
| Shopify Analytics | Revenue source of truth |
| Looker Studio | Automated dashboards |
| Google Sheets | Data analysis, custom calculations |
| Loom | Report walkthrough recordings |

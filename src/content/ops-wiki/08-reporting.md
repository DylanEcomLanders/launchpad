# Reporting & Analytics

## Monthly Report Template

Every retainer client receives a monthly performance report. The report should take no more than 2 hours to produce once the data infrastructure is set up.

### Report Structure

1. **Executive Summary** (half page)
   - Overall performance: up, down, or flat vs. last month
   - Key wins this month
   - Top priority for next month

2. **KPI Dashboard** (1 page)
   - Table comparing this month vs. last month vs. 3-month average
   - Highlight anything outside of normal range (good or bad)

3. **What We Did This Month** (half page)
   - Changes shipped
   - Tests run and results
   - Optimisations made

4. **Insights & Recommendations** (1 page)
   - What the data is telling us
   - Specific actions recommended for next month
   - Priority ranking of recommendations

5. **Next Month Plan** (half page)
   - Planned work
   - Tests to run
   - Any client action items

> **Keep it under 5 pages total.** Clients don't read 20-page reports. If you need to include detailed data, put it in an appendix.

## KPIs We Track

### Primary KPIs (every report)

| KPI | Definition | Target Range |
|-----|-----------|-------------|
| Conversion Rate (CVR) | Orders / Sessions | 2.5-4% for most DTC brands |
| Add-to-Cart Rate (ATC) | ATC events / Sessions | 8-12% |
| Revenue per Session | Total revenue / Sessions | Varies by AOV |
| Bounce Rate | Single-page sessions / Total sessions | Under 45% for landing pages |
| Average Order Value (AOV) | Total revenue / Orders | Track trend, not absolute |

### Secondary KPIs (include when relevant)

| KPI | Definition | When to Track |
|-----|-----------|---------------|
| Cart Abandonment Rate | Abandoned carts / Initiated checkouts | Always for ecommerce |
| Scroll Depth | % of users reaching page bottom | Landing page audits |
| CTA Click-Through Rate | CTA clicks / Page views | A/B test analysis |
| Page Load Time (LCP) | Largest Contentful Paint | Monthly, or after changes |
| Return Visitor Rate | Returning sessions / Total sessions | Brand awareness projects |
| Email Capture Rate | Signups / Sessions | Lead gen landing pages |

### How to Interpret the Numbers

- **CVR dropped but AOV increased?** Likely fine — revenue per session is what matters
- **Bounce rate high but CVR also high?** The page is polarising but converting the right people
- **ATC high but CVR low?** Checkout friction — investigate the checkout flow, shipping costs, or payment options
- **All metrics flat month over month?** That's not failure — stability after changes means the baseline is solid. Look for new growth levers

## GA4 Setup Checklist

Ensure this is configured for every client before pulling any data.

### Basic Setup
- [ ] GA4 property created and tracking code installed
- [ ] Data stream configured for the correct domain
- [ ] Internal traffic filtered (your IP, client's office IP)
- [ ] Enhanced measurement enabled (scroll, outbound clicks, site search)
- [ ] Data retention set to 14 months (Settings > Data Retention)

### Ecommerce Events
- [ ] `view_item` fires on product pages
- [ ] `add_to_cart` fires when item is added
- [ ] `begin_checkout` fires at checkout start
- [ ] `purchase` fires on order confirmation (with value, transaction_id)
- [ ] `view_item_list` fires on collection pages

### Custom Events (set up as needed)
- [ ] CTA button clicks (tagged by section)
- [ ] Form submissions
- [ ] Video plays
- [ ] Scroll depth milestones (25%, 50%, 75%, 100%)

### Verification
- [ ] Test every event using GA4 DebugView
- [ ] Confirm purchase event matches Shopify order data (compare a few orders)
- [ ] Check real-time data after go-live

## Attribution Model

### Default: Data-Driven (GA4)
GA4 uses data-driven attribution by default. This is fine for most reporting. Don't change it unless the client specifically requests a different model.

### What to Tell Clients About Attribution
- No attribution model is perfect
- GA4 and Shopify will always show different numbers (Shopify uses last-click)
- Use one source as the "source of truth" for decision-making and stick with it
- For most Shopify stores, **Shopify analytics is the source of truth for revenue**, and **GA4 is the source of truth for behaviour data**

### UTM Tracking
For any traffic we're driving (from ads, emails, social):
```
?utm_source=[platform]&utm_medium=[type]&utm_campaign=[campaign-name]
```
Examples:
- `?utm_source=facebook&utm_medium=paid&utm_campaign=spring-sale-lp`
- `?utm_source=email&utm_medium=newsletter&utm_campaign=march-promo`

> **Always use lowercase for UTM parameters.** Mixed case creates duplicate entries in reports.

## How to Present Data to Clients

### Rules
1. **Lead with the story, not the numbers.** "Your landing page converted 22% more visitors this month because of the testimonial section we added" — not "CVR went from 2.1% to 2.56%"
2. **Context matters more than raw data.** A 3% CVR means nothing without knowing the industry average, their historical range, and what changed
3. **Visualise comparisons.** Use simple bar charts or line graphs. Don't make clients interpret a data table
4. **Be honest about bad months.** If performance dropped, say so, explain why (seasonality, traffic quality change, a test that didn't work), and present the recovery plan
5. **Always end with next steps.** Data without action is useless

### What Clients Actually Care About
- Is my revenue going up?
- Is the money I'm spending on this agency worth it?
- What should I do next?

Build every report to answer those three questions.

## Automated vs Manual Reporting

### Automate
- Data collection from GA4 (use Looker Studio or a GA4 reporting dashboard)
- KPI snapshots (set up a monthly data pull template)
- Comparison tables (this month vs. last month)

### Keep Manual
- Insights and recommendations (AI can help draft, but a human should review)
- Client-specific context (sales, promotions, seasonality notes)
- Next month's strategy
- The executive summary — this is where the value is, and it needs a human touch

### Tooling

| Tool | Use |
|------|-----|
| GA4 | Primary analytics data |
| Shopify Analytics | Revenue source of truth |
| Looker Studio | Automated dashboards for ongoing monitoring |
| Google Sheets | Data analysis and custom calculations |
| Loom | Report walkthrough recordings |

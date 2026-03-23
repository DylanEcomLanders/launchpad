# Test Hypothesis Bank

A consolidated bank of CRO test ideas organised by funnel layer. Each hypothesis includes an ICE score (Impact × Confidence × Ease, each scored 1-10) to help prioritise.

**How to use:** Filter by layer, sort by total ICE score, and run the highest-scoring tests first. Adjust scores based on your specific client's situation — a test that's high-impact for one store might be irrelevant for another.

**Minimum viable traffic for testing:** ~1,000 conversions per variant per month. If the client doesn't have this volume, skip A/B testing and implement the high-confidence changes directly based on best practices.

---

## Layer 1: Traffic & Audience

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| T1 | Splitting paid traffic between a dedicated landing page (for cold) and the homepage (for warm/retargeting) will increase blended CVR by 15-25% | 8 | 7 | 6 | 21 | CVR by segment |
| T2 | Creating audience-specific landing pages for top 3 Meta ad sets (by interest/demo) will improve PDP view rate by 10-20% | 7 | 6 | 5 | 18 | PDP view rate |
| T3 | Implementing server-side tracking (CAPI) will improve reported conversion accuracy by 15-30% and improve ad optimisation | 7 | 8 | 6 | 21 | Reported vs actual CVR |
| T4 | Excluding low-quality traffic sources (sub-2s avg session duration, >80% bounce) will improve blended ROAS by 10-15% | 6 | 7 | 8 | 21 | ROAS |
| T5 | Adding UTM parameters to all campaigns with a consistent naming convention will enable source-level CVR analysis (foundational, not directly revenue-impacting) | 4 | 9 | 9 | 22 | Data quality |
| T6 | Creating separate retargeting campaigns for cart abandoners (7-day window) vs site visitors (14-day window) will improve retargeting ROAS by 20-30% | 7 | 7 | 6 | 20 | Retargeting ROAS |
| T7 | Reducing Meta campaign audience overlap by consolidating interests will lower CPM by 5-15% | 5 | 6 | 7 | 18 | CPM |
| T8 | Running brand search campaigns to capture brand-intent traffic will defend against competitor conquesting and improve branded CVR | 6 | 7 | 7 | 20 | Brand search CVR |

---

## Layer 2: Ad Creative & Messaging

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| A1 | Testing UGC-style video creative (customer testimonial format) against polished brand creative for cold prospecting will improve CTR by 15-30% and downstream CVR by 5-10% | 8 | 7 | 6 | 21 | CTR + CVR |
| A2 | Adding a text overlay with the core benefit to the first frame of video ads will improve hook rate by 20-40% | 7 | 8 | 8 | 23 | Hook rate (3s views) |
| A3 | Testing problem-agitation-solution ad copy against social-proof-led copy will identify the highest-performing framework for cold traffic | 7 | 6 | 7 | 20 | CTR + CVR |
| A4 | Ensuring visual continuity between ad hero image and landing page hero image (same product angle, similar setting) will reduce landing page bounce rate by 10-20% | 7 | 8 | 7 | 22 | Bounce rate |
| A5 | Adding a clear price/offer callout in the ad (e.g., "Starting at £29" or "Save 20% today") will improve qualified CTR and reduce low-intent clicks | 6 | 7 | 8 | 21 | Qualified CTR |
| A6 | Refreshing top-performing ad creative with new hooks every 2 weeks (same body, new opening) will extend creative lifespan by 30-50% | 7 | 7 | 7 | 21 | Creative longevity |
| A7 | Testing carousel ads with a product education narrative (problem → solution → proof → CTA across slides) will improve CVR for complex/premium products by 10-20% | 6 | 6 | 7 | 19 | CVR |
| A8 | Using "as seen in [press logo]" in ad creative will improve CTR by 5-10% for brands with legitimate press coverage | 5 | 6 | 8 | 19 | CTR |
| A9 | Testing founder-story video ads for mission-driven brands will improve CTR and CVR by connecting emotionally with cold audiences | 7 | 6 | 5 | 18 | CTR + CVR |
| A10 | A/B testing static images vs short-form video (< 15s) for the same product will identify the optimal format for the specific audience | 7 | 5 | 7 | 19 | CTR + CPA |

---

## Layer 3: Landing Page / Homepage

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| L1 | Replacing a generic hero headline ("Welcome to [Brand]") with a specific benefit-driven headline will reduce bounce rate by 10-20% and increase PDP view rate | 8 | 8 | 9 | 25 | Bounce rate + PDP views |
| L2 | Adding a CTA button in the hero section (above the fold) will increase click-through to product pages by 15-25% | 8 | 8 | 9 | 25 | PDP view rate |
| L3 | Adding star rating + review count in the hero section (near CTA) will increase hero CTA click rate by 5-10% | 6 | 7 | 9 | 22 | Hero CTR |
| L4 | Adding "As Seen In" press logos below the hero section will reduce bounce rate by 3-5% for cold traffic | 5 | 6 | 9 | 20 | Bounce rate |
| L5 | Reducing main navigation options from 8+ to 5 or fewer will reduce bounce rate by 5-10% (less choice paralysis) | 6 | 6 | 7 | 19 | Bounce rate |
| L6 | Adding a "Best Sellers" or "Shop Our Top 3" section above the fold for paid traffic landing pages will increase PDP view rate by 10-15% | 7 | 7 | 8 | 22 | PDP view rate |
| L7 | Implementing a product recommendation quiz for cold traffic will increase PDP view rate by 20-30% and CVR by 5-10% | 8 | 6 | 4 | 18 | Quiz completion + CVR |
| L8 | Reducing hero image size on mobile to show headline + CTA without scrolling will increase below-fold content engagement by 15-25% | 7 | 7 | 8 | 22 | Scroll depth + PDP views |
| L9 | Adding a "How It Works" 3-step section below the hero will increase PDP view rate by 5-10% for products that need explanation | 6 | 7 | 8 | 21 | PDP view rate |
| L10 | Improving page speed from >3s LCP to <2.5s will increase CVR by 5-10% | 7 | 8 | 5 | 20 | CVR + bounce rate |
| L11 | Adding social proof (UGC gallery or review snippets) between the hero and product grid will increase engagement and PDP view rate by 5-8% | 5 | 6 | 8 | 19 | PDP view rate |

---

## Layer 4: Product Detail Page (PDP)

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| P1 | Moving the review count and star rating above the fold (within 200px of the ATC button, showing numeric count e.g., "2,847 reviews") will increase ATC rate by 5-10% | 8 | 8 | 9 | 25 | ATC rate |
| P2 | Adding a sticky/floating ATC button on mobile (appears after scrolling past the main ATC) will increase ATC rate by 8-15% | 8 | 8 | 8 | 24 | ATC rate |
| P3 | Adding a crossed-out compare-at price with calculated savings ("Save £15") next to the current price will increase ATC rate by 5-12% | 7 | 8 | 9 | 24 | ATC rate |
| P4 | Replacing the product description wall of text with scannable bullets/icons (feature → benefit format) will increase scroll depth by 15-20% and ATC rate by 3-5% | 6 | 7 | 8 | 21 | Scroll depth + ATC |
| P5 | Adding BNPL messaging (e.g., "or 4 payments of £12.49 with Klarna") below the price will increase ATC rate by 5-10% for items over £50 | 7 | 7 | 8 | 22 | ATC rate |
| P6 | Adding a money-back guarantee badge within the above-the-fold block (near the ATC button) will increase ATC rate by 3-7% | 6 | 7 | 9 | 22 | ATC rate |
| P7 | Switching variant selectors from dropdowns to visual swatches (with stock indication) will increase ATC rate by 5-10% | 7 | 7 | 7 | 21 | ATC rate |
| P8 | Adding a "Frequently Bought Together" section below the fold with 1-click add will increase AOV by 8-15% | 7 | 7 | 6 | 20 | AOV |
| P9 | Adding photo reviews to the review section (with dedicated photo filter) will increase review engagement by 20-30% and ATC rate by 3-5% | 6 | 7 | 7 | 20 | ATC rate |
| P10 | Adding a product video (in-use, 15-30s) as the 2nd image in the gallery will increase time on page by 20-30% and ATC rate by 3-8% | 7 | 6 | 6 | 19 | ATC rate |
| P11 | Adding a subscription/save option ("Subscribe & save 15%") on the PDP will generate 5-15% of PDP orders as subscriptions | 7 | 6 | 6 | 19 | Subscription take rate |
| P12 | Adding a FAQ section addressing the top 5 objections (returns, sizing, ingredients, shipping time, guarantee) will increase ATC rate by 3-5% | 5 | 7 | 8 | 20 | ATC rate |
| P13 | Reordering product images to lead with a lifestyle/in-use shot (not product-on-white) will increase image engagement by 10-15% | 6 | 6 | 9 | 21 | Image interaction rate |
| P14 | Adding real-time social proof ("23 people viewing this" or "147 sold this week") will increase ATC rate by 2-5% for high-traffic PDPs | 5 | 5 | 7 | 17 | ATC rate |
| P15 | Changing ATC button copy from "Add to Cart" to "Add to Bag — Free Shipping" will increase ATC rate by 3-6% | 5 | 6 | 9 | 20 | ATC rate |

---

## Layer 5: Cart

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| C1 | Adding a free shipping progress bar at the top of the cart will increase AOV by 10-15% | 8 | 8 | 9 | 25 | AOV |
| C2 | Adding Apple Pay / Shop Pay express checkout buttons above the standard checkout CTA will increase checkout initiation by 8-15% | 8 | 8 | 8 | 24 | Checkout rate |
| C3 | Making the checkout CTA sticky (fixed bottom) on mobile will increase cart-to-checkout rate by 5-8% | 7 | 8 | 9 | 24 | Checkout rate |
| C4 | Replacing a full-page cart with a slide-out drawer will increase cart-to-checkout rate by 5-10% | 7 | 7 | 7 | 21 | Checkout rate |
| C5 | Reducing cart upsells from 4+ products to 1 relevant product will increase cart-to-checkout rate by 3-5% | 6 | 7 | 9 | 22 | Checkout rate |
| C6 | Collapsing the promo code field behind a "Have a code?" link will reduce cart abandonment by 3-5% | 5 | 6 | 9 | 20 | Cart abandonment |
| C7 | Adding a delivery date estimate in the cart will increase checkout initiation by 3-6% | 6 | 7 | 7 | 20 | Checkout rate |
| C8 | Adding a one-click warranty/protection add-on will increase AOV by 5-8% with 15-25% take rate | 7 | 7 | 7 | 21 | AOV |
| C9 | Auto-applying active site-wide promo codes instead of requiring manual entry will increase cart-to-checkout rate by 4-7% | 6 | 7 | 6 | 19 | Checkout rate |
| C10 | Showing "You're saving £X" when discounts are applied will increase checkout completion by 2-4% | 5 | 6 | 9 | 20 | Checkout rate |

---

## Layer 6: Checkout

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| K1 | Enabling guest checkout (removing forced account creation) will increase checkout completion by 10-20% | 9 | 9 | 7 | 25 | Checkout CVR |
| K2 | Adding an order bump (complementary product, < 20% of AOV, checkbox format) between shipping and payment will increase AOV by 8-15% with 10-25% take rate | 8 | 8 | 7 | 23 | AOV |
| K3 | Adding Apple Pay / Google Pay / Shop Pay as express checkout options will increase mobile checkout completion by 10-20% | 8 | 8 | 7 | 23 | Mobile checkout CVR |
| K4 | Adding Klarna/Afterpay BNPL option for orders over £50 will increase checkout completion by 5-15% for qualifying orders | 7 | 7 | 7 | 21 | Checkout CVR |
| K5 | Displaying shipping costs on the PDP and in the cart (before checkout) will reduce checkout abandonment by 5-10% | 7 | 8 | 6 | 21 | Checkout abandonment |
| K6 | Adding a "30-day money-back guarantee" badge next to the pay button will increase checkout completion by 2-5% | 5 | 7 | 9 | 21 | Checkout CVR |
| K7 | Reducing checkout to a single page (from multi-step) will increase completion rate by 3-8% | 6 | 6 | 5 | 17 | Checkout CVR |
| K8 | Adding a delivery date estimate in checkout will increase completion by 3-5% | 5 | 7 | 7 | 19 | Checkout CVR |
| K9 | Implementing abandoned checkout email (first email within 1 hour) will recover 5-10% of abandoned checkouts | 8 | 8 | 7 | 23 | Recovered revenue |
| K10 | Optimising mobile checkout fields (correct keyboard types, larger inputs, inline validation) will increase mobile completion by 5-10% | 6 | 7 | 6 | 19 | Mobile checkout CVR |

---

## Layer 7: Post-Purchase

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| PP1 | Adding a one-click post-purchase upsell on the thank-you page will generate incremental revenue equal to 3-8% of total sales | 8 | 7 | 6 | 21 | Upsell revenue |
| PP2 | Adding a "How did you hear about us?" survey on the thank-you page will improve attribution accuracy for 60-80% of orders | 6 | 8 | 9 | 23 | Attribution data |
| PP3 | Timing review requests to 7-14 days after delivery (not purchase) will increase review submission rate by 30-50% vs purchase-triggered timing | 7 | 8 | 7 | 22 | Review rate |
| PP4 | Offering a photo review incentive (10% off next order) will increase photo review rate by 40-60% | 6 | 7 | 8 | 21 | Photo review rate |
| PP5 | Adding a referral program offer on the thank-you page will generate 2-5% of new customers from referrals | 6 | 5 | 6 | 17 | Referral revenue |
| PP6 | Adding branded insert cards with QR code to review page will increase review rate by 10-20% | 5 | 6 | 7 | 18 | Review rate |
| PP7 | Sending a "product education" email 3-5 days after delivery (tips, how-to-use, care) will increase NPS and repeat purchase rate by 5-10% | 6 | 6 | 7 | 19 | Repeat purchase rate |
| PP8 | Adding SMS opt-in with incentive on the thank-you page will capture 15-25% of customers for SMS marketing | 6 | 7 | 7 | 20 | SMS list growth |

---

## Layer 8: Retention & LTV

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| R1 | Implementing a 3-email abandoned cart flow (1hr, 24hr, 72hr) will recover 5-10% of abandoned carts | 9 | 9 | 7 | 25 | Recovered revenue |
| R2 | Implementing a 5-7 email welcome flow for new subscribers (value-first, not discount-first) will increase first-purchase rate by 15-25% | 8 | 7 | 6 | 21 | Welcome flow revenue |
| R3 | Implementing a win-back flow for customers who haven't purchased in 60-90 days will reactivate 3-8% of lapsed customers | 7 | 7 | 6 | 20 | Reactivation rate |
| R4 | Segmenting email campaigns by RFM (champions get VIP content, at-risk get win-back offers) will increase email revenue per recipient by 20-40% | 7 | 7 | 5 | 19 | Email RPR |
| R5 | Adding a browse abandonment flow (triggered 1hr after viewing PDP without ATC) will generate incremental revenue equal to 1-3% of total sales | 6 | 7 | 6 | 19 | Flow revenue |
| R6 | Implementing subscription flexibility (skip, pause, swap) will reduce subscription churn by 20-30% | 7 | 7 | 5 | 19 | Subscription churn |
| R7 | Adding SMS to the abandoned cart recovery sequence (SMS at 2hr, in addition to email) will increase cart recovery by 15-25% | 6 | 7 | 6 | 19 | Cart recovery rate |
| R8 | Implementing a replenishment reminder flow for consumable products (timed to usage cycle) will increase repeat purchase rate by 10-20% | 7 | 7 | 5 | 19 | Repeat purchase rate |
| R9 | Running a sunset flow (remove unengaged subscribers after 90 days of no opens/clicks) will improve deliverability and open rates by 10-20% | 5 | 8 | 7 | 20 | Deliverability + open rate |
| R10 | Implementing a VIP loyalty tier (early access, exclusive products) for top 10% of customers will increase their purchase frequency by 15-25% | 7 | 5 | 4 | 16 | VIP purchase frequency |

---

## Layer 9: Offer Architecture

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| O1 | Setting a free shipping threshold at 20-30% above current AOV will increase AOV by 12-25% | 8 | 8 | 8 | 24 | AOV |
| O2 | Creating a named, curated bundle ("The Starter Kit" / "The Complete Set") will increase AOV by 15-30% vs single-product purchases | 8 | 7 | 6 | 21 | AOV |
| O3 | Testing "free gift with purchase over £X" vs "15% off" will identify which offer type drives higher revenue per session (gifts often win for premium brands) | 7 | 6 | 6 | 19 | Revenue per session |
| O4 | Implementing tiered discounting ("Buy 2 save 10%, Buy 3 save 20%") will increase units per order by 20-35% | 7 | 7 | 6 | 20 | Units per order |
| O5 | Replacing a permanent 10% discount code with a time-limited first-order offer will increase first-purchase urgency by 10-15% without training discount dependency | 6 | 6 | 7 | 19 | First-order CVR |
| O6 | Adding a subscription option with 15% savings and cancellation flexibility will convert 5-15% of one-time orders to subscriptions | 7 | 6 | 5 | 18 | Subscription rate |
| O7 | Creating "value bundles" (3-packs, 6-packs) with per-unit pricing shown will increase AOV by 15-25% for consumable products | 7 | 7 | 7 | 21 | AOV |
| O8 | Testing dollar-off vs percentage-off for the same effective discount will identify which framing converts better (typically: $ off for < £50 items, % off for > £50 items) | 5 | 6 | 8 | 19 | CVR by offer type |

---

## Layer 10: Analytics & Measurement

| # | Hypothesis | I | C | E | Total | Primary Metric |
|---|-----------|---|---|---|-------|----------------|
| M1 | Setting up the full funnel metrics stack (sessions → PDP views → ATC → checkout → purchase) segmented by traffic source will identify the #1 conversion bottleneck within 2 weeks | 7 | 9 | 7 | 23 | Decision quality |
| M2 | Installing Microsoft Clarity (free) for heatmaps and session recordings will reveal UX issues not visible in quantitative data | 6 | 8 | 9 | 23 | UX insights |
| M3 | Implementing server-side tracking (CAPI/Enhanced Conversions) will improve attribution accuracy by 15-30% and ad platform optimisation | 7 | 8 | 5 | 20 | Attribution accuracy |
| M4 | Setting up weekly cohort analysis will reveal whether recent changes are improving or degrading performance (vs noise from traffic mix shifts) | 6 | 7 | 6 | 19 | Decision quality |
| M5 | Implementing a post-purchase attribution survey ("How did you hear about us?") will fill attribution gaps for 60-80% of orders | 5 | 7 | 8 | 20 | Attribution data |
| M6 | Tracking revenue per session as the primary KPI (instead of CVR alone) will lead to better optimisation decisions that balance conversion and AOV | 6 | 7 | 8 | 21 | Decision quality |
| M7 | Setting up page speed monitoring (LCP, CLS alerts) will catch performance regressions before they impact conversion | 5 | 7 | 7 | 19 | Page speed |
| M8 | Implementing a structured test log (hypothesis, variant, result, learnings) will prevent repeated failed tests and compound organisational knowledge | 4 | 8 | 8 | 20 | Test velocity |

---

## Quick Reference: Top 10 Highest-Impact Tests (by ICE Score)

| Rank | ID | Hypothesis | ICE | Layer |
|------|----|-----------|-----|-------|
| 1 | L1 | Replace generic hero headline with benefit-driven headline | 25 | Landing Page |
| 2 | L2 | Add CTA button in hero section above the fold | 25 | Landing Page |
| 3 | P1 | Move review count + stars above the fold near ATC | 25 | PDP |
| 4 | C1 | Add free shipping progress bar to cart | 25 | Cart |
| 5 | K1 | Enable guest checkout | 25 | Checkout |
| 6 | R1 | Implement 3-email abandoned cart flow | 25 | Retention |
| 7 | O1 | Set free shipping threshold at 20-30% above AOV | 24 | Offers |
| 8 | P2 | Add sticky ATC button on mobile | 24 | PDP |
| 9 | P3 | Add crossed-out compare-at price with savings callout | 24 | PDP |
| 10 | C2 | Add Apple Pay / Shop Pay express checkout to cart | 24 | Cart |

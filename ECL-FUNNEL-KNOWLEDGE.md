# ECL FUNNEL KNOWLEDGE — Condensed Reference
> The complete 10-layer DTC ecommerce funnel. Every layer, every benchmark, every audit question, every test.

---

## THE MENTAL MODEL

The funnel is a pressure system, not a linear pipeline. Every layer either builds momentum or bleeds it. When a layer fails, it degrades everything downstream.

Your job: find where the pressure drops and fix the seal.

### The Metrics Stack

| Stage | Metric | Benchmark |
|-------|--------|-----------|
| Sessions | Qualified sessions | Varies |
| Bounce Rate | Single-page sessions | 35-55% paid, 25-40% organic |
| PDP Views | Sessions with product view | 40-60% of sessions |
| Add to Cart | ATC rate from PDP | 8-12% |
| Cart View | Cart view rate | 65-80% of ATC |
| Checkout Init | Checkout rate from ATC | 55-65% |
| Checkout Done | Purchase from checkout | 28-35% |
| Overall CVR | Purchase / sessions | 1.5-3.5% cold, 3-6% warm |
| AOV | Revenue / orders | Category-dependent |
| Revenue/Session | Revenue / sessions | £2-8 DTC avg |

Revenue per session is the single best health metric. It captures both CVR and AOV.

### The Economics

Brand doing £1M/year, 500K sessions, 2% CVR, £100 AOV:
- CVR 2% → 2.5%: **+£250K/year** (no extra ad spend)
- AOV £100 → £115: **+£150K/year**
- Both: **+£437.5K/year** (43.75% growth)

CRO is the only growth lever that compounds.

---

## LAYER 1: TRAFFIC & AUDIENCE

**Job:** Deliver the right people with the right intent, at a cost that allows profitability.

### The #1 Misdiagnosis
Blaming the website for a traffic problem. Brand says "CVR is 1.2%, site must be broken." Segment by source: Meta prospecting 0.4% (normal for cold), email 8%. Site is fine. Expectation is broken.

### Audience Temperature

**Cold** (never heard of you): Needs problem awareness, social proof at scale, education, risk reversal. CVR: 0.5-2% impulse, 0.2-0.8% high-ticket.

**Warm** (engaged but not purchased): Needs objection handling, specific social proof, urgency/incentive, simplicity. CVR: 2-5% retargeting, 1-3% email to non-purchasers.

**Hot** (purchased before or cart in progress): Needs zero friction, cart recovery, upsell, reassurance. CVR: 5-15% cart abandonment email, 5-12% returning purchasers.

### Source Benchmarks

| Source | Bounce | CVR | Pages/Session |
|--------|--------|-----|---------------|
| Meta Prospecting | 55-75% | 0.5-2% | 1.5-2.5 |
| Meta Retargeting | 35-50% | 3-8% | 2.5-4.0 |
| TikTok | 60-80% | 0.3-1.5% | 1.3-2.0 |
| Google Brand Search | 20-35% | 5-15% | 3-5 |
| Google Non-Brand | 40-55% | 1.5-4% | 2-3 |
| Google Shopping | 35-50% | 1.5-3.5% | 2-3 |
| Organic | 25-60% | 1.5-10% | 2-5 |
| Email Campaign | 15-30% | 3-6% | 3-5 |
| Email Flow | 10-25% | 5-12% | 2-4 |
| SMS | 10-25% | 5-10% | - |
| Direct | 20-40% | 3-8% | 3-6 |

### Message-to-Market Match

The ad and landing page must be the same conversation. Broken match = 40-60% bounce rate increase.

**What breaks it:**
- Visual discontinuity (lifestyle ad → product-on-white hero)
- Copy discontinuity ("doesn't taste like chalk" ad → "Premium Whey Isolate 30g" page)
- Offer discontinuity (20% off in ad → full prices on page)
- Audience discontinuity (targets new moms → generic page for everyone)

**Audit:** Screenshot every active ad. Click through. Side-by-side compare. Does the visitor know within 3 seconds they're in the right place?

### UTM Architecture
- Lowercase everything. Underscores not hyphens.
- Source = platform (`facebook`, `google`, `klaviyo`)
- Medium = channel type (`cpc`, `email`, `sms`, `influencer`)
- Campaign = funnel stage + descriptor (`prospecting_broad_us`)
- Content = creative ID (`ugc_before_after_v2`)
- Never put UTMs on internal links (corrupts attribution)

### Quality Metrics That Matter
- Revenue per session by source (ultimate quality metric)
- AOV by source (some attract bargain-hunters)
- New customer revenue % by source
- LTV by acquisition source

### Key Warnings
- Email inflates blended CVR. Always segment it out.
- Performance Max loves to spend on brand searches. Run brand exclusions.
- Influencer measured by last-click alone undervalues it 2-3x. Use post-purchase surveys + unique codes.
- If "direct" traffic is >25%, tracking is probably broken (dark social, untagged links).

---

## LAYER 2: AD CREATIVE & MESSAGING

**Job:** Stop the scroll, set expectations, generate qualified click-through.

### The Hook
You have 1.5-3 seconds. The hook's job is not to sell — it's to earn the next 5 seconds.

**Hook types that work:**
- Pattern interrupt (unexpected visual/sound)
- Pain statement ("Tired of X?")
- Bold claim ("This replaced my entire skincare routine")
- Social proof lead ("200,000 women switched to this")
- Curiosity gap ("The one thing dermatologists won't tell you")

### Ad Formats

**Static images:** Best for retargeting and simple products. Lead with lifestyle, not product-on-white. Text overlay with core benefit. Single clear CTA.

**Video (15-60s):** Best for cold prospecting and products needing explanation. Hook in first 3s. Problem → solution → proof → CTA. Captions always on (85% watch muted).

**UGC:** Most trusted format for cold traffic. Real person, real experience. "Talking head" testimonial or "day in my life" integration. Perform 2-3x vs polished brand creative for prospecting.

**Carousel:** Good for education-heavy products. Tell a story across slides: problem → solution → features → proof → CTA. Each slide must stand alone if they stop swiping.

### Copy Frameworks

**PAS (Problem-Agitation-Solution):** State the problem → make it feel urgent → present product as the fix. Best for cold traffic to problem-aware audiences.

**Social Proof Lead:** Open with the metric. "2M+ sold" or "Rated #1 by X." Works when you have impressive numbers. Best for warm traffic.

**Direct Response:** Lead with the offer. "20% off this weekend only." Works for retargeting and promotions. Don't use for cold — kills brand equity.

**Us vs Them:** Position against the alternative (not a named competitor — the category). "Unlike regular protein, this..." Works for differentiated products.

### Creative Fatigue
CTR declining over 2-3 weeks on the same creative = fatigue. Solution: refresh the hook (new opening, same body). Iterate on winners rather than starting from scratch. Test 3-5 new creatives per week at scale.

### The Measurement Trap
CTR alone is misleading. A clickbait ad gets high CTR but low CVR. Always measure CTR alongside downstream conversion. The best creative has good CTR AND good CVR — it attracts the right people AND sets accurate expectations.

---

## LAYER 3: LANDING PAGE / HOMEPAGE

**Job:** Confirm the promise, orient the visitor, move them toward a product.

### The 5-Second Test
Show someone the page for 5 seconds. They should answer:
1. What does this company sell?
2. What makes them different?
3. What should I do next?

If they can't → hero section is failing.

### Hero Section (Above the Fold)

**Must contain:**
- Specific benefit-driven headline (not "Welcome to [Brand]")
- Subheadline that expands on the benefit
- Primary CTA button (high contrast, action-oriented)
- Supporting visual (lifestyle > product-on-white for cold traffic)
- Social proof snippet (star rating + review count)

**Mobile:** Hero image must not consume entire viewport. Headline + CTA must be visible without scrolling. ~600-700px above fold on mobile.

### CTA Architecture
- One primary CTA per page section
- Action-oriented language ("Shop Best Sellers" not "Click Here")
- High contrast against background
- Full-width on mobile, 44px minimum height
- Sticky CTA on mobile for long pages

### Content Blocks Below the Fold

**The storytelling arc:** Problem → Solution → Proof → CTA

Recommended section order:
1. Hero (benefit + CTA)
2. Trust bar (press logos, trust badges)
3. "How it works" (3 steps)
4. Benefits (icon grid or feature blocks)
5. Social proof (UGC gallery or review highlights)
6. Product showcase (top 3 or "best sellers")
7. FAQ (top 3-5 objections)
8. Final CTA

### Page Speed
Every 100ms of additional load time costs ~1% of conversion.
- Target LCP < 2.5s
- Compress images (WebP, proper dimensions)
- Lazy load below-fold content
- Minimal third-party scripts

### Cold vs Returning Visitors
- Cold: needs education, social proof, problem awareness
- Returning: needs quick access to products, account, previously viewed items
- Consider dynamic content based on visitor status

---

## LAYER 4: PRODUCT DETAIL PAGE (PDP)

**Job:** Build enough desire and trust to trigger add-to-cart.

The PDP is the most important page in DTC ecommerce. This is where the purchase decision is made.

### Above-the-Fold Block (Must Be Complete)

All visible without scrolling on mobile:
- Product image (lifestyle lead, not product-on-white)
- Title + subtitle (benefit, not just product name)
- Price (with compare-at/savings if applicable)
- Star rating + review count (within 200px of ATC)
- ATC button (high contrast, full-width mobile, unmissable)
- BNPL messaging below price ("or 4 payments of £12.49")
- Trust signal (guarantee badge near ATC)

### Product Imagery
- Minimum 4-6 images
- Lead with lifestyle/in-use shot
- Include: product at scale, detail/texture, packaging, ingredients/specs
- Add a 15-30s product video as image 2
- All images should be zoomable

### Pricing Psychology
- Anchoring: show compare-at price with calculated savings ("Save £15")
- Per-unit pricing for consumables ("£0.50 per serving")
- BNPL for items over £50 (increases ATC 5-10%)
- Subscription option with savings ("Subscribe & save 15%")

### Product Description
- Benefit-focused, not feature-only ("Wakes you up in 20 minutes" not "Contains 200mg caffeine")
- Scannable: bullets, icons, expandable sections
- Feature → benefit format: "[Feature] so you can [benefit]"
- Max 150 words visible, rest in expandable accordion

### Variant Selection
- Visual swatches (not dropdowns) for colour/pattern
- Size guide easily accessible
- Stock indication on variants
- Out-of-stock variants greyed out with "Notify Me"

### Social Proof on PDP
- Star rating + numeric count near ATC
- "X sold this week" or "X people viewing" (only if real)
- Photo reviews in dedicated section below fold
- "Most helpful" review pinned at top
- Filter reviews by use case or variant

### Trust & Risk Reversal
- Money-back guarantee badge near ATC
- Shipping info (timeline + cost) near ATC
- Return policy link
- Payment method logos
- Security/certification badges if relevant

### Upsell & Cross-Sell
- "Frequently Bought Together" below fold (1-click add)
- Maximum 2-3 complementary products
- Show savings when bought together
- Don't let upsells push ATC below fold

### FAQ Section
Address the top 5 purchase objections:
1. Returns/refund policy
2. Sizing/fit guidance
3. Ingredients/materials
4. Shipping timeline
5. Guarantee details

### Sticky Mobile CTA
Floating ATC button appears after user scrolls past the main ATC. Always visible, always accessible. Increases ATC rate 8-15%.

---

## LAYER 5: CART

**Job:** Maintain momentum, increase AOV, don't leak.

### The Tension
The cart must do two things that conflict: speed the customer to checkout (don't distract) AND increase AOV (upsell). The best carts thread this needle with restraint.

### Cart Format

**Slide-out drawer:** Best for most DTC. Keeps the shopping context. Customer can close and continue browsing. 5-10% higher cart-to-checkout vs full-page.

**Full-page cart:** Better for complex purchases or high-AOV items where customers need to review carefully.

### Essential Cart Elements
- Product image, name, variant, quantity, price
- Order total (including shipping estimate)
- Checkout CTA — sticky on mobile, always visible
- Express checkout (Apple Pay, Shop Pay, PayPal) above standard CTA
- Free shipping progress bar (threshold 20-30% above AOV)
- Delivery estimate
- Trust signals near checkout CTA

### Cart Upsells — Rules
- Maximum 1-2 products
- Must be relevant to what's in cart
- One-click add (no PDP redirect)
- Must NOT push checkout CTA below fold on mobile
- Show savings if adding gets them over free shipping threshold

### Promo Code Field
Hide behind "Have a code?" link. Visible promo fields cause 5-8% of customers to leave and search for codes. Auto-apply active site-wide promotions instead.

### What Kills Cart-to-Checkout
1. Surprise costs (shipping, tax not shown until cart)
2. Required account creation
3. Too many upsell distractions
4. Promo code field triggering code-hunting
5. Slow cart loading (>1s)
6. Checkout CTA not visible without scrolling

---

## LAYER 6: CHECKOUT

**Job:** Remove every friction point, capture the transaction.

### The #1 Rule
Every field, every click, every second in checkout is a potential dropout. The checkout's only job is to make the transaction as frictionless as possible.

### Guest Checkout
Non-negotiable. Forced account creation kills 10-20% of checkout completions. Offer account creation AFTER purchase on the thank-you page.

### Payment Methods

**Express checkout (Apple Pay, Google Pay, Shop Pay):** Must be prominent above the form. Mobile checkout completion +10-20%. Shop Pay converts 1.7x better than standard checkout.

**BNPL (Klarna, Afterpay):** For orders over £50. Increases checkout completion 5-15% for qualifying orders. Show instalment messaging ("4 payments of £X").

### Form Design
- Minimum fields only (name, email, address, payment)
- Autofill support enabled
- Address validation/autocomplete
- Correct keyboard types on mobile (numeric for zip, email for email)
- Inline validation (not "fix errors" at top after submission)
- "Billing same as shipping" defaulted to checked
- Fields properly sized for mobile (no tiny inputs)

### Order Bump
Small add-on between shipping and payment. Checkbox format. Must be < 20% of AOV. "Add extended warranty — £4.99" or complementary product. 10-25% take rate. Highest ROI element in checkout.

### Trust Signals
- Security badge near pay button
- "30-day money-back guarantee" near pay button
- Payment method logos
- Order summary visible throughout

### Shipping
- Cost shown consistently (same as cart — no surprises)
- Delivery date estimate
- Free shipping if threshold met (show confirmation)

### Pay Button
Clear, specific text: "Pay £X" or "Complete Order" — not "Continue" or "Submit."

### Error Recovery
- Payment failures: clear error message, form preserves all entered data
- Field errors: inline, specific, helpful ("Please enter a valid email")
- Session timeout: save progress, don't force restart

### Shopify Specifics
- Checkout Extensibility (Plus) for order bumps, trust signals, layout changes
- Shop Pay default for returning Shopify customers
- One-page checkout preferred over multi-step (3-8% higher completion)

---

## LAYER 7: POST-PURCHASE

**Job:** Maximise immediate revenue, begin the retention loop.

### Thank-You Page
Most brands waste this page with "Order confirmed. Thanks!" This is the customer at peak engagement — they just bought. Use it.

**What to put on thank-you page:**
1. One-click post-purchase upsell (no re-entering payment) — 3-8% incremental revenue
2. "How did you hear about us?" survey — fixes attribution gaps for 60-80% of orders
3. SMS opt-in with incentive ("Text us for 10% off next order") — 15-25% capture
4. Referral program intro
5. Social follow prompts
6. Expected delivery timeline

### Review Requests
- Time to DELIVERY, not purchase (7-14 days after delivery)
- Photo review incentive (10% off next order) — increases photo reviews 40-60%
- Branded insert cards with QR code to review page
- Make it one-click easy (link directly to review form, pre-fill order)

### Transactional Email Sequence
1. Order confirmation (immediate)
2. Shipping confirmation with tracking (when shipped)
3. Out for delivery (day of)
4. Delivered (day of delivery)
5. Product education / tips (3-5 days after delivery)
6. Review request (7-14 days after delivery)
7. Cross-sell / replenishment (14-21 days after delivery)

### Unboxing Experience
- Branded packaging (doesn't need to be expensive — a sticker on a mailer bag works)
- Insert card: thank you, QR code to review, referral link, social handles
- Free sample of complementary product (if margin allows)
- Handwritten note for high-AOV orders

### The First 7 Days
The window after purchase determines one-time buyer vs repeat customer. Speed of delivery, unboxing quality, first email sequence = emotional foundation for LTV.

---

## LAYER 8: RETENTION & LTV

**Job:** Turn one-time buyers into repeat customers.

### Core Email Flows

**Welcome Flow (new subscribers, haven't purchased):**
- 5-7 emails over 10-14 days
- Value-first, not discount-first
- Sequence: welcome → brand story → education → social proof → soft CTA → offer → urgency
- First-purchase conversion: 15-25%

**Abandoned Cart Flow:**
- 3 emails: 1hr, 24hr, 72hr
- Email 1: reminder (product image, no discount)
- Email 2: objection handling (reviews, guarantee)
- Email 3: incentive if margin allows (free shipping or small discount)
- Recovery rate: 5-10%

**Browse Abandonment Flow:**
- Triggered 1hr after viewing PDP without ATC
- Show the product, add social proof
- No discount (they haven't shown purchase intent yet)
- Incremental revenue: 1-3% of total

**Post-Purchase Flow:**
- Beyond transactional emails
- Product education, tips, "how to get the most from..."
- Cross-sell at 14-21 days
- Review request

**Win-Back Flow:**
- Trigger: 60-90 days since last purchase
- "We miss you" → incentive → final chance
- Reactivation rate: 3-8% of lapsed customers

**Replenishment Flow (consumables):**
- Timed to product usage cycle
- "Running low on [product]? Reorder now"
- Increases repeat purchase 10-20%

### SMS Strategy
- Reserve for urgency: flash sales, early access, limited stock
- Don't duplicate email content via SMS
- Abandoned cart SMS at 2hr (in addition to email) increases recovery 15-25%
- Always provide opt-out

### Subscription Model
- 10-20% savings vs one-time
- Flexibility is everything: skip, pause, swap, cancel easily
- Rigid subscriptions churn 2-3x faster
- Target: 5-15% of orders as subscriptions

### RFM Segmentation
Segment by Recency, Frequency, Monetary value:
- **Champions** (recent, frequent, high-spend): VIP treatment, early access, exclusive products
- **Loyal** (frequent, moderate-spend): Nurture, cross-sell, loyalty rewards
- **At Risk** (previously frequent, now lapsed): Win-back flow, personal outreach
- **New** (recent first purchase): Post-purchase education, second purchase incentive

### LTV Economics
- Healthy LTV:CAC ratio: 3:1+
- Below 2:1 = unsustainable acquisition
- Track LTV by acquisition cohort (not blended)
- First-to-second purchase is the hardest gap to close

### Loyalty Programs
- Only if relevant for category (consumables, fashion — yes. One-time purchases — no)
- Points-based or tier-based
- Must offer genuine value (not 1% back after £500 spent)
- VIP tiers for top 10% drive 15-25% purchase frequency increase

---

## LAYER 9: OFFER ARCHITECTURE

**Job:** Structure the commercial proposition to maximise CVR, AOV, and margin simultaneously.

### Offer ≠ Product
The same product with different offers converts differently. "£30 moisturiser" vs "£30 moisturiser + free serum sample + free shipping + 30-day guarantee" — same product, completely different proposition.

### Bundles

**Productised bundles** (named, curated): "The Starter Kit", "The Complete Set". Outperform dynamic bundles because they reduce decision fatigue.
- Show per-unit pricing and savings vs individual purchase
- AOV increase: 15-30%

**Tiered bundles:** "Buy 2 save 10%, Buy 3 save 20%". Increases units per order 20-35%.

### Free Shipping Threshold
Set at 20-30% above current AOV. If AOV is £50, threshold at £65. Increases AOV 12-25%.

Show progress bar in cart: "Add £12 more for free shipping."

### Discounting — Rules
- Structured > always-on. Tiered or conditional discounts, not permanent 10% off.
- First-order incentive: time-limited, not permanent code. Don't train discount dependency.
- Dollar-off for items < £50, percentage-off for items > £50 (feels bigger)
- "Free gift with purchase over £X" often outperforms straight discount for premium brands

### Subscription Pricing
- 10-20% savings with cancellation flexibility
- Show per-unit or per-serving pricing
- "Subscribe & save" on PDP as an option, not a separate page

### Offer Consistency
The same offer must be presented at every touchpoint:
Ad → Landing Page → PDP → Cart → Checkout

If the ad says "20% off", the price should be discounted on the PDP, the savings shown in cart, and the discount visible at checkout. Any gap = trust break.

### Order Bumps & Upsells
- Order bump in checkout: < 20% of AOV, checkbox format. 10-25% take rate.
- Post-purchase upsell: one-click, no re-entering payment. 3-8% incremental revenue.
- Cart upsells: max 1-2, relevant, one-click add.

---

## LAYER 10: ANALYTICS & MEASUREMENT

**Job:** Tell you what's actually happening vs what you think is happening.

### The Diagnostic Framework

When conversion drops:
1. **Isolate the layer** — walk the metrics stack, find steepest drop vs benchmark
2. **Check external factors** — traffic mix shift? Seasonality? Competitor launch? Technical break?
3. **Audit the failing layer** — use layer-specific audit questions
4. **Check the layer above** — often the "failing" layer is fine but receiving lower-quality input
5. **Hypothesise, prioritise, test** — ICE score, run in priority order

### Analytics Stack

**Minimum (every brand):**
- GA4 with enhanced ecommerce
- Platform pixels (Meta, Google, TikTok)
- Heatmaps (Microsoft Clarity — free)
- Email platform analytics (Klaviyo)

**Intermediate (scaling brands):**
- Server-side tracking (CAPI for Meta, Enhanced Conversions for Google)
- Post-purchase attribution survey
- A/B testing tool (if >1,000 conversions/month/variant)
- Revenue per session dashboard by source

**Advanced (£1M+ brands):**
- Multi-touch attribution tool
- Cohort analysis by acquisition source
- Incrementality testing
- Customer data platform (CDP)

### A/B Testing Rules
- Minimum: ~1,000 conversions per variant per month
- Run for full weeks (min 2 weeks) to capture day-of-week variation
- 95% statistical significance before calling a winner
- Test one variable at a time
- If you don't have enough traffic for A/B tests, implement high-confidence best practices directly

### Heatmaps & Session Recordings
- Watch 20-30 session recordings per segment before drawing conclusions
- Look for: rage clicks, scroll depth drop-offs, form abandonment, hesitation patterns
- Heatmaps show WHERE attention goes. Recordings show WHY behaviour happens.

### Revenue Per Session — The North Star
Track revenue per session by source as primary KPI. It captures both CVR and AOV in one metric. A source with lower CVR but higher AOV might be your most profitable channel.

### Key Warnings
- Klaviyo's revenue attribution is generous (5-day click, 24-hour open window). Look at incrementality.
- GA4 miscategorises traffic as "direct" when source is unknown (dark social, untagged links).
- Blended CVR is a lie — always segment by source.
- "Sessions are up but revenue is flat" = usually a traffic mix shift, not a site problem.

---

## MASTER AUDIT CHECKLIST — EVERY LAYER

Score 1-5 per item. Layer average below 3.0 = priority target.

### Traffic (10 items)
1. Traffic segmented by source in analytics?
2. CVR benchmarked separately by source?
3. Audience temperature in landing page strategy?
4. Consistent UTM naming convention?
5. Traffic mix matches business goals?
6. Quality measured beyond volume?
7. Dedicated LP strategy for paid vs organic?
8. High-bounce sources identified and fixed/cut?
9. Brand vs non-brand search tracked separately?
10. Paid media + CRO team aligned on LP requirements?

### Ad Creative (10 items)
1. Clear hook in first 3 seconds?
2. Message-market match between ads and LPs?
3. Multiple formats tested (static, video, UGC, carousel)?
4. Offer consistent between ad and site?
5. Creative refresh cadence (every 2-4 weeks)?
6. Different creatives for prospecting vs retargeting?
7. CTR evaluated alongside downstream CVR?
8. Winning patterns iterated on?
9. UGC used for cold traffic?
10. Ads communicate value prop, not just product?

### Landing Page (15 items)
1. Hero passes 5-second test?
2. Specific benefit headline above fold?
3. Primary CTA visible above fold?
4. Social proof above fold?
5. Value prop differentiated from competitors?
6. Navigation simple, oriented toward product discovery?
7. Works on mobile?
8. Page speed < 2.5s LCP?
9. Paid traffic LP matches ad message/imagery/offer?
10. Clear path from LP to product pages?
11. Content blocks below fold build the case?
12. Storytelling arc logical (Problem → Solution → Proof → CTA)?
13. Exit intent / email capture?
14. Returning visitors: quick access to previous products?
15. Search functionality prominent?

### PDP (18 items)
1. Above-fold block complete on mobile?
2. 4-6 images, including lifestyle?
3. Reviews near ATC?
4. ATC button high-contrast, full-width mobile?
5. Pricing clear with anchoring?
6. Description benefit-focused?
7. Description scannable (bullets, icons, expandable)?
8. Variant selectors visual (swatches, not dropdowns)?
9. Money-back guarantee on PDP?
10. Trust signals present?
11. Sticky mobile CTA?
12. Upsells/cross-sells below fold?
13. FAQ addressing common objections?
14. Photo reviews with filters?
15. Urgency/scarcity ethical (real, not fake)?
16. Subscription option if applicable?
17. Fast load < 2.5s?
18. No horizontal scrolling on mobile?

### Cart (14 items)
1. Right format (drawer vs full-page)?
2. Product details clearly displayed?
3. Order total visible without scrolling?
4. No surprise costs?
5. Sticky checkout CTA on mobile?
6. Express checkout available and prominent?
7. Free shipping progress bar?
8. Upsells limited (1-2), relevant, one-click?
9. Upsells don't push CTA below fold?
10. Promo field hidden behind link?
11. Trust signals near checkout CTA?
12. Fast loading (< 1s)?
13. Delivery estimate shown?
14. Tap targets 44x44px minimum?

### Checkout (15 items)
1. Guest checkout available?
2. Minimum fields?
3. Express checkout prominent above form?
4. BNPL available for orders > £50?
5. Autofill + address validation?
6. Progress indicator?
7. Order bump between shipping and payment?
8. Trust signals near pay button?
9. Shipping cost consistent with cart?
10. Billing same as shipping defaulted?
11. Inline error messages?
12. Mobile fields properly sized, correct keyboards?
13. Order summary visible throughout?
14. Pay button clear ("Pay £X")?
15. Payment failure preserves form data?

### Post-Purchase (10 items)
1. Thank-you page does more than confirm?
2. Post-purchase upsell (one-click)?
3. Attribution survey ("How did you hear about us?")?
4. Transactional emails set up?
5. Review request timed to delivery?
6. Photo review incentive?
7. Unboxing experience considered?
8. Post-purchase email beyond transactional?
9. Delivery expectations met?
10. Referral program introduced?

### Retention (12 items)
1. Welcome email flow (4-7 emails)?
2. Abandoned cart flow (3 emails)?
3. Browse abandonment flow?
4. Post-purchase flow beyond transactional?
5. Win-back flow (60-90 day trigger)?
6. SMS used strategically?
7. Email segmented by RFM?
8. Repeat purchase rate tracked by cohort?
9. Subscription with flexibility (skip/pause/swap)?
10. LTV:CAC > 3:1?
11. Loyalty/rewards program if relevant?
12. Email list cleaned (sunset unengaged)?

### Offer Architecture (10 items)
1. Clear "hero offer" (not just a product)?
2. Bundles with savings shown?
3. Free shipping threshold set right?
4. Discounts structured, not always-on?
5. Subscription pricing compelling with flexibility?
6. Offers consistent across all touchpoints?
7. First-order incentive without discount dependency?
8. Seasonal promotions planned in advance?
9. Offer designed to maximise rev/session?
10. Order bumps priced right relative to main purchase?

### Analytics (12 items)
1. Full funnel metrics stack tracked?
2. CVR segmented by source?
3. Server-side tracking (CAPI)?
4. Revenue per session as primary KPI?
5. Heatmap/recording tool installed?
6. A/B tests with proper sample size?
7. Cohort analysis used?
8. Regular analytics review cadence (weekly)?
9. LTV tracked by acquisition cohort?
10. GA4 enhanced ecommerce configured?
11. Attribution beyond last-click?
12. Page speed monitored (Core Web Vitals)?

---

## TOP 10 TESTS BY ICE SCORE

| # | Test | ICE | Layer |
|---|------|-----|-------|
| 1 | Replace generic hero headline with benefit-driven headline | 25 | Landing Page |
| 2 | Add CTA button in hero section above fold | 25 | Landing Page |
| 3 | Move review count + stars above fold near ATC | 25 | PDP |
| 4 | Add free shipping progress bar to cart | 25 | Cart |
| 5 | Enable guest checkout | 25 | Checkout |
| 6 | Implement 3-email abandoned cart flow | 25 | Retention |
| 7 | Set free shipping threshold 20-30% above AOV | 24 | Offers |
| 8 | Add sticky ATC button on mobile | 24 | PDP |
| 9 | Add compare-at price with savings callout | 24 | PDP |
| 10 | Add Apple Pay / Shop Pay express checkout | 24 | Cart |

---

## KEY TERMS

**CVR** — Purchase / sessions. 1.5-3.5% cold, 3-6% warm, 8-15% email.
**AOV** — Revenue / orders.
**RPS** — Revenue / sessions. Best single metric.
**ATC rate** — Add to cart / PDP views. Benchmark 8-12%.
**LTV** — Total revenue per customer over lifetime. Track by cohort.
**CAC** — All-in cost to acquire one customer.
**ROAS** — Revenue per £1 ad spend.
**MER** — Total revenue / total marketing spend. More honest than ROAS.
**ICE** — Impact x Confidence x Ease. Each 1-10. Prioritisation framework.
**RFM** — Recency, Frequency, Monetary. Customer segmentation.
**CAPI** — Server-side tracking. Essential post-iOS 14.5.
**LCP** — Largest Contentful Paint. Page speed. Target < 2.5s.
**CLS** — Cumulative Layout Shift. Target < 0.1.
**BNPL** — Buy now pay later. +10-20% CVR for orders > £50.
**UGC** — User-generated content. Most trusted for cold traffic.
**Shop Pay** — Shopify's express checkout. 1.7x better than standard.

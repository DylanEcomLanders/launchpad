# Conversion Matrix — The Diagnostic Engine

## Overview

The Conversion Matrix is the diagnostic tool that powers everything. It scores a brand's post-click experience across every funnel layer, identifies revenue leaks, and generates the data that sells the partnership and prioritises the roadmap.

It serves two purposes:
1. **Sales tool** — Generates the revenue gap data for the two-stage close
2. **Delivery tool** — Prioritises what to fix first in the roadmap

## The Proof vs Evidence Framework

This distinction is critical to how we use the matrix:

- **Evidence** = what we observe from the outside (Stage 1 audit, public data)
- **Proof** = what the data confirms with backend access (Stage 2 audit, real analytics)

Stage 1 gives evidence. Stage 2 gives proof. Both feed into the matrix, but proof is what closes the deal.

When presenting to a prospect:
- "Based on what we can see publicly, your landing pages are scoring a 4/10" = evidence
- "Your GA4 shows a 68% bounce rate on mobile PDPs and a 1.2% site-wide CVR against a 3.1% category benchmark" = proof

## How It Works

Score each funnel layer 1-10 based on the criteria below. Layers scoring below 6 are "leaking" — those get prioritised in the roadmap.

### Revenue Projection From Scores

Once scored, calculate the revenue impact:

```
Monthly Traffic × Current CVR = Current Monthly Conversions
Monthly Traffic × Benchmark CVR = Potential Monthly Conversions
(Potential - Current) × AOV = Monthly Revenue Gap
```

Then layer in ad spend context:
```
Monthly Ad Spend ÷ Current Conversions = Current CPA
Monthly Ad Spend ÷ Potential Conversions = Potential CPA
Current CPA - Potential CPA = CPA Savings Per Acquisition
```

**Frame it to the client:** "You're spending £50K/mo on ads generating 150,000 sessions. At your current 1.8% CVR you get 2,700 orders. At the benchmark 3.2% you'd get 4,800 orders. That's 2,100 extra orders × £55 AOV = **£115,500/mo you're missing.** And your CPA drops from £18.50 to £10.40."

---

## Scoring Criteria

### Layer 1: Traffic Quality (1-10)
- Traffic source diversity (not 100% dependent on one channel)
- Audience-message match (are the right people arriving?)
- Device split health (what % is mobile? Is the mobile experience matching?)
- Bounce rate by source (are paid visitors actually engaging?)
- Session quality (pages per session, time on site)

### Layer 2: Ad-to-Page Alignment (1-10)
- Does the landing page match the ad message? (scent trail)
- Headline, imagery, and offer consistency from ad → page
- Are they using dedicated post-click pages or generic collection/homepage?
- Does the page speak to the audience segment the ad targeted?
- Are they running different pages for different audiences/campaigns?

### Layer 3: Landing Page / Homepage (1-10)
- Clear value proposition above fold (can you tell what they sell in 3 seconds?)
- Social proof visible without scrolling (reviews, press, numbers)
- Single clear CTA path (not 10 competing links)
- Page load speed (< 3s on mobile)
- Mobile experience (not just responsive — actually designed for mobile)
- Copy quality (benefits > features, objections addressed)

### Layer 4: Product Detail Page (1-10)
- Product imagery quality and quantity (lifestyle + detail + scale)
- Reviews and social proof (volume, recency, quality)
- Clear pricing and offer structure (discounts, bundles visible)
- Add-to-cart visibility and friction (is the button above fold on mobile?)
- Cross-sell / upsell presence (complementary products, bundles)
- Trust signals (guarantees, returns policy, shipping info, security badges)
- Product description quality (story, benefits, ingredients/specs)

### Layer 5: Cart Experience (1-10)
- Cart-to-checkout rate (benchmark: 55-65%)
- Upsell/cross-sell opportunities in cart
- Trust signals present (secure checkout, returns, shipping)
- Free shipping threshold and progress bar
- Cart abandonment recovery (exit intent, email/SMS capture)
- Friction points (forced account creation, unexpected costs)

### Layer 6: Checkout (1-10)
- Checkout conversion rate (benchmark: 45-55%)
- Express checkout options (Shop Pay, Apple Pay, Google Pay)
- Trust badges and security signals
- Form field optimisation (minimal fields, autofill friendly)
- Shipping options and transparency
- Post-purchase upsell (one-click upsell after checkout)

### Layer 7: Post-Purchase Experience (1-10)
- Order confirmation page (upsell opportunity or dead end?)
- Thank you page design (cross-sell, referral, social sharing)
- Post-purchase email flow (confirmation, shipping, review request, replenishment)
- Unboxing experience (does it drive social sharing or reviews?)
- Post-purchase one-click upsell conversion rate

### Layer 8: Retention & LTV (1-10)
- Email/SMS capture rate on site
- Repeat purchase rate
- Subscription offering (if applicable for consumable products)
- Loyalty / rewards programme
- Win-back flow (for lapsed customers)
- Customer segmentation (VIP treatment for high-value customers)

---

## Interpreting Results

| Average Score | Verdict | Action |
|--------------|---------|--------|
| **7+** | Strong post-click. Limited room for improvement. | Hard to justify full partnership unless 1-2 specific layers are critically weak. Consider a project-based engagement. |
| **5-7** | Good opportunity. Clear improvement path. | **Ideal partnership client.** Multiple levers to pull, enough traffic to test, clear ROI path. |
| **Below 5** | Significant gaps across the funnel. | High impact potential but may need foundational work first. Great partnership candidate if they have the traffic and budget. |

## Quick-Score Cheat Sheet

For the Stage 1 audit (public data only), you can estimate scores quickly:

| Layer | Quick Check | How to Score Without Analytics |
|-------|-------------|-------------------------------|
| Traffic | SimilarWeb traffic estimate | High traffic = likely decent quality |
| Ad-to-Page | Click their ads, check the landing page | Match or mismatch? |
| Landing/Home | Visit the site, check above fold | Value prop clear in 3 seconds? |
| PDP | Check top product pages | Reviews? Trust signals? CTA visible? |
| Cart | Add to cart, check experience | Upsells? Friction? Threshold? |
| Checkout | Start checkout (don't complete) | Express checkout? Form fields? |
| Post-Purchase | Can't check without buying | Assume 4/10 unless they have reviews/referral visible |
| Retention | Check for email popup, loyalty page | Popup present? Programme visible? |

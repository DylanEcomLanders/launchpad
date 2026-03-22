/* ── CRO Audit Knowledge Base ──
 * Editable framework that feeds into every audit.
 * Stored in Supabase business_settings under 'audit_knowledge_base'.
 * Update via Settings page or directly here for defaults.
 */

export const DEFAULT_AUDIT_KNOWLEDGE = `
## CRO Audit Framework — Ecomlanders

### Scoring Areas (rate each: strong / average / weak)

1. **Hero Section & Above the Fold**
   - Does the hero communicate who this is for and what problem it solves?
   - Is there a clear outcome-driven headline (not product-focused)?
   - Single primary CTA visible without scrolling?
   - Social proof element visible (stars, review count, "as seen in")?
   - Risk reversal mentioned (guarantee, free shipping)?

2. **Value Proposition Clarity**
   - Can a cold visitor understand the brand's differentiator in 5 seconds?
   - Is the USP communicated, not just implied?
   - Does the sub-headline support the main headline?
   - Is the brand positioned against competitors (even implicitly)?

3. **CTA Strategy**
   - Is there ONE clear primary CTA per section?
   - Does the CTA communicate value (not just "Shop Now")?
   - Is there CTA hierarchy (primary vs secondary)?
   - No competing CTAs with equal visual weight?
   - Do CTAs appear at natural decision points?

4. **Social Proof Placement & Quality**
   - Are reviews/ratings visible within first scroll?
   - Specific numbers used (not "customers love us")?
   - Real customer quotes with specifics?
   - Third-party validation (press, certifications, retail partners)?
   - Review count + star rating near purchase areas?

5. **Navigation & Information Architecture**
   - Is navigation simple and focused (3-5 top-level items)?
   - Does it guide rather than overwhelm?
   - Can a cold visitor find what they need in 2 clicks?
   - Is there a search function that works?

6. **Product Discovery**
   - Can visitors find the right product for their need?
   - Are products categorised by use case / problem, not just type?
   - Is there a recommendation mechanism?
   - Are bestsellers/most popular items highlighted?

7. **Brand Differentiation**
   - What makes this brand different from Amazon alternatives?
   - Is the brand story told effectively?
   - Is there an emotional connection point?
   - Does the page communicate why this brand exists?

8. **Trust Signals**
   - Named certifications (not generic badges)?
   - Guarantee with specific terms visible?
   - Real team/founder story?
   - Secure checkout indicators near purchase?
   - Return policy clearly stated?

### Issue Severity Guide

**CRITICAL** — Conversion killers. These actively prevent purchases:
- No clear CTA above the fold
- Competing CTAs causing decision paralysis
- Hero selling a promotion not the brand value
- No social proof visible in first scroll
- Value proposition completely absent

**HIGH** — Significant conversion impact:
- Social proof buried too far down
- Navigation overwhelming cold visitors
- Key differentiator hidden (best angle not surfaced)
- AI/stock imagery breaking trust in authenticity-driven category
- No email/SMS capture mechanism

**QUICK WIN** — Easy fixes with immediate impact:
- Missing trust strip below hero
- Generic CTA copy ("Shop Now" → value-driven)
- Email capture with no incentive
- Missing "As Seen In" strip
- Announcement bar not utilised

### Writing Style

- Be genuine — acknowledge what's good about the brand
- Be specific — reference exact elements on their page (actual text, actual buttons)
- Be structural — these are architectural issues, not cosmetic tweaks
- Be professional — this goes directly to the brand owner
- British English throughout
- No marketing speak, no buzzwords, no fluff
- Each issue must be genuinely actionable
- "What This Audit Is Not Saying" section must respect the brand

### What Makes a Good Audit

A good audit:
- Identifies 5-10 genuine issues (not manufactured problems)
- Prioritises by conversion impact
- Gives specific, actionable fixes (not "improve your CTA")
- Acknowledges brand strengths honestly
- References actual page elements the prospect can verify
- Ends with a clear next step

A bad audit:
- Lists generic CRO advice that applies to any site
- Gives vague suggestions ("consider A/B testing")
- Over-criticises without acknowledging strengths
- Focuses on cosmetics (button colours, font sizes)
- Reads like a template with the brand name swapped in
`;

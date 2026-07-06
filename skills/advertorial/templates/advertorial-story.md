# Advertorial - story / discovery format

The engine's IP. Starter version - the annotated Jobs and Rules below are what
make output good; grow them from real bin reasons during dial-in and bump
VERSION each time. The three compliance gates are hard-coded and non-negotiable.

## Shape

An editorial discovery story: a real person with the reader's problem tries the
usual things, hits a wall, discovers the mechanism, and the mechanism resolves
it. It reads like a magazine feature, not an ad. It ends on the offer.

Sections, in order:
1. **Hook** - continues the ad scent, names the problem the reader feels.
2. **The wall** - why the usual fixes fail (sets up the mechanism as the gap).
3. **The discovery** - the product mechanism, explained plainly.
4. **The proof** - a verified review, woven in, not stacked.
5. **The turn** - what changed, in the person's words (verified quote).
6. **The offer** - price, guarantee, single CTA.

## Jobs (what each section must do)

- **Hook**: continue the exact promise of the ad. If the ad said "still awake at
  2am", the headline lives in that moment. Never open with the brand.
- **The wall**: make the reader feel understood before selling. One reason, told
  well, beats three listed.
- **The discovery**: explain the mechanism so a smart friend would nod. Concrete
  over clever. This is where the product earns the claim - but only claims on
  the fence.
- **The proof**: one verified review, in context. Never a testimonial wall.
- **The turn**: the emotional payoff, in the customer's real words.
- **The offer**: calm and specific. Price, anchor, guarantee, one button.

## Rules (hard)

- One idea per section. If a section carries two, split or cut.
- The headline must continue the ad scent. Mismatch = bin.
- Every claim must map to an entry on the approved-claims list. No new claims,
  no strengthening ("supports focus" may not become "rewires your brain").
- Verified quotes only, verbatim, with source. Never invent or attribute.
- Sentence case in body prose; the client's voice, not ours.
- No urgency devices unless `urgency_real` is true.
- No fake scarcity, no invented statistics, no "studies show" without a source
  on the fence.

## Compliance gates (hard-coded - enforced by the pass-2 check)

1. **Ingestible** - no claim to treat, cure, prevent, or diagnose. Structure /
   function language only, and only if on the approved list. Disclaimer
   required.
2. **Wellness claims** - every wellness claim maps to an approved claim at the
   same strength or weaker. Any escalation is a violation.
3. **Paid-social imagery** - no before/after, no body-transformation framing, no
   implied medical result in the hero or inline imagery direction.

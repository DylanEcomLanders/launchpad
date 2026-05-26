---
title: Testing framework
section: Delivery
subsection: Strategy (CRO)
order: 634
---

How we run tests. No hypothesis, no test. No data, no test. No traffic, no test. The methodology exists to keep us honest about what's actually moving the needle and what's noise.

## Hypothesis format

Every test starts with a written hypothesis. The structure is fixed.

```
IF we [make this specific change],
THEN [this metric] will [increase/decrease] by [estimated amount],
BECAUSE [evidence or reasoning supporting the prediction].
```

**Good:**

```
IF we replace the text-only hero with a hero featuring a product lifestyle image,
THEN the hero CTA click-through rate will increase by 10-20%,
BECAUSE session recordings show 60% of users bounce within 3 seconds,
and the current hero lacks visual engagement.
```

**Bad:**

```
Let's try a new hero image and see if it works.
```

The hypothesis forces you to define what you're changing, what metric matters, and why you believe it will work. Prevents "let's just try stuff."

## Test prioritisation: ICE

Score every test idea on three dimensions, each 1-10.

| Factor | Definition |
| --- | --- |
| **I**mpact | How much will this move the needle if it wins? |
| **C**onfidence | How confident, based on data not gut, that it will win? |
| **E**ase | How easy / fast to implement? |

**ICE Score = (I + C + E) / 3**

### Example

| Test idea | Impact | Confidence | Ease | ICE |
| --- | --- | --- | --- | --- |
| New hero headline focused on benefit | 8 | 7 | 9 | 8.0 |
| Add video testimonials above fold | 9 | 6 | 4 | 6.3 |
| Change CTA colour grey to green | 4 | 3 | 10 | 5.7 |
| Redesign product comparison section | 8 | 5 | 3 | 5.3 |

> **Always run the highest-ICE test first.** Resist starting with what's "interesting." Start with what's most likely to produce results quickly.

## Sample size

You need enough traffic to reach statistical significance.

| Monthly page sessions | Can you run A/B tests? |
| --- | --- |
| Under 1,000 | No. Make evidence-based changes directly. |
| 1,000 - 5,000 | Yes, but only big changes. Not button colour. |
| 5,000 - 20,000 | Yes, can test moderate changes. |
| 20,000+ | Yes, can test granular changes. |

Target **95% confidence** before calling a winner. Use a sample size calculator before starting (Google "AB test sample size calculator"). Input: baseline CVR, minimum detectable effect (MDE), confidence level. MDE has to be realistic — if your CVR is 3%, detecting a 0.1% change needs enormous traffic.

**Common trap:** Running a test for 3 days, seeing one variant "winning" by 15%, calling it. That's not significance. That's noise. Let it run for the calculated duration.

## Duration

- **7 days minimum** — at least one full business week to capture day-of-week variation
- **14 days recommended** for most tests
- **Never longer than 8 weeks** — if not significant by then, the effect is too small to matter

### Stop early when

- The variant is clearly harming performance (40% drop with significance) — stop immediately
- Technical issues are causing data quality problems
- External factors invalidate the test (major sale, viral event, site outage)

### Don't stop early when

- One variant looks like it's winning but hasn't hit 95% confidence
- It's only been 3 days
- The client is impatient
- You "feel" like it's working

## Documenting results

Every test gets documented, win lose or inconclusive.

```
## Test: [Name]
**Date:** [Start] to [End]
**Page:** [URL]
**Hypothesis:** IF... THEN... BECAUSE...

### Variants
- Control: [Description]
- Variant B: [Description]

### Results
| Metric | Control | Variant B | Lift | Confidence |
| --- | --- | --- | --- | --- |
| CVR | X% | Y% | +Z% | 95%+ |
| ATC Rate | X% | Y% | +Z% | 93% |

### Winner: [Control / Variant B / Inconclusive]

### Key learnings
- [What did we learn about the audience?]
- [What does this suggest for future tests?]

### Next steps
- [Implement winning variant / Run follow-up / Investigate further]
```

Test log lives per client, stored in the project folder in Launchpad. Every test, every result, every learning. Builds the knowledge base over time.

## When NOT to test

Not everything needs an A/B.

### Just fix it

- Broken functionality (fix the bug, don't test "with bug vs without")
- Obvious UX problems (text unreadable, CTA hidden, forms broken)
- Page speed issues (optimise, don't test fast vs slow)
- Accessibility failures (add alt text, fix contrast — not optional)
- Best practices clearly missing (no social proof at all, no CTA above fold)

### Not enough traffic

Under 1,000 sessions/month: don't waste time on A/B setup. Instead make evidence-based changes (audit, heatmap, sessions), measure before-and-after across 30-day periods, document. Less rigorous but better than testing on insufficient data.

### The change is too small

If you're debating whether the CTA should be "Shop Now" or "Shop Today," and everything else about the page is mediocre, you're optimising the wrong thing. Fix the big problems first. Test nuances later when the fundamentals are solid.

> **Testing is a tool, not a religion.** The goal is to improve conversion rates, not to test for the sake of testing. If the evidence clearly points to a change, make the change. Save A/B testing for genuine uncertainties where the data could go either way.

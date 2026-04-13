# Testing & Experimentation Framework

## Hypothesis Format

Every test must start with a written hypothesis. No hypothesis, no test.

### Structure: IF / THEN / BECAUSE

```
IF we [make this specific change],
THEN [this metric] will [increase/decrease] by [estimated amount],
BECAUSE [evidence or reasoning supporting the prediction].
```

### Examples

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

The hypothesis forces you to define what you're changing, what metric matters, and why you believe it will work. This prevents random "let's try stuff" testing.

## Test Prioritisation (ICE Scoring)

Score every test idea on three dimensions, each 1-10:

| Factor | Definition |
|--------|-----------|
| **I**mpact | How much will this move the needle if it wins? |
| **C**onfidence | How confident are you it will win (based on data, not gut)? |
| **E**ase | How easy/fast is this to implement? |

**ICE Score = (I + C + E) / 3**

### Example Prioritisation

| Test Idea | Impact | Confidence | Ease | ICE Score |
|-----------|--------|-----------|------|-----------|
| New hero headline focused on benefit | 8 | 7 | 9 | 8.0 |
| Add video testimonials above fold | 9 | 6 | 4 | 6.3 |
| Change CTA colour from grey to green | 4 | 3 | 10 | 5.7 |
| Redesign product comparison section | 8 | 5 | 3 | 5.3 |

> **Always run the highest ICE-scored test first.** Resist the temptation to start with what's "interesting" — start with what's most likely to produce results quickly.

## Sample Size Requirements

### Minimum Traffic Thresholds
You need enough traffic to reach statistical significance. Running tests on low-traffic pages produces unreliable results.

| Monthly Page Sessions | Can You Run A/B Tests? |
|----------------------|----------------------|
| Under 1,000 | No — make evidence-based changes directly |
| 1,000 - 5,000 | Yes, but only test big changes (not button colour) |
| 5,000 - 20,000 | Yes, can test moderate changes |
| 20,000+ | Yes, can test granular changes |

### Statistical Significance
- Target **95% confidence level** before calling a winner
- Use a sample size calculator before starting (Google "AB test sample size calculator")
- Input: baseline CVR, minimum detectable effect (MDE), confidence level
- The MDE should be realistic — if your CVR is 3%, detecting a 0.1% change requires enormous traffic

### Common Trap
Running a test for 3 days, seeing one variant "winning" by 15%, and calling it. That's not statistical significance — that's noise. Let the test run for the calculated duration, no matter how promising early results look.

## Test Duration Guidelines

### Minimum Duration
- **7 days minimum** — always run a test for at least one full business week to capture day-of-week variation
- **14 days recommended** for most tests
- **Never run longer than 8 weeks** — if you haven't reached significance by then, the effect is too small to matter

### When to Stop a Test Early
- **The variant is clearly harming performance** (e.g., 40% drop in CVR with statistical significance) — stop immediately
- **Technical issues** are causing data quality problems
- **External factors** have invalidated the test (major sale, viral event, site outage)

### When NOT to Stop a Test Early
- One variant looks like it's winning but hasn't reached 95% confidence
- It's only been 3 days
- The client is impatient and wants results
- You "feel" like it's working

## Documenting Results

Every test gets documented, whether it wins, loses, or is inconclusive.

### Test Documentation Template

```
## Test: [Name]
**Date:** [Start] to [End]
**Page:** [URL]
**Hypothesis:** IF... THEN... BECAUSE...

### Variants
- Control: [Description]
- Variant B: [Description]
- [Variant C if applicable]

### Results
| Metric | Control | Variant B | Lift | Confidence |
|--------|---------|-----------|------|-----------|
| CVR | X% | Y% | +Z% | 95%+ |
| ATC Rate | X% | Y% | +Z% | 93% |

### Winner: [Control / Variant B / Inconclusive]

### Key Learnings
- [What did we learn about the audience?]
- [What does this suggest for future tests?]

### Next Steps
- [Implement winning variant / Run follow-up test / Investigate further]
```

### Where to Store Test Docs
Keep a running test log per client. Store it in the project folder in Launchpad. Every test, every result, every learning — documented. This builds an invaluable knowledge base over time.

## When NOT to Test

Not everything needs an A/B test. Sometimes you just fix things.

### Don't Test — Just Fix
- **Broken functionality** (fix the bug, don't test "with bug vs. without bug")
- **Obvious UX problems** (text is unreadable, CTA is hidden, forms don't work)
- **Page speed issues** (optimise the images, don't test fast vs. slow)
- **Accessibility failures** (add alt text, fix contrast — these aren't optional)
- **Best practices you're clearly missing** (no social proof at all, no CTA above fold)

### Don't Test — Not Enough Traffic
If the page gets under 1,000 sessions/month, don't waste time setting up A/B tests. Instead:
1. Make evidence-based changes (audit findings, heatmap data, session recordings)
2. Measure before and after (compare 30-day periods)
3. Document what changed and the result
4. This isn't as rigorous as A/B testing, but it's better than testing with insufficient data

### Don't Test — The Change Is Too Small
If you're debating whether the CTA should be "Shop Now" or "Shop Today", and everything else about the page is mediocre, you're optimising the wrong thing. Fix the big problems first. Test nuances later when the fundamentals are solid.

> **Testing is a tool, not a religion.** The goal is to improve conversion rates, not to test for the sake of testing. If the evidence clearly points to a change, make the change. Save A/B testing for genuine uncertainties where the data could go either way.

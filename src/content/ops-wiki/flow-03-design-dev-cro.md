# Flow: Design, Development & CRO

## When This Flow Applies

Same as Design & Development, plus a CRO component — the page is being built to test a specific hypothesis. There's a testing methodology, a baseline to beat, and a measurement plan.

**Examples:** Landing page A/B test, PDP redesign with conversion hypothesis, checkout optimisation with measurement, funnel rebuild with before/after tracking.

**Typical value:** £4,000–£10,000 per project

---

## The Assembly Line

```
INBOX → CRO Research & Hypothesis → Design Brief → Design → Client Review → 🚧 DESIGN→DEV HANDOFF → Build → 🚧 DEV SELF-QA → Internal QA → 🚧 LAUNCH PREP (test method confirmed) → Go-Live & Test → Measure & Report → Complete
```

---

## Stage 1: CRO Research & Hypothesis

**Owner:** Strategist / Lead (not the designer — the person with CRO context)

This is the stage that separates D&D+CRO from plain D&D. Before anyone designs anything, we need to know what we're testing and why.

**Actions:**
- Pull current page performance data (CVR, bounce rate, scroll depth, heatmap)
- Identify the specific conversion leak this build is addressing
- Score the relevant conversion matrix layers
- Write the hypothesis:

```
IF we [specific change]
THEN we expect [metric] to [direction] by [range]
BECAUSE [evidence from data/research]
```

- Define the test method: A/B split, before/after, or multivariate
- Calculate required sample size and estimated test duration
- Identify the control (what exists now) and the variant (what we're building)
- Set the success metric and minimum detectable effect

> **Reference:** [CRO Audit Process](/tools/ops-wiki?section=06-audit-process) for audit methodology and [Testing & Experimentation Framework](/tools/ops-wiki?section=07-testing-framework) for hypothesis structure and test planning.

**Output:** CRO brief with hypothesis, test method, success metric, and estimated duration.

**Exit criteria:** CRO brief reviewed and approved by lead. The hypothesis is specific and measurable — not "we think this will convert better."

---

## Stage 2: Design Brief

**Owner:** Strategist → Designer

Translate the CRO hypothesis into a design brief. The brief tells the designer what to build and why — grounded in the data, not guesswork.

**Actions:**
- Section-by-section breakdown with CRO rationale for each section
- Audience definition (who sees this page, what stage of awareness)
- Messaging hierarchy (what's the #1 message, #2, #3)
- Social proof strategy (what type, where placed)
- CTA strategy (primary action, secondary action)
- Reference screenshots (competitors, inspirations, past winners)

> **Reference:** [Design Process & Workflow](/tools/ops-wiki?section=00-design-process)

**Output:** Design brief with CRO rationale embedded in each section.

---

## Stage 3: Design

**Owner:** Designer

Same as D&D flow, but every design decision should connect back to the hypothesis. The designer isn't just making it look good — they're building a conversion argument.

**Actions:**
- Desktop + mobile design
- All copy finalised (CRO-informed copy, not generic)
- Social proof placement per brief
- CTA hierarchy clear
- Hover/interaction states
- Annotations including CRO notes ("this section addresses objection X")

> **Reference:** [Figma Workflow & File Structure](/tools/ops-wiki?section=01-figma-workflow)

---

## Stage 4: Client Review

**Owner:** PM

Same process as D&D. Present with CRO context: "We designed this section because your data shows X, and we're testing whether Y changes the outcome."

---

## 🚧 Gate 1: Design → Dev Handoff

**Identical to D&D flow.** Same checklist, same standards, same hard stop.

> **Reference:** [Design to Dev Handoff](/tools/ops-wiki?section=02-handoff)

---

## Stage 5: Build

**Owner:** Developer

Same as D&D, plus:
- A/B test infrastructure setup (if split testing — Google Optimize, VWO, Convert, or Shopify native)
- Test variant and control correctly configured
- Tracking events implemented (custom GA4 events for the success metric)
- UTM parameters configured if test is traffic-source specific

> **Reference:** [Build Process & Standards](/tools/ops-wiki?section=03-build-process) and [Shopify Development Workflow](/tools/ops-wiki?section=04-shopify-workflow)

---

## 🚧 Gate 2: Dev Self-QA

**Identical to D&D flow,** plus:
- [ ] A/B test is serving correctly (both variants load, split is working)
- [ ] Tracking events fire on the success metric action
- [ ] Test is not leaking (control visitors don't see variant and vice versa)
- [ ] Analytics is recording test variant as a dimension

> **Reference:** [QA Checklist & Browser Testing](/tools/ops-wiki?section=12-qa-checklist)

---

## Stage 6: Internal QA

**Owner:** PM or QA lead

Same as D&D, plus test-specific checks:
- Verify test is splitting traffic correctly
- Confirm tracking fires on both variants
- Check that test doesn't break anything on the rest of the site

---

## 🚧 Gate 3: Launch Prep — Test Method Confirmed

**Hard stop.** This gate is stricter than D&D because a badly launched test corrupts data and wastes the entire project.

**Launch prep checklist (all D&D items plus):**
- [ ] Test method confirmed and documented (A/B, before/after, etc.)
- [ ] Traffic allocation set (50/50 split for A/B, or 100% for before/after)
- [ ] Test duration calculated (minimum 2 weeks or 1,000 visitors per variant)
- [ ] Statistical significance threshold agreed (95% standard)
- [ ] Baseline metrics recorded (current CVR, ATC rate, bounce rate for the page)
- [ ] Success metric confirmed and trackable
- [ ] Client understands the test will run for [X] weeks — no pulling it early
- [ ] Test monitoring plan in place (who checks daily, what triggers an emergency stop)

> **Reference:** [Deployment & Go-Live Checklist](/tools/ops-wiki?section=05-deployment) and [Testing & Experimentation Framework](/tools/ops-wiki?section=07-testing-framework)

---

## Stage 7: Go-Live & Test

**Owner:** Developer (launch), Strategist (monitoring)

**Actions:**
- Launch test at agreed time
- Verify test is running correctly on day 1 (check split, check tracking)
- Monitor daily for the first week (any crashes, rendering issues, data anomalies)
- Do NOT call the test early — let it reach statistical significance
- Weekly check-in with client: "Test is running, here's where we're at" (without declaring a winner)

---

## Stage 8: Measure & Report

**Owner:** Strategist

**Actions:**
- Wait for statistical significance (minimum 95% confidence)
- Pull final results: CVR, ATC rate, bounce rate, scroll depth for both variants
- Calculate revenue impact of the winning variant
- Write test report:
  - Hypothesis (what we tested)
  - Result (which variant won, by how much)
  - Statistical significance (confidence level)
  - Revenue impact (projected monthly impact)
  - Learnings (what we learned for the next test)
  - Next step (iterate on winner, test next hypothesis, or ship as-is)
- Present results to client

> **Reference:** [Reporting & Analytics](/tools/ops-wiki?section=08-reporting)

**Output:** Test report delivered to client via portal and Slack.

---

## Stage 9: Complete

**Actions:**
- Implement winning variant as permanent (if A/B) or confirm before/after results
- Remove test infrastructure
- Close project in portal
- Invoice final payment
- Add results to case study pipeline
- Feed learnings into next project hypothesis (if ongoing relationship)

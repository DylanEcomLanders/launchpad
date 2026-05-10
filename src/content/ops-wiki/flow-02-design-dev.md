# Flow: Page Build

## When This Flow Applies

The most common project type. Client is buying a full page build — we design it, we build it, we launch it.

**Examples:** Landing page build, homepage redesign, PDP template redesign, collection page build.

> **Optional CRO layer:** if the page is being built to test a specific hypothesis (A/B, before/after), layer in the CRO additions — see [Optional: CRO Test Layer](#optional-cro-test-layer) at the end of this doc for the extra stages and gate items.

---

## The Assembly Line

```
INBOX → Research & Brief → Design → Client Review → 🚧 DESIGN→DEV HANDOFF → Build → 🚧 DEV SELF-QA → Internal QA → 🚧 LAUNCH PREP → Go-Live → Complete
```

---

## Stage 1: Research & Brief

**Owner:** Designer (with PM oversight)

Same as Design Only flow — no shortcuts because there's a build phase.

**Actions:**
- Site walkthrough and screenshot audit of existing pages
- Competitor review (2-3 post-click experiences)
- Audience and traffic source identification
- Page objective defined (one job)
- Section-by-section design brief written

> **Reference:** [Design Process & Workflow](/tools/ops-wiki?section=00-design-process)

**Output:** Design brief signed off by PM.

---

## Stage 2: Design

**Owner:** Designer

**Actions:**
- Desktop design (1440px viewport, 1200px max-content)
- Mobile design (375px viewport)
- All copy finalised
- Hover and interaction states documented
- Spacing, typography, and colour annotations
- Component references from design library noted

> **Reference:** [Figma Workflow & File Structure](/tools/ops-wiki?section=01-figma-workflow)

**Output:** Complete Figma file, desktop + mobile, all states.

---

## Stage 3: Client Review

**Owner:** PM

**Actions:**
- Present design with section-by-section walkthrough
- Collect feedback in one structured round
- Document change requests and scope implications
- Apply approved revisions
- Get explicit written approval

**Output:** Client-approved design.

---

## 🚧 Gate 1: Design → Dev Handoff

**This is a hard stop.** Development does not start until this gate is passed.

The handoff must be complete enough that the developer can build without asking the designer a single question. If the dev messages the designer within the first hour, the handoff was incomplete.

**Gate checklist:**
- [ ] Desktop + mobile designs complete and client-approved
- [ ] All copy is final (zero placeholder text)
- [ ] Hover states designed for every interactive element
- [ ] Spacing and padding documented
- [ ] Font sizes, weights, line heights specified
- [ ] Colour values reference design system
- [ ] Assets exported (WebP, SVG, PNG as needed)
- [ ] Interaction annotations written (trigger, behaviour, duration, easing)
- [ ] Responsive breakpoint notes added
- [ ] Handoff page created in Figma with all specs

> **Reference:** [Design to Dev Handoff](/tools/ops-wiki?section=02-handoff) — the full checklist with annotation standards and export settings.

**Who checks:** PM reviews the handoff page before assigning to dev. If anything is missing, it goes back to the designer. No exceptions.

---

## Stage 4: Build

**Owner:** Developer

**Actions:**
- Set up development environment (theme, branch strategy)
- Build page section by section, referencing Figma handoff
- Implement responsive behaviour per breakpoint notes
- Add all interactions and animations per annotations
- Optimise images and assets for performance
- Test locally on mobile and desktop

> **Reference:** [Build Process & Standards](/tools/ops-wiki?section=03-build-process) and [Shopify Development Workflow](/tools/ops-wiki?section=04-shopify-workflow)

**Output:** Built page on staging/preview environment.

---

## 🚧 Gate 2: Dev Self-QA

**Hard stop.** The developer must self-QA before submitting for internal review. This catches 80% of issues before anyone else sees them.

**Self-QA checklist:**
- [ ] Page matches Figma design pixel-for-pixel on desktop (overlay check)
- [ ] Page matches Figma design on mobile (375px)
- [ ] All links work and point to correct destinations
- [ ] All images load and are optimised (WebP, lazy-loaded)
- [ ] Hover states match design specs
- [ ] Animations work with correct timing and easing
- [ ] Forms submit correctly (if applicable)
- [ ] Page loads in under 3 seconds on mobile (Lighthouse check)
- [ ] No console errors
- [ ] No broken layouts at any viewport between 320px and 1600px
- [ ] Copy matches approved design exactly (no typos, no missing text)

> **Reference:** [QA Checklist & Browser Testing](/tools/ops-wiki?section=12-qa-checklist) and [Performance & Page Speed](/tools/ops-wiki?section=13-performance)

**Who checks:** Developer self-certifies. If internal QA finds issues that should have been caught in self-QA, it's flagged as a process failure — not just a bug.

---

## Stage 5: Internal QA

**Owner:** PM or QA lead

Independent review of the built page against the approved design.

**Actions:**
- Cross-browser testing (Chrome, Safari, Firefox, Edge)
- Device testing (iOS Safari, Android Chrome at minimum)
- Design fidelity check (overlay Figma vs build)
- Copy proofread
- Link and CTA validation
- Performance check (Lighthouse score)
- Accessibility basics (colour contrast, alt text, heading hierarchy)

**Output:** QA report — either "Pass" or a list of specific issues to fix.

If issues found → developer fixes → re-QA on fixed items only.

---

## 🚧 Gate 3: Launch Prep

**Hard stop.** Before the page goes live, the launch method must be confirmed.

**Launch prep checklist:**
- [ ] Client has approved the staging/preview version (written confirmation)
- [ ] Go-live date and time confirmed with client
- [ ] DNS/domain considerations checked (if applicable)
- [ ] Redirects set up (if replacing an existing page)
- [ ] Analytics tracking confirmed (GA4 events, UTMs)
- [ ] Meta pixel / tracking pixels verified
- [ ] Backup of existing page taken (if replacing)
- [ ] Team available post-launch for immediate fixes

> **Reference:** [Deployment & Go-Live Checklist](/tools/ops-wiki?section=05-deployment)

---

## Stage 6: Go-Live

**Owner:** Developer (with PM coordination)

**Actions:**
- Push page live at agreed time
- Verify live page works correctly (quick smoke test)
- Check tracking fires correctly
- Notify client: "Page is live" with direct link
- Monitor for 24 hours post-launch

---

## Stage 7: Complete

**Actions:**
- Confirm with client everything is working
- Close project in portal
- Invoice final payment
- Screenshot before/after for case study pipeline
- Document any learnings for future projects

> **Reference:** [Client Communication & Updates](/tools/ops-wiki?section=14-client-comms) for close-out communication.

---

## Optional: CRO Test Layer

Add this layer when the page is being built to test a specific hypothesis with a measurement plan. Everything in the standard flow above still applies — these are additions, not replacements.

### Pre-flight: CRO Research & Hypothesis

**Owner:** Strategist / Lead (not the designer)

Before any design starts, define what's being tested and why.

- Pull current page performance (CVR, bounce rate, scroll depth, heatmap)
- Identify the specific conversion leak
- Score the relevant conversion matrix layers
- Write the hypothesis:

```
IF we [specific change]
THEN we expect [metric] to [direction] by [range]
BECAUSE [evidence from data/research]
```

- Define the test method: A/B split, before/after, or multivariate
- Calculate required sample size and minimum test duration
- Set the success metric and minimum detectable effect

> **Reference:** [CRO Audit Process](/tools/ops-wiki?section=06-audit-process) and [Testing & Experimentation Framework](/tools/ops-wiki?section=07-testing-framework)

**Output:** CRO brief with hypothesis, test method, success metric, and duration. Lead-approved before design starts.

### Design Brief — add CRO rationale

Translate the hypothesis into the brief. Every section should connect back to the hypothesis: "this section addresses objection X" / "this CTA tests message Y."

### Build — add A/B test infrastructure

On top of the standard build:
- A/B testing tool wired up (Google Optimize, VWO, Convert, Shopify native)
- Test variant and control configured correctly
- Custom GA4 events for the success metric
- UTM parameters if test is traffic-source specific

### Self-QA — extra checklist items

- [ ] A/B test serving correctly (both variants load, split is working)
- [ ] Tracking events fire on the success metric action
- [ ] Test is not leaking (control visitors don't see variant and vice versa)
- [ ] Analytics records test variant as a dimension

### Internal QA — extra checks

- Verify traffic is splitting correctly
- Confirm tracking fires on both variants
- Confirm test doesn't break anything elsewhere on the site

### Launch Prep — Test Method Gate

Stricter than standard launch prep. A badly launched test corrupts data and wastes the project.

- [ ] Test method confirmed and documented (A/B, before/after, etc.)
- [ ] Traffic allocation set (50/50 for A/B, 100% for before/after)
- [ ] Test duration calculated (minimum 2 weeks or 1,000 visitors per variant)
- [ ] Statistical significance threshold agreed (95% standard)
- [ ] Baseline metrics recorded (current CVR, ATC rate, bounce rate)
- [ ] Success metric confirmed and trackable
- [ ] Client understands test will run for [X] weeks — no pulling early
- [ ] Daily monitoring plan in place

### Post-Launch: Measure & Report

**Owner:** Strategist

- Wait for statistical significance (minimum 95% confidence)
- Pull final results for both variants: CVR, ATC rate, bounce rate, scroll depth
- Calculate revenue impact of the winner
- Write the test report:
  - Hypothesis (what we tested)
  - Result (which variant won, by how much)
  - Statistical significance
  - Revenue impact (projected monthly)
  - Learnings
  - Next step (iterate, ship as-is, or test next hypothesis)
- Present to client

> **Reference:** [Reporting & Analytics](/tools/ops-wiki?section=08-reporting)

### Complete — extra steps

- Implement winning variant as permanent (if A/B) or confirm before/after results
- Remove test infrastructure
- Add results to case study pipeline
- Feed learnings into the next hypothesis (if ongoing relationship)

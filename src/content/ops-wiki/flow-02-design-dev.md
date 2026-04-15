# Flow: Design & Development

## When This Flow Applies

The most common project type. Client is buying a full page build — we design it, we build it, we launch it. No CRO/testing component.

**Examples:** Landing page build, homepage redesign, PDP template redesign, collection page build.

**Typical value:** £2,500–£8,000 per project

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

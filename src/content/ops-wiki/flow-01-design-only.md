# Flow: Design Only

## When This Flow Applies

The client is buying design deliverables only — no development, no CRO. They either have their own dev team or plan to implement separately. We hand over clean Figma files and we're done.

**Examples:** Wireframes for a homepage, high-fidelity PDP design, landing page mockups for their dev team to build.

---

## The Assembly Line

```
INBOX → Research & Brief → Design → Client Review → Handoff Package → Complete
```

---

## Stage 1: Research & Brief

**Owner:** Designer (with PM oversight)

Before opening Figma, understand what you're designing and why. This stage prevents the #1 design mistake: building something that looks good but doesn't convert.

**Actions:**
- Review the intake notes from the Onboarding Inbox
- Complete a site walkthrough — screenshot existing pages, note what's working and what isn't
- Review competitor post-click experiences (2-3 competitors)
- Identify the audience for this page (cold traffic? retargeting? existing customers?)
- Document the page objective (what's the ONE job this page does?)
- Write a section-by-section design brief

> **Reference:** [Design Process & Workflow](/tools/ops-wiki?section=00-design-process) for brief structure and research methodology.

**Output:** Design brief with section breakdown, audience definition, and reference screenshots.

**Exit criteria:** Brief reviewed by PM or lead. No design work starts without a signed-off brief.

---

## Stage 2: Design

**Owner:** Designer

Build the design in Figma following the design system and file structure standards.

**Actions:**
- Desktop design (1440px viewport, 1200px max-content)
- Mobile design (375px viewport)
- All copy finalised (no placeholder text)
- Hover states for interactive elements
- Spacing and typography annotations
- Assets identified and sourced

> **Reference:** [Figma Workflow & File Structure](/tools/ops-wiki?section=01-figma-workflow) for file setup, component usage, and naming conventions.

**Output:** Complete Figma file with desktop + mobile, all states, all copy.

**Exit criteria:** Designer self-reviews against the brief. Every section in the brief has a corresponding design section.

---

## Stage 3: Client Review

**Owner:** PM (manages the feedback loop)

Present the design to the client and collect structured feedback. This is NOT "what do you think?" — it's a guided walkthrough.

**Actions:**
- Walk the client through the design section by section (Loom or live call)
- Explain the reasoning behind key decisions (why this layout, why this hierarchy)
- Collect feedback in one round — not drip-fed over a week
- Document all change requests
- Identify which changes are in-scope vs. out-of-scope

> **Reference:** [Client Communication & Updates](/tools/ops-wiki?section=14-client-comms) for feedback collection best practices.

**Feedback rules:**
- One round of revisions is included in the project scope
- Additional rounds are quoted separately
- Feedback must be specific: "make the hero bigger" is not actionable. "Increase hero section height to 80vh and make the headline 48px" is.

**Output:** Approved design or documented revision list.

**Exit criteria:** Client has explicitly approved the design (written confirmation — Slack message, email, or portal approval).

---

## Stage 4: Handoff Package

**Owner:** Designer

Prepare the deliverable package for the client. Since there's no dev handoff to our team, this package must be comprehensive enough for any developer to implement.

**Actions:**
- Export all assets (WebP for photos, SVG for icons, PNG fallbacks)
- Document all spacing, typography, and colour values
- Annotate interactions and hover states
- Export a clean handoff page in Figma with all specs
- Create a summary document listing all files and what they contain

> **Reference:** [Design to Dev Handoff](/tools/ops-wiki?section=02-handoff) — follow the full handoff checklist even though it's not our dev team receiving it. The standard doesn't drop because the client is implementing.

**Output:** Figma link + exported assets + handoff notes document.

**Exit criteria:** Package reviewed by PM. Client can open the Figma file and understand every element without asking a question.

---

## Stage 5: Complete

**Actions:**
- Deliver the handoff package to the client (Slack + portal)
- Confirm receipt and answer any initial questions
- Close the project in the portal
- Invoice final payment (if 50/50 split)
- Add to case study pipeline if results are trackable

---

## Gates

This flow has one gate:

### Client Approval Gate (between Stage 3 → Stage 4)
**Hard stop.** No handoff package is prepared until the client has explicitly approved the design. Verbal approval on a call is not enough — get it in writing.

**Why this matters:** Design-only projects have no build phase to catch issues. If the client says "I thought we agreed on X" after handoff, you have no leverage. Written approval is your proof.

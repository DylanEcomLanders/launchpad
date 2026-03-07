import type { Playbook } from "./types";

/* ================================================================
   2. DESIGN PHASE
   From Figma setup to dev handover — the full design process
   ================================================================ */
export const design: Playbook = {
  id: "design-phase",
  title: "Design Phase",
  description:
    "The complete design process — from Figma setup and research through internal QA, client revisions, and dev handover",
  category: "How We Work",
  estimatedMinutes: 30,
  steps: [
    {
      id: "dp-1",
      title: "Design Phase Begins",
      content: `The PM has confirmed everything is ready and the designer has the green light. The Design Phase officially starts now.

**What you should already have:**
- Completed client brief and questionnaire
- Brand assets (logos, fonts, colours, imagery guidelines)
- Access to any existing site or platform
- Clear deadlines in ClickUp
- The internal Slack channel is set up and team is briefed

**Your first actions:**
1. Review the brief thoroughly — read it twice
2. Look at the client's existing site (if they have one)
3. Check competitor / inspiration references provided by the client
4. Note any questions or clarifications needed before starting

**Mindset:**
Understand the brand before you touch Figma. The best designs come from designers who deeply understand what the client is trying to achieve.`,
      tip: "Read the brief twice. The second read always reveals details you missed the first time.",
      quiz: {
        question: "What should a designer do first when the design phase begins?",
        options: [
          "Jump straight into Figma and start designing",
          "Review the brief thoroughly and understand the brand",
          "Send the client a mood board",
          "Start coding the homepage",
        ],
        correctIndex: 1,
        hint: "Understanding comes before execution.",
      },
    },
    {
      id: "dp-2",
      title: "Set Up Client Figma File",
      content: `Every project gets a properly structured Figma file from the start.

**Figma file setup:**
- Use the Ecomlanders project template
- Name it clearly: "ClientName — Project Type — Date"
- Set up page structure (Cover, Wireframes, Design, Components, Handover)
- Add client brand colours, fonts, and logo to the design system
- Share with the internal team (not the client yet)

**Why structure matters:**
A messy Figma file leads to messy handovers. When the developer picks up this file, they need to find everything instantly. When the Design Lead reviews it, they shouldn't have to hunt for frames.

**Who has access at this point:**
Internal team only. The client does not see the Figma file until we're ready to present.`,
      tip: "Always use the Ecomlanders Figma template — it saves setup time and ensures consistency across projects.",
      quiz: {
        question: "Who has access to the Figma file at the start of the design phase?",
        options: [
          "The client and the full team",
          "Only the lead designer",
          "The internal team only — the client doesn't see it yet",
          "Everyone in the company",
        ],
        correctIndex: 2,
        hint: "We don't share with the client until we're ready to present.",
      },
    },
    {
      id: "dp-3",
      title: "Short Design Research Window",
      content: `Before jumping into design, take a focused research window to gather inspiration and direction.

**What to research:**
- Client's industry and competitors — what's working, what's not
- Current design trends relevant to their sector
- UX patterns that solve the specific problems in the brief
- Reference sites the client mentioned (and why they like them)
- Any technical constraints that affect design (e.g. Shopify limitations)

**How long:**
This is a *short* window — not a week-long deep dive. A few hours of focused research is enough. The goal is informed design decisions, not a research paper.

**Output:**
Capture key insights and references. These inform your design decisions and give you ammunition when presenting to the client later ("We chose this layout because research shows...").`,
      tip: "Set a time limit for research — it's easy to get lost in inspiration sites. A few hours, then start designing.",
      quiz: {
        question: "What is the purpose of the design research window?",
        options: [
          "To write a full competitor analysis report",
          "To gather focused inspiration and make informed design decisions",
          "To redesign the client's competitor sites",
          "To delay starting the actual design work",
        ],
        correctIndex: 1,
        hint: "It's about informing your decisions, not writing a thesis.",
      },
    },
    {
      id: "dp-4",
      title: "Design in Internal Design Lab Figma File",
      content: `This is where the actual design work happens — in our internal Design Lab.

**What is the Design Lab?**
The Design Lab is our internal Figma workspace where designers experiment, iterate, and refine before anything goes into the client file. Think of it as the workshop — raw, messy, creative.

**How to use the Design Lab:**
- Explore multiple directions and concepts
- Iterate quickly — don't polish too early
- Try bold ideas you might not show the client
- Get informal feedback from other designers
- Refine the strongest concept into a polished direction

**What stays in the Lab vs what moves to the client file:**
Only the strongest, most refined direction moves to the client Figma file. The Lab keeps all your explorations — they're valuable for future reference but the client never sees them.

**Key principle:**
The Design Lab gives you creative freedom without the pressure of "the client is watching." Use it.`,
      tip: "Don't self-edit too early in the Design Lab — explore wild ideas first, then refine the best one.",
      quiz: {
        question: "What is the purpose of the Design Lab?",
        options: [
          "A place for the client to review designs",
          "An internal workspace for exploration and iteration before refining for the client",
          "A shared folder for storing brand assets",
          "A template library for Shopify themes",
        ],
        correctIndex: 1,
        hint: "It's the internal creative workshop — experiment freely, then refine.",
      },
    },
    {
      id: "dp-5",
      title: "25% Progress Report — PDP Images / ATF",
      content: `At roughly 25% through the design phase, we share a progress update internally.

**What "25%" means in practice:**
At this point, the designer should have key foundational elements ready:
- **PDP (Product Detail Page) imagery** — how products will be presented
- **ATF (Above The Fold)** — the hero section / first thing visitors see
- These are the highest-impact areas and set the visual tone for everything else

**Why a 25% checkpoint?**
Catching direction issues early saves massive time. If the design is heading in the wrong direction, it's far cheaper to course-correct at 25% than at 90%.

**Who sees the 25% report:**
This is an **internal checkpoint** — shared with the Senior Designer and PM. The client does not see this. It's a gut-check: "Are we on the right track?"

**What to present:**
Show the ATF concept and PDP image treatment. Explain your thinking and the research that informed your decisions.`,
      tip: "The 25% checkpoint isn't about being 'done' — it's about proving you're headed in the right direction. Show your thinking, not just the pixels.",
      quiz: {
        question: "What two things should be ready for the 25% progress report?",
        options: [
          "The full homepage and footer designs",
          "PDP (Product Detail Page) images and ATF (Above The Fold) hero section",
          "Mobile and desktop versions of every page",
          "The client presentation deck and brand guidelines",
        ],
        correctIndex: 1,
        hint: "Think about the highest-impact visual areas that set the tone.",
      },
    },
    {
      id: "dp-6",
      title: "Internal Design QA with Senior Designer",
      content: `Before anything goes to the Design Lead, the Senior Designer reviews the work.

**What the Senior Designer checks:**
- Does the design align with the brief and client goals?
- Is the visual quality up to Ecomlanders standards?
- Are there UX issues or inconsistencies?
- Is the design system clean and reusable?
- Are responsive considerations accounted for?
- Is the Figma file organised for handover?

**The review process:**
This is collaborative, not a gate. The Senior Designer provides feedback, the designer iterates, and they align on the final direction together.

**What happens after Senior Designer approval:**
Once the Senior Designer is happy, the design moves to the Design Lead for final approval. This is a two-step review process — Senior Designer first, then Design Lead.`,
      tip: "Come to the Senior Designer review with your design rationale prepared — explain the 'why' behind your decisions.",
      quiz: {
        question: "What is the review process before presenting to the client?",
        options: [
          "The designer sends it straight to the client",
          "Senior Designer reviews first, then Design Lead gives final approval",
          "The PM reviews and approves",
          "The developer checks it's buildable",
        ],
        correctIndex: 1,
        hint: "There are two internal review steps before the client ever sees anything.",
      },
    },
    {
      id: "dp-7",
      title: "Senior Designer Signs Off → Design Lead Final Approval",
      content: `This is the two-step internal approval process.

**Step 1 — Senior Designer sign-off:**
The Senior Designer confirms the design is solid, feedback has been addressed, and it's ready for the Design Lead to review.

**Step 2 — Design Lead final approval:**
The Design Lead reviews with a broader lens:
- Does this meet our agency-wide quality bar?
- Is this something we'd be proud to put in our portfolio?
- Are there any strategic or brand-level issues?
- Final polish notes and refinements

**Design Lead revisions:**
The Design Lead may request final revisions. These are typically polish-level — fine-tuning typography, spacing, colour balance, or strategic adjustments. The designer makes these changes and gets final sign-off.

**Why two levels of review:**
Quality control. The Senior Designer catches craft issues. The Design Lead catches strategic and brand-level issues. Together, they ensure nothing goes to the client that isn't excellent.`,
      quiz: {
        question: "What does the Design Lead focus on during their review?",
        options: [
          "Only checking for spelling mistakes",
          "Agency-wide quality bar, portfolio worthiness, and strategic / brand-level issues",
          "Making sure the Figma file is named correctly",
          "Approving the project budget",
        ],
        correctIndex: 1,
        hint: "The Design Lead looks at the big picture — quality, strategy, and brand alignment.",
      },
    },
    {
      id: "dp-8",
      title: "Mobile View Presented to Client with Rational Comments",
      content: `Here's a key part of our process that sets us apart: **we present mobile first**.

**Why mobile first:**
The majority of e-commerce traffic is mobile. By presenting the mobile view first, we force the conversation to focus on the most impactful user experience. It also simplifies the client review — fewer elements, clearer focus.

**How to present:**
- Walk the client through the mobile design screen by screen
- Add **rational comments** in Figma explaining your design decisions
- Explain *why* you made each choice, not just *what* you designed
- Reference the brief, research, and best practices to support your decisions

**Rational comments — what are they?**
Annotations in the Figma file that explain the reasoning behind design decisions. For example: "We placed the CTA above the fold because data shows 70% of mobile users don't scroll past the first screen."

**What to expect:**
The client reviews and provides feedback. Be prepared for questions — the rational comments should pre-answer most of them.`,
      tip: "Strong rational comments reduce revision rounds. If you explain the 'why' upfront, clients push back less.",
      quiz: {
        question: "Which view is presented to the client first?",
        options: [
          "Desktop view",
          "Tablet view",
          "Mobile view with rational comments",
          "A wireframe version",
        ],
        correctIndex: 2,
        hint: "We lead with the experience that the majority of shoppers will actually see.",
      },
    },
    {
      id: "dp-9",
      title: "Client Has 4 Days Unlimited Revisions",
      content: `After the mobile presentation, the client gets a structured revision window.

**The revision policy:**
- **4 days** of unlimited revisions from the date of presentation
- The client can request as many changes as they want within this window
- After 4 days, additional revisions are scoped separately
- All revision requests should come through the agreed channel (Slack or Figma comments)

**How to manage revisions:**
- Log every revision request in ClickUp
- Batch similar changes together for efficiency
- Push back diplomatically on requests that contradict the brief or UX best practices
- Keep the client updated on progress during the revision window

**Why 4 days unlimited:**
It gives the client genuine freedom to refine without feeling rushed, while giving us a clear boundary so projects don't drag on indefinitely.

**What happens when the 4 days are up:**
If the client hasn't responded or hasn't finished their revisions, the PM follows up. If they need more time, it's discussed and scoped accordingly.`,
      tip: "Track revision requests carefully — if a client consistently asks for things outside scope, flag it to the PM early.",
      quiz: {
        question: "How long does the client have for unlimited revisions after mobile presentation?",
        options: [
          "2 business days",
          "1 week",
          "4 days",
          "There's no limit — revisions go on until they're happy",
        ],
        correctIndex: 2,
        hint: "It's a specific number of days — enough for freedom but with a clear boundary.",
      },
    },
    {
      id: "dp-10",
      title: "Once Approved, Desktops Designed",
      content: `Only after the mobile design is approved do we design the desktop views.

**Why this order matters:**
- Mobile-first ensures the core experience is solid
- Desktop is an expansion of the mobile design, not a separate design
- It's faster — mobile decisions inform desktop layout
- Clients have already approved the direction, so desktop is a smoother process

**Designing desktop views:**
- Expand the mobile layouts to take advantage of wider screens
- Add desktop-specific elements (hover states, multi-column layouts, expanded navigation)
- Maintain visual consistency with the approved mobile design
- Ensure responsive breakpoints are considered

**Client review:**
Desktop designs are shared with the client for review, but since they've already approved the mobile direction, this round is typically faster with fewer revisions.`,
      quiz: {
        question: "When are desktop views designed?",
        options: [
          "Before the mobile design",
          "At the same time as mobile",
          "Only after the mobile design has been approved by the client",
          "After development is complete",
        ],
        correctIndex: 2,
        hint: "Mobile approval comes first — desktop follows.",
      },
    },
    {
      id: "dp-11",
      title: "Final Design Passed to Client & Prepared for Dev Handover",
      content: `The design is complete. Time to wrap up and prepare for the development phase.

**Final deliverables to the client:**
- Complete mobile and desktop designs in Figma
- All pages and components finalised
- Client signs off on the final design

**Preparing for dev handover:**
- Figma file cleaned up and organised for developer consumption
- Design system documented (colours, fonts, spacing, components)
- Interactive elements annotated (hover states, animations, transitions)
- Assets exported or marked for export
- Any complex interactions documented with notes or short videos
- Responsive breakpoint behaviour specified

**The handover itself:**
The designer walks the developer through the Figma file. This isn't just "here's the link" — it's a proper handover meeting where the developer can ask questions and flag potential challenges.

**What happens next:**
The project moves into the Development Phase. The designer remains available for questions but their primary work is done.`,
      tip: "A 15-minute handover call with the developer saves hours of back-and-forth later. Never skip it.",
      quiz: {
        question: "How should the design-to-dev handover happen?",
        options: [
          "Just send the Figma link in Slack",
          "The designer walks the developer through the file in a proper handover meeting",
          "The PM forwards the design brief to the developer",
          "The developer figures it out from the client presentation",
        ],
        correctIndex: 1,
        hint: "A handover is a conversation, not just a link drop.",
      },
    },
  ],
};

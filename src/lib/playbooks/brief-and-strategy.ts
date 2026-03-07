import type { Playbook } from "./types";

/* ================================================================
   1. BRIEF & STRATEGY
   The kickoff flow from payment to design phase handover
   ================================================================ */
export const briefAndStrategy: Playbook = {
  id: "brief-and-strategy",
  title: "Brief & Strategy",
  description:
    "From onboarding and payment through to kickoff — how we set up every new project before design begins",
  category: "How We Work",
  estimatedMinutes: 20,
  steps: [
    {
      id: "bs-1",
      title: "Onboarding & Payment Complete",
      content: `This is where every project begins. The client has signed, payment is confirmed, and we're ready to kick things off.

**What needs to happen before we move forward:**
- Contract signed and filed
- Payment received or payment plan confirmed
- Client added to our systems
- All onboarding forms / questionnaires completed by the client

**Why this matters:**
Nothing moves until payment is confirmed. No exceptions. This protects the team from doing work that hasn't been secured and ensures the client is fully committed.

**Who owns this:**
The account manager or sales lead confirms payment is complete and triggers the handover to the project team.`,
      tip: "Never start project setup until payment is fully confirmed — it protects everyone.",
      quiz: {
        question:
          "What must be confirmed before any project setup begins?",
        options: [
          "The design brief is written",
          "Onboarding and payment are both complete",
          "The developer is available",
          "The client has sent their brand assets",
        ],
        correctIndex: 1,
        hint: "Nothing moves until the financial side is locked in.",
      },
    },
    {
      id: "bs-2",
      title: "ClickUp Tasks & Slack Channels Created",
      content: `Once onboarding and payment are confirmed, we immediately set up the project infrastructure.

**ClickUp setup:**
- New project space created from the template
- All standard task lists populated (Design, Dev, QA, Launch)
- Key milestones and deadlines added
- Client details and project brief attached

**Slack setup:**
- Internal team channel created (e.g. #proj-clientname)
- Client-facing channel created (if applicable)
- Key team members added to both channels

**Why both tools matter:**
ClickUp is our single source of truth for tasks and timelines. Slack is where real-time communication happens. Every project needs both from day one — no exceptions.`,
      tip: "Use the standard project template in ClickUp — don't create from scratch. It ensures nothing gets missed.",
      quiz: {
        question:
          "Which two tools must be set up for every new project?",
        options: [
          "Figma and Notion",
          "ClickUp and Slack",
          "Google Drive and Trello",
          "Asana and Microsoft Teams",
        ],
        correctIndex: 1,
        hint: "Think about where we track tasks and where we communicate in real time.",
      },
    },
    {
      id: "bs-3",
      title: "Capacity Check & Team Assignment",
      content: `Before assigning a team, we check capacity. We never overload people — it kills quality.

**The capacity check:**
- Review current workloads across the design and dev teams
- Identify who has bandwidth for a new project
- Consider skill match — does this project need a specialist?
- Factor in the timeline — can this team realistically deliver?

**Team assignment:**
- Lead designer assigned
- Developer assigned
- PM confirmed (if not already the person running this flow)
- Any specialists flagged (e.g. Shopify Plus, animations, CRO)

**Why we don't skip this:**
Assigning a project to someone who's already maxed out means missed deadlines, rushed work, and unhappy clients. The capacity check is non-negotiable.`,
      tip: "If the team is at capacity, escalate immediately — don't just squeeze it in and hope for the best.",
      quiz: {
        question: "What happens before a team is assigned to a project?",
        options: [
          "The client approves the team",
          "A capacity check is done to ensure nobody is overloaded",
          "The design phase begins",
          "The developer sets up the repo",
        ],
        correctIndex: 1,
        hint: "We need to make sure people actually have the bandwidth before assigning them.",
      },
    },
    {
      id: "bs-4",
      title: "Deadlines Set",
      content: `With the team assigned, we lock in the project timeline.

**What gets a deadline:**
- Design phase start and end dates
- Key checkpoints (25% progress report, internal QA, client review)
- Dev phase start and end dates
- Internal QA deadline
- Launch date

**How deadlines are set:**
- Work backwards from the agreed launch date
- Build in buffer for client revision rounds
- Account for the team's other commitments (from the capacity check)
- All deadlines go into ClickUp with owners assigned

**The golden rule:**
Deadlines are commitments, not suggestions. If a deadline is at risk, flag it immediately — don't wait until it's missed.`,
      tip: "Always work backwards from the launch date and build in buffer for client revisions.",
      quiz: {
        question: "How should project deadlines be determined?",
        options: [
          "The designer picks dates that work for them",
          "Work backwards from the agreed launch date with buffer built in",
          "The client decides all deadlines",
          "We don't set deadlines — we work until it's done",
        ],
        correctIndex: 1,
        hint: "Start from the end and work backwards, making sure there's room for revisions.",
      },
    },
    {
      id: "bs-5",
      title: "Kickoff Message Sent to Client in Slack",
      content: `Time to officially welcome the client and set expectations.

**The kickoff message includes:**
- Welcome and introduction of the team members working on their project
- Confirmation of the timeline and key milestones
- What the client can expect in terms of communication cadence
- How to use the Slack channel (what to post here vs email)
- Any immediate action items for the client (assets, access, content)

**Tone and approach:**
Professional but warm. The client should feel like they're in good hands. This is their first real interaction with the delivery team — first impressions count.

**Why Slack:**
We use Slack for client communication because it's faster than email, keeps everything in one thread, and makes it easy for the whole team to stay aligned.`,
      tip: "Make the kickoff message personal — mention the client's brand by name and reference something specific from the brief.",
      quiz: {
        question: "What is included in the kickoff message to the client?",
        options: [
          "Just a link to the Figma file",
          "Team introductions, timeline, communication expectations, and any action items for the client",
          "A request for full payment upfront",
          "The finished design mockups",
        ],
        correctIndex: 1,
        hint: "The kickoff message sets the stage for the whole project — it covers people, timeline, and expectations.",
      },
    },
    {
      id: "bs-6",
      title: "Project Roadmap Presented to Client",
      content: `After the kickoff message, we present the client with a clear project roadmap.

**What the roadmap covers:**
- Phase breakdown (Design → Dev → QA → Launch)
- Key dates and milestones
- When the client will be asked for input / revisions
- What "done" looks like at each phase
- The revision policy and how feedback rounds work

**How it's presented:**
Walk the client through the roadmap — don't just send a link. Screen-share or schedule a quick call. Make sure they understand each phase and when they'll be involved.

**Why this matters:**
Clients who understand the process cause fewer surprises. When they know what's coming and when, they prepare better, give better feedback, and trust the team more.`,
      quiz: {
        question: "How should the project roadmap be shared with the client?",
        options: [
          "Just email them a PDF",
          "Walk them through it — screen-share or call so they understand each phase",
          "Post it in Slack and hope they read it",
          "Wait until the design phase to mention it",
        ],
        correctIndex: 1,
        hint: "Don't just send it — make sure they actually understand what's coming.",
      },
    },
    {
      id: "bs-7",
      title: "Internal Team Informed of Specifics",
      content: `With the client aligned, it's time to brief the internal team on the project details.

**What the team needs to know:**
- Client background and what their brand is about
- Project scope and deliverables
- Key deadlines and milestones
- Any special requirements or constraints
- Client communication preferences and personality notes
- Access details and logins (stored securely)
- Links to the brief, brand assets, and reference material

**How this is shared:**
Post a structured brief in the internal Slack channel. Tag all team members. Make it scannable — use bullet points, not paragraphs.

**Why internal alignment matters:**
Everyone on the team should be able to answer "What are we building, for whom, and by when?" If they can't, the briefing wasn't good enough.`,
      tip: "Include personality notes about the client — knowing that a client prefers concise updates vs detailed walkthroughs saves everyone time.",
      quiz: {
        question:
          "What should every team member be able to answer after the internal briefing?",
        options: [
          "How much the client is paying",
          "What we're building, for whom, and by when",
          "The client's personal phone number",
          "Which competitor sites to copy",
        ],
        correctIndex: 1,
        hint: "The briefing should give everyone clarity on scope, client, and timeline.",
      },
    },
    {
      id: "bs-8",
      title: "Designer Starts Design Phase",
      content: `The Brief & Strategy phase is complete. The designer now has everything they need to begin.

**Before design starts, confirm:**
- Client brief and questionnaire are complete
- Brand assets received (logos, fonts, colour palette, imagery)
- Access to any existing site or platform
- Design deadlines are clear in ClickUp
- Internal team channel is active and briefed

**The handover:**
The PM confirms all the above and gives the green light to the designer. This is an explicit handover — the designer doesn't just "start whenever." There's a clear moment where design officially begins.

**What happens next:**
The designer moves into the Design Phase playbook — setting up the Figma file, conducting research, and beginning work in the Design Lab.`,
      tip: "The designer should never have to chase for assets or brief details — that's a PM failure. Everything should be ready before this step.",
      quiz: {
        question: "When does the designer officially start the design phase?",
        options: [
          "Whenever they feel like it",
          "As soon as the client pays",
          "After an explicit handover from the PM confirming everything is ready",
          "Before the client roadmap is presented",
        ],
        correctIndex: 2,
        hint: "Design begins with a clear, explicit handover — not a vague start.",
      },
    },
  ],
};

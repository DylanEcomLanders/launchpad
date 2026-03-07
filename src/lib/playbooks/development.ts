import type { Playbook } from "./types";

/* ================================================================
   3. DEVELOPMENT PHASE
   From dev start to client approval — the full build process
   ================================================================ */
export const development: Playbook = {
  id: "development-phase",
  title: "Development Phase",
  description:
    "The complete development flow — from acquiring resources and setting up the environment through to QA approval and client handover",
  category: "How We Work",
  estimatedMinutes: 25,
  steps: [
    {
      id: "dev-1",
      title: "Dev Phase Starts",
      content: `The design is approved and handed over. The Development Phase officially begins.

**What you should have before starting:**
- Access to the finalised Figma file with the designer's handover notes
- Clear understanding of the project scope and pages to build
- ClickUp tasks assigned with deadlines
- Internal Slack channel active
- Any technical requirements documented (e.g. third-party integrations, apps, custom functionality)

**First thing to do:**
Review the Figma file thoroughly. Don't start building until you understand the full scope of what's being built. Flag any concerns or questions immediately — the earlier you raise them, the easier they are to solve.`,
      tip: "Spend the first hour reviewing, not coding. Understanding the full picture saves you from rework later.",
      quiz: {
        question: "What should a developer do first when the dev phase starts?",
        options: [
          "Start coding the homepage immediately",
          "Review the Figma file thoroughly and understand the full scope",
          "Contact the client directly for requirements",
          "Set up the staging environment",
        ],
        correctIndex: 1,
        hint: "Review before you build.",
      },
    },
    {
      id: "dev-2",
      title: "Developer Acquires Resources",
      content: `Before writing any code, make sure you have everything you need.

**Resources to acquire:**
- **Access:** Shopify store admin, theme access, any third-party app credentials
- **Assets:** Product images, brand assets, custom fonts, icons
- **Content:** Copy for pages (or placeholder structure if copy is pending)
- **Integrations:** API keys, app documentation, any third-party service credentials
- **Accounts:** GitHub repo access, staging environment, any testing tools

**Who to ask:**
The PM should have most of this ready. If anything is missing, flag it in the project Slack channel immediately. Don't wait — missing resources are the #1 cause of dev delays.

**Checklist mindset:**
Go through the list systematically. Every missing item is a potential blocker. Get everything lined up before you start building.`,
      tip: "Create a checklist of everything you need on day one. Missing a single API key can block you for days if the client is slow to respond.",
      quiz: {
        question: "What is the #1 cause of development delays?",
        options: [
          "Complex animations",
          "Missing resources and access",
          "Too many pages to build",
          "Slow internet connection",
        ],
        correctIndex: 1,
        hint: "You can't build what you don't have access to.",
      },
    },
    {
      id: "dev-3",
      title: "Dev Ensures Requirements Are Clear",
      content: `Before building, make sure there's zero ambiguity about what's expected.

**Questions to answer before coding:**
- What pages are being built? (List them all)
- What functionality is required? (Forms, cart, filters, search, etc.)
- Are there any custom features beyond standard Shopify? (Custom Liquid, JavaScript, APIs)
- What third-party apps need integration?
- What are the performance targets?
- Are there any SEO requirements?
- What's the browser/device support scope?

**How to clarify:**
- Review the Figma file annotation by annotation
- Ask the designer about any interactions that aren't obvious from static mockups
- Check with the PM on any scope items that seem unclear
- Document your understanding and confirm it with the team

**Why this step matters:**
Building the wrong thing is worse than building nothing. Clarity upfront prevents costly rework.`,
      quiz: {
        question: "What should you do if requirements are unclear?",
        options: [
          "Make your best guess and build it",
          "Wait for someone to tell you what to do",
          "Ask questions, review the Figma annotations, and confirm your understanding with the team",
          "Skip that feature and move on",
        ],
        correctIndex: 2,
        hint: "Ambiguity should be resolved through questions and confirmation, not assumptions.",
      },
    },
    {
      id: "dev-4",
      title: "Developer Uses Guidelines to Prepare Dev Environment",
      content: `We have standard guidelines for setting up the development environment. Follow them.

**Environment setup:**
- Clone or set up the Shopify theme using our standard development workflow
- Configure the local development environment per our guidelines
- Set up version control (GitHub repo, branching strategy)
- Install required development tools and extensions
- Configure linting and code formatting rules
- Set up the staging / preview environment

**Our development standards:**
- Follow the Ecomlanders coding guidelines (naming conventions, file structure, commenting)
- Use our standard Git workflow (feature branches, meaningful commit messages)
- Keep code clean and maintainable — someone else will need to work on this after you
- Document any custom or complex implementations

**Why guidelines matter:**
Consistency across projects means any developer can pick up any project. If you go rogue with your own setup, you create a silo that only you can maintain.`,
      tip: "If you think a guideline is wrong or outdated, raise it with the team — don't just ignore it.",
      quiz: {
        question: "Why do we follow standard development guidelines?",
        options: [
          "Because the PM said so",
          "So any developer can pick up any project — consistency prevents silos",
          "To make the code look pretty",
          "It's optional — experienced developers can do their own thing",
        ],
        correctIndex: 1,
        hint: "It's about consistency and preventing knowledge silos.",
      },
    },
    {
      id: "dev-5",
      title: "Status Update 48 Hours Before Deadline",
      content: `Two days before your deadline, you must provide a status update.

**What the status update includes:**
- What's been completed
- What's still in progress
- Any blockers or risks
- Confidence level: are you going to hit the deadline?
- Any scope that might need to be cut or deferred

**Who gets the update:**
Post it in the internal project Slack channel and update your ClickUp tasks. The PM needs visibility — no surprises.

**Why 48 hours:**
48 hours gives enough time to course-correct if something is off track. If you wait until the deadline day to flag a problem, it's too late to fix it.

**Be honest:**
If you're behind, say so. The team can help — whether that's adjusting scope, getting you support, or managing client expectations. What we can't fix is a surprise miss on deadline day.`,
      tip: "A status update that says 'all good' when it isn't is worse than no update at all. Be honest.",
      quiz: {
        question: "When must a developer provide a status update before the deadline?",
        options: [
          "The day of the deadline",
          "One week before",
          "48 hours before the deadline",
          "Only if there's a problem",
        ],
        correctIndex: 2,
        hint: "It's a specific number of hours — enough time to course-correct if needed.",
      },
    },
    {
      id: "dev-6",
      title: "Shopify Preview Links & GitHub Repos Provided",
      content: `Development is wrapping up. Time to hand over the work for review.

**What to provide:**
- **Shopify preview link(s):** Working preview URLs for every page built, so reviewers can click through the actual experience
- **GitHub repository:** Clean, well-documented code with clear commit history
- Password or access details for the preview (if applicable)

**Before sharing preview links:**
- Do a quick self-review — click through every page yourself
- Check on mobile and desktop
- Make sure no obvious bugs or broken elements are visible
- Ensure all content/images are populated (no placeholder "Lorem ipsum" left behind)

**Why both links and code:**
The preview links let QA test the user experience. The GitHub repo lets them review code quality. Both are required — you can't skip either.`,
      tip: "Click through your own preview on mobile before sharing it. You'll catch half the bugs yourself.",
      quiz: {
        question: "What must be provided when development is ready for review?",
        options: [
          "Just the GitHub repo",
          "Just the Shopify preview link",
          "Both Shopify preview link(s) and GitHub repos",
          "A written summary of what was built",
        ],
        correctIndex: 2,
        hint: "Reviewers need to see the experience AND the code.",
      },
    },
    {
      id: "dev-7",
      title: "Pages QA'd for Code Quality, Visual Figma Match & Functionality",
      content: `The internal QA process reviews three dimensions of quality.

**1. Code quality:**
- Clean, readable, maintainable code
- Follows Ecomlanders coding standards
- No console errors or warnings
- Performance is acceptable (page load times, Lighthouse scores)
- Proper SEO markup and meta tags

**2. Visual Figma match:**
- Does the build match the approved Figma design?
- Pixel-level comparison on key elements
- Typography, spacing, colours all match
- Responsive behaviour matches the design specifications
- Animations and interactions work as designed

**3. Functionality:**
- All interactive elements work (buttons, forms, navigation, cart)
- Cross-browser testing (Chrome, Safari, Firefox, Edge)
- Mobile responsiveness across key breakpoints
- Third-party integrations working correctly
- Error states handled gracefully

**If issues are found:**
They're logged and the developer fixes them before moving forward. This is an iterative process — QA might go through multiple rounds.`,
      quiz: {
        question: "What three dimensions does internal QA review?",
        options: [
          "Speed, cost, and timeline",
          "Code quality, visual Figma match, and functionality",
          "Design, branding, and marketing",
          "Client satisfaction, team morale, and profit margin",
        ],
        correctIndex: 1,
        hint: "Think about the three aspects of a well-built page.",
      },
    },
    {
      id: "dev-8",
      title: "Approved → Hand to Client for Live View Revisions",
      content: `Internal QA is passed. The build is now shared with the client.

**What the client receives:**
- Live preview link(s) to review the built pages
- A walkthrough of the functionality and features
- Instructions on how to navigate and test
- A clear revision request process (how and where to submit feedback)

**Client review process:**
- The client reviews the live build against the approved designs
- They test functionality on their own devices
- Revision requests are submitted through the agreed channel
- Reasonable revisions are implemented within the agreed scope

**Managing client feedback:**
Not all feedback is a revision — some might be scope changes. Work with the PM to categorise feedback and handle scope creep appropriately.

**What happens after client approval:**
Once the client is happy with the live view, we move to QA & Launch. Client approval is the green light for going live.`,
      tip: "Walk the client through the preview on a call — don't just send the link. It reduces misunderstandings and speeds up the feedback cycle.",
      quiz: {
        question: "What triggers the move from Development to QA & Launch?",
        options: [
          "The developer decides it's ready",
          "The PM sets an arbitrary date",
          "Client approval of the live view preview",
          "When the Shopify subscription is active",
        ],
        correctIndex: 2,
        hint: "The client needs to give their approval before we move to launch.",
      },
    },
  ],
};

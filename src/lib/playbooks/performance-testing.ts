import type { Playbook } from "./types";

/* ================================================================
   5. PERFORMANCE TESTING
   One-off CRO testing flow for projects
   ================================================================ */
export const performanceTesting: Playbook = {
  id: "performance-testing",
  title: "Performance Testing",
  description:
    "The CRO testing process — from gathering data through to analysis, ideation, and implementing tests",
  category: "How We Work",
  estimatedMinutes: 18,
  steps: [
    {
      id: "pt-1",
      title: "Performance Testing Begins",
      content: `Performance Testing is about using data to improve what we've built. It's not guesswork — it's methodical, data-driven optimisation.

**When does Performance Testing start?**
After the site has been live long enough to gather meaningful data. Launching tests on day one doesn't work — you need baseline data first.

**The goal:**
Increase conversion rates, improve user experience, and drive measurable results for the client.

**Who's involved:**
- **CRO team** — leads the analysis and test ideation
- **Designer** — creates design variations for tests
- **Developer** — implements the tests
- **PM** — manages the client relationship and timeline

**Mindset:**
Every test is a hypothesis. Some will win, some will lose. Both outcomes are valuable because both give us data.`,
      tip: "Never run a test without a clear hypothesis. 'Let's see what happens' isn't a hypothesis.",
      quiz: {
        question: "When should performance testing begin?",
        options: [
          "Before the site launches",
          "On launch day",
          "After the site has been live long enough to gather meaningful baseline data",
          "Only if the client asks for it",
        ],
        correctIndex: 2,
        hint: "You need data before you can test — that means waiting for real traffic.",
      },
    },
    {
      id: "pt-2",
      title: "Allow Relevant Data to Be Gathered for First Test Analysis",
      content: `Before running any tests, we need baseline data.

**What data to gather:**
- Traffic volumes and patterns (daily, weekly trends)
- Current conversion rates (overall and by page/funnel step)
- Heatmap data showing where users click, scroll, and drop off
- Session recordings highlighting user behaviour patterns
- Bounce rates by page
- Device split (mobile vs desktop performance)
- Revenue and average order value trends

**How long to gather:**
Depends on the site's traffic volume. Low-traffic sites need more time. As a general rule, aim for at least 2-4 weeks of clean data with sufficient traffic to draw conclusions.

**What "clean data" means:**
- No major promotions or sales skewing the numbers
- No site changes during the data collection period
- Enough sessions to be statistically significant

**Documentation:**
Record all baseline metrics. You'll need these to measure the impact of your tests later.`,
      quiz: {
        question: "Why do we gather baseline data before running tests?",
        options: [
          "To delay starting the actual work",
          "To have a benchmark to measure test results against and ensure statistical significance",
          "Because the client wants a report",
          "To check if the tracking tools are installed",
        ],
        correctIndex: 1,
        hint: "You can't measure improvement without knowing where you started.",
      },
    },
    {
      id: "pt-3",
      title: "Results Communicated with Client",
      content: `Share the baseline findings and initial analysis with the client.

**What to present:**
- Key metrics and what they mean for the business
- Where users are dropping off or struggling
- Opportunities for improvement (backed by data)
- How performance testing works and what to expect

**How to present:**
Keep it simple. Clients don't need to know the technical details of heatmap analysis. They need to understand: "Here's what's happening, here's why it matters, and here's what we can do about it."

**Setting expectations:**
- Not every test will be a winner — that's normal
- Testing is iterative — we learn and improve over time
- Results take time — we need sufficient data for statistical significance
- The goal is long-term improvement, not overnight miracles`,
      tip: "Lead with the business impact, not the data. Clients care about revenue and conversions, not bounce rates.",
      quiz: {
        question: "How should results be communicated to the client?",
        options: [
          "Send a raw data spreadsheet",
          "Simply and clearly — focus on what's happening, why it matters, and what we can do about it",
          "Only share positive metrics",
          "Wait until we have test results before sharing anything",
        ],
        correctIndex: 1,
        hint: "Keep it business-focused and easy to understand.",
      },
    },
    {
      id: "pt-4",
      title: "Negative Results → Ideation / Positive Results → Upsell",
      content: `The data tells a story. How we respond depends on what it says.

**If results are negative (underperforming areas):**
This is an opportunity, not a failure. Negative results show us exactly where to focus.
- The CRO team digs deeper into why those areas are underperforming
- We move into ideation mode — brainstorming solutions
- This feeds directly into the next step (test design)

**If results are positive (strong performance):**
Great news for the client — and an opportunity for us.
- Highlight what's working well and why
- Propose expanding on successful patterns
- This is a natural upsell conversation: "The data shows your PDP is converting well. Imagine if we applied the same approach to your collection pages."

**The key insight:**
Both outcomes are valuable. Negative results give us a clear improvement path. Positive results validate the work and open doors for more.`,
      quiz: {
        question: "How should negative performance results be handled?",
        options: [
          "Hide them from the client",
          "Treat them as opportunities — they show exactly where to focus improvement efforts",
          "Blame the client's product",
          "Ignore them and run different tests",
        ],
        correctIndex: 1,
        hint: "Negative results aren't failures — they're signposts for improvement.",
      },
    },
    {
      id: "pt-5",
      title: "CRO Team Analyses Data & Suggests 3-4 Design Changes",
      content: `The CRO team takes the data and turns it into actionable test ideas.

**The analysis process:**
- Review heatmaps, session recordings, and funnel data
- Identify the highest-impact areas for improvement
- Research best practices and competitive approaches
- Prioritise opportunities by potential impact and effort

**The output — 3-4 suggested design changes:**
Each suggestion includes:
- **What to change** — specific element or section
- **Why** — the data that supports this change
- **Expected impact** — what improvement we anticipate
- **Effort level** — how complex the change is to implement

**Why 3-4 changes?**
It's the sweet spot. Enough options to give the client choice, but not so many that decisions get paralysed. Each suggestion should be meaningfully different from the others.

**Presentation:**
These suggestions are presented to the client for discussion and approval before any design or development work begins.`,
      tip: "Always lead with the 'why' — a suggestion backed by data is 10x more convincing than 'we think this would look better.'",
      quiz: {
        question: "How many design change suggestions does the CRO team typically present?",
        options: [
          "1 — take it or leave it",
          "3-4 changes with data-backed reasoning",
          "10+ options to overwhelm the client with choices",
          "As many as they can think of",
        ],
        correctIndex: 1,
        hint: "Enough for choice, not enough for paralysis.",
      },
    },
    {
      id: "pt-6",
      title: "Conversation with Client to Confirm Next Steps",
      content: `Present the suggested changes to the client and agree on what to test.

**The conversation:**
- Walk through each suggested change with the supporting data
- Explain the expected impact of each
- Discuss the client's priorities and preferences
- Agree on which changes to implement as tests
- Confirm timeline and resources needed

**What to expect:**
The client might have their own ideas or preferences. That's fine — combine their input with your data-driven suggestions to create the strongest test plan.

**Agreement:**
Both sides agree on the specific tests to run, the timeline, and any resources needed from the client. This is documented and tracked in ClickUp.`,
      quiz: {
        question: "What happens during the client conversation about test suggestions?",
        options: [
          "We tell the client what we're doing — no discussion",
          "We walk through suggestions with data, discuss priorities, and agree on which tests to implement",
          "We ask the client to come up with their own ideas",
          "We skip this and just start testing",
        ],
        correctIndex: 1,
        hint: "It's a collaborative conversation — data-led, but the client has input too.",
      },
    },
    {
      id: "pt-7",
      title: "Development of Confirmed Test & New Test Set Live",
      content: `The agreed tests are designed, built, and deployed.

**The process:**
1. **Design** — The designer creates the test variations based on the agreed changes
2. **Develop** — The developer implements the test using the A/B testing platform
3. **QA** — Test variations are reviewed for quality and accuracy
4. **Deploy** — The test goes live with proper traffic allocation

**Test setup best practices:**
- Clear control vs variation(s)
- Proper traffic split (usually 50/50 for two variants)
- Ensure tracking is capturing all relevant metrics
- Set a minimum run time based on traffic volume
- Don't peek at results too early — let the test reach statistical significance

**Monitoring:**
Keep an eye on the test during the first 24-48 hours to catch any technical issues. After that, let it run until you have significant results.

**What happens next:**
When the test reaches significance, analyse the results and start the cycle again — gather data, analyse, ideate, test, repeat.`,
      tip: "Resist the urge to call a test early. Premature conclusions lead to false positives. Let the data mature.",
      quiz: {
        question: "What should you do after deploying a test?",
        options: [
          "Check results after 1 hour and declare a winner",
          "Monitor for technical issues in the first 24-48 hours, then let it run until statistically significant",
          "Turn it off after 2 days regardless of results",
          "Run multiple tests on the same page simultaneously",
        ],
        correctIndex: 1,
        hint: "Quick monitoring for bugs, then patience for results.",
      },
    },
  ],
};

import type { Playbook } from "./types";

/* ================================================================
   6. RETAINER PERFORMANCE TESTING
   Ongoing monthly CRO testing for retainer clients
   ================================================================ */
export const retainerTesting: Playbook = {
  id: "retainer-performance-testing",
  title: "Retainer Performance Testing",
  description:
    "The ongoing monthly CRO testing cycle for retainer clients — from structure to ideation to continuous optimisation",
  category: "How We Work",
  estimatedMinutes: 18,
  steps: [
    {
      id: "rpt-1",
      title: "Retainer Performance Testing Begins",
      content: `Retainer Performance Testing is our ongoing optimisation service for clients on a monthly retainer.

**How it differs from one-off Performance Testing:**
- It's a **continuous cycle**, not a one-time engagement
- Testing is structured in **monthly sprints**
- There's a **consistent cadence** of analysis, ideation, testing, and reporting
- Results compound over time — each month builds on the last

**Who it's for:**
Clients who want ongoing conversion rate optimisation and continuous improvement of their site performance.

**The value proposition:**
Instead of a one-time test, the client gets a dedicated optimisation partner who is constantly learning from their data and improving their site month over month.`,
      quiz: {
        question: "How does retainer performance testing differ from one-off testing?",
        options: [
          "It's exactly the same process",
          "It's a continuous monthly cycle that builds on previous results over time",
          "It only runs for 2 months",
          "It doesn't require data analysis",
        ],
        correctIndex: 1,
        hint: "Think about the ongoing, compounding nature of retainer work.",
      },
    },
    {
      id: "rpt-2",
      title: "Monthly Testing Structure Explained to Client",
      content: `Before starting, the client needs to understand how the monthly testing structure works.

**The monthly cycle:**
1. **Week 1** — Data review and analysis from previous month
2. **Week 2** — Ideation and test planning
3. **Week 3** — Design and development of new tests
4. **Week 4** — Deploy tests and begin monitoring

**What the client receives each month:**
- Monthly performance report with key metrics
- Analysis of completed tests (wins, losses, learnings)
- Roadmap of upcoming tests with rationale
- Recommendations for the following month

**Tier-based testing:**
The scope of monthly testing depends on the client's retainer tier:
- Higher tiers = more tests per month, deeper analysis, more complex test variations
- Lower tiers = focused testing on highest-impact areas
- All tiers get the same quality of analysis and reporting

**Setting expectations:**
Be clear about what's achievable within their tier. Over-promising leads to disappointment.`,
      tip: "Under-promise and over-deliver on retainer work. Consistent small wins build more trust than one big promise you can't keep.",
      quiz: {
        question: "What determines the scope of monthly testing for a retainer client?",
        options: [
          "Whatever the CRO team feels like testing",
          "The client's retainer tier — higher tiers get more tests and deeper analysis",
          "The same scope for every client regardless of retainer size",
          "Only what the client specifically asks for",
        ],
        correctIndex: 1,
        hint: "The scope scales with the retainer level.",
      },
    },
    {
      id: "rpt-3",
      title: "Ideate on First 30 Days of Testing (Reflective of Tier)",
      content: `The first month sets the foundation. Plan it carefully.

**First 30 days planning:**
- Review all available data from the client's site
- Identify the highest-impact testing opportunities
- Plan tests that are appropriate for the client's tier
- Consider quick wins vs longer-term strategic tests
- Balance ambition with what's achievable in month one

**What to prioritise:**
Start with high-impact, lower-effort tests. Early wins build client confidence and prove the value of the retainer. Save complex, multi-variable tests for later months once you've established a baseline.

**Tier considerations:**
- **Lower tiers:** Focus on 1-2 high-impact tests. Be laser-focused on the biggest opportunity.
- **Higher tiers:** Plan 3-4 tests across different parts of the funnel. Cast a wider net.

**Documentation:**
Create a testing roadmap document that outlines the first month's plan. This becomes the foundation for the ongoing relationship.`,
      tip: "Win early. The first month's results set the tone for the entire retainer. Start with your strongest test ideas.",
      quiz: {
        question: "What should be prioritised in the first 30 days of retainer testing?",
        options: [
          "The most complex, ambitious tests possible",
          "High-impact, lower-effort tests that build client confidence with early wins",
          "Only tests the client specifically requests",
          "Redesigning the entire website",
        ],
        correctIndex: 1,
        hint: "Early wins build trust and prove the retainer's value.",
      },
    },
    {
      id: "rpt-4",
      title: "Present Monthly Roadmap",
      content: `Share the testing roadmap with the client for approval.

**What the roadmap includes:**
- Specific tests planned for the month
- The hypothesis behind each test (what we think will happen and why)
- Expected timeline for each test
- Resources needed from the client (if any)
- How results will be measured

**Presentation approach:**
- Walk the client through each planned test
- Explain the data that supports each hypothesis
- Be transparent about what we expect to learn (even if a test "loses")
- Get client buy-in before proceeding

**Why monthly roadmaps matter:**
They keep the client engaged and informed. A client who understands the plan is more likely to be patient with the process and trust the outcomes.

**Approval:**
The client approves the roadmap, and the team moves into execution. Any client-requested changes are incorporated before starting.`,
      quiz: {
        question: "Why do we present a monthly roadmap to retainer clients?",
        options: [
          "It's just a formality — we do what we want anyway",
          "To keep the client engaged, informed, and bought-in before we proceed",
          "To make the retainer look more expensive",
          "Only to meet contractual obligations",
        ],
        correctIndex: 1,
        hint: "Engaged clients trust the process and are patient with results.",
      },
    },
    {
      id: "rpt-5",
      title: "Once Approved — Design, Develop, Set Up First Tests",
      content: `The roadmap is approved. Time to execute.

**The execution flow:**
1. **Design** — Create test variations based on the approved roadmap
2. **Develop** — Build and implement the test variations
3. **QA** — Review the tests for quality and accuracy
4. **Set Up** — Configure the A/B testing platform with proper settings
5. **Deploy** — Launch the tests with correct traffic allocation

**Quality standards:**
Even though retainer work is ongoing, quality doesn't drop. Every test variation should meet the same design and development standards as a new build project.

**Testing platform setup:**
- Correct traffic split configured
- Tracking goals set up for all relevant metrics
- Minimum sample size calculated
- Test duration estimated based on traffic

**Communication:**
Let the client know when tests are live. A quick Slack message: "Your [test name] test is now live. We'll monitor for the first 48 hours and let you know if there are any issues."`,
      tip: "Treat every test variation like it could become the permanent version — because it might. Never cut corners on quality.",
      quiz: {
        question: "What's the execution flow after the roadmap is approved?",
        options: [
          "Just deploy whatever ideas we have",
          "Design → Develop → QA → Set Up → Deploy, with the same quality standards as a new build",
          "Skip design and go straight to development",
          "Ask the client to design the tests themselves",
        ],
        correctIndex: 1,
        hint: "It follows a structured process with no shortcuts on quality.",
      },
    },
    {
      id: "rpt-6",
      title: "Allow Relevant Data to Be Gathered for Test Analysis",
      content: `Tests are live. Now we wait for data.

**The waiting game:**
- Tests need sufficient traffic to reach statistical significance
- Don't peek at results and make premature calls
- Monitor for technical issues but don't interfere with the test
- Let the test run for the predetermined duration

**What to monitor during the test:**
- Technical health (no errors, no broken functionality)
- Traffic distribution (is the split working correctly?)
- Any external factors that might skew results (sales, promotions, seasonality)

**When to intervene:**
Only if there's a technical issue that's harming the user experience. Never stop a test early just because one variant looks like it's winning — early results are unreliable.

**Reporting during the test:**
If the client asks for an update mid-test, be honest: "The test is still running and we need more data before drawing conclusions. We'll have meaningful results by [date]."`,
      quiz: {
        question: "When should you stop a test early?",
        options: [
          "When one variant starts winning after 2 days",
          "Only if there's a technical issue harming the user experience",
          "Whenever the client asks for results",
          "After exactly one week regardless of data",
        ],
        correctIndex: 1,
        hint: "Early results are unreliable — only intervene for technical problems.",
      },
    },
    {
      id: "rpt-7",
      title: "Results Communicated with Client & Recorded",
      content: `The test has reached significance. Time to share and record the results.

**Communicating results:**
- Present results clearly with before/after metrics
- Explain what happened and why (based on the data)
- Highlight the business impact (revenue, conversions, not just percentage changes)
- Be transparent about tests that didn't win — the learning is still valuable
- Recommend next steps based on the results

**Recording results:**
Every test result is documented and stored. This creates a knowledge base that:
- Informs future tests (what works, what doesn't for this client)
- Shows the cumulative impact of the retainer over time
- Provides evidence for the value of ongoing optimisation

**What to record:**
- Test hypothesis
- Control vs variation(s) description
- Traffic and duration
- Results (conversion rate, revenue impact, statistical significance)
- Learnings and recommendations`,
      tip: "Build a 'test library' for each retainer client. Over time, it becomes incredibly valuable for spotting patterns and informing strategy.",
      quiz: {
        question: "Why is it important to record all test results?",
        options: [
          "Just for billing purposes",
          "To build a knowledge base that informs future tests and demonstrates cumulative retainer value",
          "Because the client contractually requires it",
          "Only winning tests need to be recorded",
        ],
        correctIndex: 1,
        hint: "Past results inform future strategy and prove the retainer's value over time.",
      },
    },
    {
      id: "rpt-8",
      title: "CRO Team Ideates on Results — Next Test or Pivot",
      content: `Results are in. The cycle continues.

**What happens now:**
The CRO team reviews the test results and decides the next move:

**If the test won:**
- Implement the winning variation permanently
- Identify what made it successful
- Look for opportunities to apply the same principle elsewhere on the site
- Plan the next test that builds on this success

**If the test lost:**
- Analyse why it didn't work
- Identify what we learned from the loss
- Pivot — try a different approach to the same problem, or move to a different opportunity
- Don't repeat the same test with minor tweaks — if it lost, the approach needs to change

**If the test was inconclusive:**
- Review whether we had enough traffic
- Consider extending the test or redesigning it
- Look at secondary metrics — even if the primary goal didn't change, did user behaviour shift?

**The ongoing cycle:**
This step feeds directly back into the monthly roadmap. The cycle repeats: analyse → ideate → plan → execute → measure → repeat.

**The compounding effect:**
Each month's learnings make the next month's tests smarter. Over time, the CRO team builds deep expertise in what works for this specific client, leading to bigger and more consistent wins.`,
      tip: "The best retainer relationships are the ones where each month builds on the last. Keep a running 'insights' document that captures everything you've learned about this client's audience.",
      quiz: {
        question: "What feeds the next month's testing roadmap?",
        options: [
          "Random ideas from the team",
          "Whatever the client asks for",
          "Analysis and learnings from the current month's test results",
          "The same tests repeated every month",
        ],
        correctIndex: 2,
        hint: "Each month's results inform the next month's strategy — that's the compounding effect.",
      },
    },
  ],
};

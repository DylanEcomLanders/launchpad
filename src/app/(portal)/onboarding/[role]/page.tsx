"use client";

import { Logo } from "@/components/logo";
import { useParams } from "next/navigation";

export default function OnboardingPage() {
  const { role } = useParams();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-[#E8E8E8]">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Logo height={18} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Ecom Landers</h1>
          <p className="text-[#777] text-sm">
            {role === "cro"
              ? "Everything you need to know about how we work as a CRO strategist."
              : "Everything you need to know about working with us."}
          </p>
        </div>

        {/* Who We Are */}
        <Section title="Who We Are">
          <p>Ecom Landers is a Shopify-focused CRO and page build agency. We design, develop, and optimise high-converting landing pages, product pages, and funnels for DTC ecommerce brands.</p>
          <p>Our core services are:</p>
          <ul>
            <li><strong>CRO Retainers</strong> — ongoing A/B testing programmes (weekly test cadence)</li>
            <li><strong>Page Builds</strong> — custom Shopify page design and development (PDPs, homepages, collection pages, advertorials)</li>
            <li><strong>Full Funnel Strategy</strong> — traffic architecture, landing page strategy, and conversion optimisation</li>
          </ul>
        </Section>

        {/* How We're Structured */}
        <Section title="How We're Structured">
          <p>We operate as a distributed team across multiple time zones. Key people you'll work with:</p>
          <ul>
            <li><strong>Dylan Evans</strong> — COO. Oversees operations, client delivery, and strategy.</li>
            <li><strong>Ajay</strong> — Founder. Leads sales, partnerships, and growth.</li>
            <li><strong>Alister</strong> — Senior PM. Manages project timelines, client touchpoints, and delivery coordination.</li>
            <li><strong>Archie</strong> — Head of Development. Leads the dev team and QA.</li>
            <li><strong>Design Team</strong> — Barnaby (Senior Designer), Viktoria, Jack, Brandon, Anastasia</li>
            <li><strong>Dev Team</strong> — Angel, Ian, Clien, Hitesh, Ashish, Aleksandar, Kaye, Rafael</li>
          </ul>
        </Section>

        {/* Tools We Use */}
        <Section title="Tools We Use">
          <div className="space-y-3">
            <ToolRow name="Slack" desc="All communication. Each client has their own channel. Internal channels for design, dev, ops." />
            <ToolRow name="ClickUp" desc="Task and project management. All tickets, sprints, and deliverables are tracked here." />
            <ToolRow name="Figma" desc="All design work. Page designs, test variants, design systems." />
            <ToolRow name="Shopify" desc="All client stores are on Shopify. We build custom Liquid sections." />
            <ToolRow name="Intelligems" desc="A/B testing platform for Shopify. We set up, run, and analyse split tests here." />
            <ToolRow name="Launchpad" desc="Our internal tool built with Claude Code (ecomlanders.app). Infinitely adaptable to fit our processes — client portals, project management, CRO dashboards, ticket system, and more. We continuously evolve it to improve client experience and team efficiency." />
          </div>
        </Section>

        {/* CRO Retainer Process */}
        {(role === "cro" || !role) && (
          <>
            <Section title="CRO Retainer — How It Works">
              <p>Retainer clients pay a monthly fee for ongoing A/B testing. The amount of tests per week depends on their tier:</p>
              <div className="border border-[#E5E5EA] rounded-lg overflow-hidden my-4">
                <div className="grid grid-cols-4 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                  <span>Tier</span><span>Tests/Week</span><span>Tests/Month</span><span>Cadence</span>
                </div>
                <div className="grid grid-cols-4 px-4 py-3 border-b border-[#F0F0F0] text-xs">
                  <span className="font-medium">Foundation</span><span>1</span><span>4</span><span>Weekly</span>
                </div>
                <div className="grid grid-cols-4 px-4 py-3 border-b border-[#F0F0F0] text-xs">
                  <span className="font-medium">Growth</span><span>2</span><span>8</span><span>Weekly</span>
                </div>
                <div className="grid grid-cols-4 px-4 py-3 text-xs">
                  <span className="font-medium">Scale</span><span>4</span><span>16</span><span>Weekly</span>
                </div>
              </div>
            </Section>

            <Section title="Test Lifecycle">
              <p>Every test follows this flow:</p>
              <div className="space-y-4 my-4">
                <Step num="1" title="Ideation" desc="Identify the hypothesis. What are we testing, why, and what outcome do we expect? This should be informed by data — analytics, heatmaps, customer feedback, competitor analysis." />
                <Step num="2" title="Design" desc="Designer creates the test variant in Figma. You review the design to ensure the copy, angle, and structure align with the hypothesis." />
                <Step num="3" title="Development" desc="Developer builds the variant in Shopify. QA checks it before going live." />
                <Step num="4" title="Scheduled" desc="Test is ready to deploy. Set up in Intelligems with correct traffic split and goals." />
                <Step num="5" title="Live" desc="Test is running. Monitor for any issues. Don't call it too early — let it reach statistical significance." />
                <Step num="6" title="Complete" desc="Analyse results. Document the outcome — winner, loser, or inconclusive. Share learnings. Plan the next test." />
              </div>
              <p className="text-[#777] text-sm italic">Key rule: you should always be one week ahead. While this week's test is live, next week's test should already be in "Scheduled" (designed and ready to go).</p>
            </Section>

            <Section title="The Bigger Picture — Testing as a Growth Engine">
              <p>Testing isn&apos;t just about improving a single page. It&apos;s our foot in the door to managing the client&apos;s entire funnel.</p>
              <p>Every test we run generates data. That data tells us what&apos;s working, what&apos;s not, and — most importantly — <strong>what to build next</strong>. When a hero test wins, we know the angle resonates. That informs the next PDP, the next advertorial, the next landing page.</p>
              <p>Your job isn&apos;t just to run tests. It&apos;s to use the results to guide the client&apos;s funnel expansion. You should always be thinking:</p>
              <ul>
                <li>What&apos;s the highest-leverage page to build next based on what we&apos;ve learned?</li>
                <li>Where is the funnel leaking and how do we plug it?</li>
                <li>What angles are winning in tests that we can extend to other pages?</li>
                <li>How do we turn a retainer client into a full funnel partner?</li>
              </ul>
              <p>We want to be the team that doesn&apos;t just optimise pages — we architect the entire conversion journey. Testing is how we earn that trust.</p>
            </Section>

            <Section title="Your Responsibilities — Retainers">
              <ul>
                <li><strong>Test strategy</strong> — Decide what to test each week based on data, not guesswork</li>
                <li><strong>Hypothesis writing</strong> — Clear, specific hypotheses for every test</li>
                <li><strong>Design review</strong> — Review every design variant before it goes to dev. Check copy, angle, structure.</li>
                <li><strong>Intelligems setup</strong> — Configure tests correctly (traffic split, goals, targeting)</li>
                <li><strong>Results analysis</strong> — Break down what happened, why, and what it means for the next test</li>
                <li><strong>Client reporting</strong> — Weekly updates on test performance (managed through the client portal)</li>
                <li><strong>Staying ahead</strong> — Next week's test should be ideated while this week's is live</li>
              </ul>
            </Section>

            <Section title="Your Responsibilities — Page Builds">
              <p>When a retainer or project client has a page build, you provide CRO oversight across 4 touchpoints:</p>
              <div className="space-y-4 my-4">
                <Step num="1" title="Pre-Design Audit" desc="Review the client's current page/funnel. Identify the highest-leverage plays. Define the angle and copy direction before the designer starts." />
                <Step num="2" title="Design Review" desc="Work closely with the designer during the design phase. Review copy, page structure, CTA placement, social proof positioning. Make sure the page converts, not just looks good." />
                <Step num="3" title="Funnel Strategy" desc="Where does this page sit in the client's funnel? What traffic warmth is it serving? What's the next highest-leverage page to build?" />
                <Step num="4" title="Post-Launch Analysis" desc="Once the page goes live and a test is running, break down the performance. What's working? What needs iterating?" />
              </div>
            </Section>
          </>
        )}

        {/* Communication */}
        <Section title="Communication">
          <ul>
            <li><strong>Slack</strong> is the primary channel. Each client has their own Slack channel.</li>
            <li><strong>Touchpoints</strong> are Mon / Wed / Fri. These are the days we check in with clients and review progress.</li>
            <li><strong>Tickets</strong> — clients log issues via <code>/ticket</code> in Slack. These get triaged as Design or Dev tickets and assigned to the right person automatically via ClickUp.</li>
            <li><strong>Updates</strong> go through the client portal. Loom recordings for walkthroughs, written updates for results.</li>
          </ul>
        </Section>

        {/* Client Portal */}
        <Section title="Client Portal">
          <p>Every client has a portal at ecomlanders.app. This is their single source of truth. It shows:</p>
          <ul>
            <li>Project timeline and current phase</li>
            <li>Design reviews (Figma embeds)</li>
            <li>Development staging links (version controlled)</li>
            <li>Test results and A/B test data</li>
            <li>Key documents (scope, roadmap, agreements)</li>
            <li>Ad hoc requests / tickets</li>
          </ul>
          <p>As a CRO strategist, you'll use the portal to review test data, update test statuses, and track the monthly test cadence.</p>
        </Section>

        {/* Quality Standards */}
        <Section title="Quality Standards">
          <ul>
            <li><strong>Never guess</strong> — every test hypothesis should be backed by data or a clear rationale</li>
            <li><strong>Never call a test early</strong> — wait for statistical significance before declaring a winner</li>
            <li><strong>Document everything</strong> — every test should have a clear hypothesis, result, and learning documented</li>
            <li><strong>Stay ahead</strong> — the biggest risk to retainer retention is gaps between tests. Keep the cadence tight.</li>
            <li><strong>Client communication</strong> — be proactive. Don't wait for clients to ask for updates. Share wins immediately, share learnings weekly.</li>
          </ul>
        </Section>

        {/* Intelligems Deep Dive */}
        {(role === "cro" || !role) && (
          <Section title="Intelligems — How We Use It">
            <p>Intelligems is our A/B testing platform. Every test runs through it. Here&apos;s what you need to know:</p>
            <h3 className="text-sm font-bold text-[#1A1A1A] mt-4 mb-2">Setting Up a Test</h3>
            <ol>
              <li>Create the experiment in Intelligems — name it clearly (e.g. &quot;Test 4.1 — Hero CTA Copy&quot;)</li>
              <li>Set traffic split (usually 50/50 for two variants)</li>
              <li>Define the goal metric — CVR is primary, but always track AOV and RPV too</li>
              <li>Set the page targeting — which URLs the test runs on</li>
              <li>QA both variants before going live</li>
            </ol>
            <h3 className="text-sm font-bold text-[#1A1A1A] mt-4 mb-2">Reading Results</h3>
            <p>The three metrics that matter most:</p>
            <ul>
              <li><strong>CVR (Conversion Rate)</strong> — % of visitors who purchase. The primary metric.</li>
              <li><strong>AOV (Average Order Value)</strong> — how much each buyer spends. Important for price tests.</li>
              <li><strong>RPV (Revenue Per Visitor)</strong> — CVR × AOV. The ultimate metric. A test can lose on CVR but win on RPV if AOV increases enough.</li>
            </ul>
            <p className="text-[#777] italic mt-2">Never call a test based on CVR alone. RPV tells the full story. A variant that converts 5% less but has 15% higher AOV is often the winner.</p>
            <h3 className="text-sm font-bold text-[#1A1A1A] mt-4 mb-2">Statistical Significance</h3>
            <p>Don&apos;t call a test until you have enough data. Rules of thumb:</p>
            <ul>
              <li>Minimum 1,000 visitors per variant (ideally 2,000+)</li>
              <li>Run for at least 7 days to account for day-of-week variation</li>
              <li>Look for 95%+ confidence before declaring a winner</li>
              <li>If results are flat after 2 weeks with enough traffic, call it inconclusive and move on</li>
            </ul>
            <h3 className="text-sm font-bold text-[#1A1A1A] mt-4 mb-2">Test ID Integration</h3>
            <p>Each test in Intelligems has a unique ID. When you set up a test in our Launchpad portal, paste the Intelligems test ID into the test card. This connects the live metrics directly — CVR, AOV, RPV auto-populate from Intelligems data.</p>
          </Section>
        )}

        {/* Common Test Types */}
        {(role === "cro" || !role) && (
          <Section title="Common Test Types">
            <p>These are the tests we run most frequently. Each has different implications:</p>
            <div className="space-y-4 my-4">
              <Step num="H" title="Hero / Above the Fold" desc="Headline copy, hero image, CTA text, value proposition placement. Highest impact area — small changes here move the needle significantly." />
              <Step num="S" title="Social Proof Placement" desc="Where reviews, star ratings, trust badges, and testimonials appear. Moving social proof above the fold almost always wins." />
              <Step num="C" title="CTA Copy & Design" desc="Button text, colour, size, placement. 'Add to Cart' vs 'Get Yours' vs 'Try Risk Free'. The words on the button matter more than the colour." />
              <Step num="P" title="Price Presentation" desc="How price is displayed — strikethrough, per-day breakdown, subscription framing, bundle pricing. Sensitive tests that need careful monitoring." />
              <Step num="L" title="Layout & Structure" desc="Page section order, content hierarchy, information architecture. Bigger structural changes that test fundamental page flow." />
              <Step num="I" title="Image & Media" desc="Product photography, lifestyle vs studio, video vs static, image carousel vs single hero. Visual tests that impact emotional response." />
            </div>
          </Section>
        )}

        {/* Niche Considerations */}
        {(role === "cro" || !role) && (
          <Section title="Niche-Specific Approaches">
            <p>Different niches have different conversion psychology. Adapt your approach:</p>
            <ul>
              <li><strong>Supplements / Health</strong> — trust is everything. Clinical language vs customer language. Ingredient transparency. Subscription positioning is key for LTV. Guarantee prominence matters hugely.</li>
              <li><strong>Skincare / Beauty</strong> — emotional, aspirational. Before/after results. Routine-based selling. Ingredient education. UGC performs extremely well.</li>
              <li><strong>Pet</strong> — emotional connection to the animal drives purchase. Real photography outperforms illustration. Community angle is powerful. Training/education content adds value beyond the product.</li>
              <li><strong>Food & Beverage</strong> — sensory language. Subscription is the business model. Flavour variety reduces decision paralysis. Social proof from recognisable names converts.</li>
              <li><strong>Fitness / Sports</strong> — outcome-focused. Before/after transformations. Performance data and specifics. Athlete endorsements carry weight.</li>
            </ul>
            <p className="text-[#777] italic mt-2">The best tests come from understanding the customer&apos;s psychology in that specific niche, not from generic CRO playbooks.</p>
          </Section>
        )}

        {/* ClickUp Workflow */}
        <Section title="ClickUp Workflow">
          <p>All tasks are managed in ClickUp. Here&apos;s how it flows:</p>
          <ul>
            <li><strong>Project Delivery</strong> space — where all client work lives</li>
            <li><strong>Tickets list</strong> — client-reported issues from Slack (<code>/ticket</code> command)</li>
            <li>When a ticket is triaged in Launchpad as &quot;Design&quot; or &quot;Dev&quot;, it auto-creates a ClickUp task assigned to the right person</li>
            <li>Design tickets go to designers, Dev tickets go to developers based on who&apos;s assigned to that client&apos;s portal</li>
          </ul>
          <p>As a CRO strategist, you won&apos;t be managing ClickUp tasks directly — but you should be aware of what&apos;s in the pipeline so you can coordinate with design and dev on test variant timelines.</p>
        </Section>

        {/* Slack Channels */}
        <Section title="Slack Channel Structure">
          <p>Our Slack workspace is organised around clients and functions:</p>
          <ul>
            <li><strong>Client channels</strong> — <code>internal-[clientname]</code> for internal discussion, shared channels with client for direct comms</li>
            <li><strong>ecomlanders-operations</strong> — company-wide ops updates</li>
            <li><strong>ecomlanders-design</strong> — design team coordination</li>
            <li><strong>ecomlanders-dev</strong> — development team</li>
            <li><strong>ecomlanders-qa</strong> — QA and testing</li>
            <li><strong>ideas</strong> — internal ideas and brainstorming</li>
          </ul>
          <p>When you start, you&apos;ll be added to the relevant client channels. Keep client-specific discussions in client channels, not DMs.</p>
        </Section>

        {/* Handling Blockers */}
        <Section title="Handling Blockers">
          <p>Sometimes work gets blocked — client hasn&apos;t responded, waiting on assets, technical issue. Here&apos;s how we handle it:</p>
          <ul>
            <li><strong>Flag it immediately</strong> — don&apos;t sit on a blocker. Use the blocker flag in the client portal.</li>
            <li><strong>Three types</strong>: Client blocker (waiting on them), Internal blocker (our side), External blocker (third party)</li>
            <li><strong>Escalate after 48 hours</strong> — if a client blocker isn&apos;t resolved in 2 days, escalate to Alister or Dylan</li>
            <li><strong>Never let a blocker kill the cadence</strong> — if one test is blocked, have a backup test ready to go</li>
          </ul>
        </Section>

        {/* Client Retention */}
        {(role === "cro" || !role) && (
          <Section title="Client Retention — Your Role">
            <p>Retainer retention is directly tied to the quality and consistency of your work. The biggest reasons clients churn:</p>
            <ul>
              <li><strong>Gaps in testing</strong> — weeks with no live test = client questions the value</li>
              <li><strong>No clear wins</strong> — if you&apos;re not finding winners, the client questions the investment</li>
              <li><strong>Poor communication</strong> — client doesn&apos;t know what&apos;s happening = they assume nothing is</li>
              <li><strong>Reactive not proactive</strong> — waiting for the client to ask for updates vs sharing them first</li>
            </ul>
            <p>The antidote is simple: <strong>consistent testing cadence + proactive communication + strategic thinking about their funnel</strong>. If you&apos;re doing all three, clients stay.</p>
          </Section>
        )}

        {/* Getting Started */}
        <Section title="Getting Started">
          <p>Here&apos;s what to do in your first week:</p>
          <ol>
            <li>Sign your NDA (link will be sent separately)</li>
            <li>Get added to Slack — you&apos;ll be invited to relevant client channels</li>
            <li>Get ClickUp access — Alister will set you up</li>
            <li>Get Intelligems access for each client you&apos;ll manage</li>
            <li>Review each client&apos;s portal to understand where they are in their testing cycle</li>
            <li>Audit each client&apos;s current store — note quick wins and high-leverage opportunities</li>
            <li>Review the test history for each client — understand what&apos;s been tested and what&apos;s worked</li>
            <li>Familiarise yourself with each client&apos;s niche, competitors, and customer profile</li>
            <li>Schedule an intro call with Dylan to align on strategy for each client</li>
            <li>Prepare your first week&apos;s test hypotheses for review</li>
          </ol>
        </Section>

        {/* What Success Looks Like */}
        <Section title="What Success Looks Like">
          <ul>
            <li>Every client has a test live every week without gaps</li>
            <li>Next week&apos;s test is always ideated and scheduled before this week&apos;s test ends</li>
            <li>Win rate of 30%+ across all tests (not every test needs to win — learning is valuable)</li>
            <li>Clients proactively want to expand their funnel based on your recommendations</li>
            <li>Zero missed touchpoints — Mon/Wed/Fri check-ins happen consistently</li>
            <li>Test documentation is thorough enough that anyone could pick up where you left off</li>
          </ul>
        </Section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[#E8E8E8]">
          <p className="text-xs text-[#AAA]">
            Ecom Landers Ltd. · This document is confidential and intended for internal use only.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">{title}</h2>
      <div className="text-sm text-[#555] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_li]:text-sm [&_code]:bg-[#F3F3F5] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono">
        {children}
      </div>
    </section>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="size-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shrink-0">
        {num}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
        <p className="text-sm text-[#777] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ToolRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#F0F0F0] last:border-0">
      <span className="text-sm font-semibold text-[#1A1A1A] w-28 shrink-0">{name}</span>
      <span className="text-sm text-[#777]">{desc}</span>
    </div>
  );
}

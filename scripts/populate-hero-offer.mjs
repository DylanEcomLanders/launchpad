#!/usr/bin/env node
/* ── One-shot populate of Hero Offer with the playbook content ──
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY from
 * .env.local (or the parent shell env), wipes the six offer_* tables,
 * and inserts the v1 playbook content. Idempotent: re-running gives
 * the same result.
 *
 * Run from the launchpad root:
 *   node scripts/populate-hero-offer.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

/* Tiny .env.local parser. Avoids pulling dotenv just for this script. */
function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function wipe(table) {
  /* Delete every row. Using ?id=neq.__never__ matches all. */
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?id=neq.__never__`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok && res.status !== 404) {
    const t = await res.text();
    throw new Error(`Wipe ${table} failed: ${res.status} ${t}`);
  }
}

async function insert(table, rows) {
  if (rows.length === 0) return;
  const payload = rows.map((r) => {
    const { id, ...rest } = r;
    /* Hero Offer tables use updated_at (per migration 031), not the
     * created_at column the generic createStore pattern writes. */
    return { id, data: rest, updated_at: new Date().toISOString() };
  });
  const res = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Insert ${table} failed: ${res.status} ${t}`);
  }
}

function id(prefix, i) {
  return `${prefix}-${String(i).padStart(2, "0")}`;
}

const now = new Date().toISOString();

/* ── Content ─────────────────────────────────────────────────── */

const startSections = [
  {
    title: "What this playbook is",
    body: `- The one place that explains the whole Ecom Landers machine: how we sell the Conversion Engine, how we deliver it, and how we keep clients past Day 30.
- Directional. Its primary job is to guide what we build inside Launchpad and to brief Claude, so the systems we build match how we actually operate.
- Built so a new contractor or hire can understand the full operation without a founder walking them through it line by line.
- Internal only. Some sections reference client-facing collateral (decks, proposals, reports), but the playbook itself stays in house.
- A living document, reviewed biweekly with one lens: are we delivering what we sold.`,
  },
  {
    title: "How it is organised",
    body: `After this index and a short glossary, the playbook has three core sections. They follow the client journey in order, so the document reads the way a client experiences us.

**Acquisition:** how to win the deal. First touch to signed retainer. Sales motion, ICP, pricing, the guarantee, outreach, the sales call, objections, the closing kit, and the collateral.

**Execution:** how to wow on delivery. The Discovery Audit, the week-one deep dive, the roadmap and briefs, the build cycle, the testing engine, the deliverables matrix, reporting, and the wow bar for every layer.

**Retention:** how to make it last. First-week wow, the lifecycle milestones, comms cadence, at-risk signals, expansion levers, and the resource templates that support all of it.`,
  },
  {
    title: "Who maintains each section",
    body: `Every section has one owner who keeps it true to how we actually work. CSM and PM are the overarching owners of the playbook; the specific owner can shift by stage. Review is biweekly across the board.

| Section | Primary owner | Supporting input | Review |
| --- | --- | --- | --- |
| Start Here | Founder | - | Biweekly |
| Glossary | Founder | - | Biweekly |
| Acquisition | Founder + CRO Lead | CSMs (objections, call notes) | Biweekly |
| Execution | CRO Lead | Design Lead, Dev Lead | Biweekly |
| Retention | CSM + PM | CRO Lead | Biweekly |`,
  },
  {
    title: "How to use it day to day",
    body: `**As training.** New to the team? Read all three sections in order before your first live client touchpoint. You are expected to know what is in here.

**As reference.** Need the discovery call structure, the design brief, or the Day 90 checklist? Go straight to it. The contents page is built for jumping.

**Templates are meant to be copied.** Duplicate and fill them in. Do not rewrite the structure from scratch each time. The structure is the standard.

**When reality diverges from the doc, fix the doc.** If you are working in a way the playbook does not describe, flag it to the section owner so it gets updated. We do not run two versions of the truth.`,
  },
  {
    title: "Glossary",
    body: `Plain definitions for the terms used throughout. If a word here means something specific to us, this is what it means.

| Term | Meaning |
| --- | --- |
| Conversion Engine | Our core offer. A monthly retainer that owns a brand's funnel and testing programme end to end. Sold in three tiers: Entry, Core, VIP. |
| Hero Offer | The name of this playbook. Our single source of truth for how we win, deliver, and retain. |
| Pod | A four-person delivery unit: designer, secondary designer, developer, secondary developer. |
| CRO Lead / Strategist | Owns conversion strategy. Runs the Discovery Audit and deep dive, builds the roadmap, and calls tests. |
| CSM | Client Success Manager. Owns the client relationship after the sale. |
| PM | Project Manager. Keeps delivery moving across pods. |
| Design Lead / Dev Lead | Hold the quality gate. QA and final sign-off before anything reaches a client. |
| Discovery Audit | The £1,000 paid pre-signup audit for warm leads. A branded slide deck plus a prioritised plan, delivered in 72 hours, credited against the retainer. |
| Cold teardown | A free, lightweight version of the audit. Gives cold leads value without burning strategist time. |
| ICE | A prioritisation score: Impact, Confidence, Ease. Used to rank roadmap items. |
| Significance | The confidence threshold a test must reach before we call it. Set by the strategist. |
| QBR | Quarterly Business Review. A formal strategic review held with VIP clients. |
| Launchpad | Our internal operations platform, where the systems in this playbook (audit deck, contracts, reports) are built. |
| Brain library | The patterns of what works, held across the team from hundreds of Shopify stores. Our experiential moat, not yet a documented asset. |
| 90-day minimum | The core client commitment. Every retainer runs a 90-day minimum term, then rolls month to month. |`,
  },
];

const acquisitionSections = [
  {
    title: "Sales motion: the three paths in",
    body: `Every new retainer arrives through one of three paths. They differ by how warm the relationship is when the retainer conversation starts.

- **Existing client to retainer (upsell).** The warmest path. A client we already have a working relationship and results with, most often from a one-off project. Deliver the one-off well, then convert.
- **Lead to warm to retainer.** An inbound or referred lead who already trusts us through content, referral, or network. Warm enough to go toward a retainer without a paid audit, though a warm lead can still buy the Discovery Audit if they want to start smaller.
- **Lead to cold to audit to retainer.** A cold lead with no prior trust. We do not pitch the retainer cold. The free cold teardown gives them value, the call earns the next step, and the paid audit earns the retainer.`,
  },
  {
    title: "ICP and disqualification",
    body: `Who we are built to serve, and who we turn away. A bad-fit client costs more than the revenue is worth: they churn, they pollute our results data, and they eat capacity a good-fit client would have turned into a case study.

**Who fits**
- Shopify DTC brands. Shopify only.
- Doing roughly £200,000 per month or more in revenue, which gives the order volume to run statistically meaningful tests.
- A single decision-maker who can approve and ship changes without a committee.
- Willing to commit to the 90-day minimum.
- Already converting at some baseline. We optimise a working funnel, we do not rescue a broken product.

**Who does not fit**
- Below the revenue floor, where tests cannot reach significance in a reasonable window.
- Pre-product-market-fit or pre-launch.
- A founder who will not let us change the live site or insists on signing off every pixel.
- Expecting a specific guaranteed revenue number regardless of their own traffic and spend.
- Marketplace or Amazon-dependent with thin owned-site traffic.

No category exclusions. Any ecommerce category is fine as long as it is ecom and on Shopify. One-off page projects are welcome when the conversation is not heading toward a retainer; treat them as a retainer on-ramp.

**Tier fit by revenue band** (a starting recommendation, not a rigid rule)

| Monthly revenue | Recommended tier |
| --- | --- |
| £200k to £400k | Entry (£5k) |
| £400k to £800k | Core (£10k) |
| £800k and up | VIP (£15k) |`,
  },
  {
    title: "The guarantee",
    body: `We back the 90-day term with a guarantee, and it is designed to reinforce that term rather than undercut it.

**We guarantee a measurable increase in conversion rate within the 90-day term, or we keep working at no further cost until you get one.** [DYLAN: define the measurable threshold.]

**Why conversion rate and not revenue:** revenue is pushed around by traffic, ad spend, and seasonality, none of which we control. Conversion rate is far closer to what our work actually moves, so it is the defensible thing to guarantee.

**Conditions.** The client ships the changes we recommend, keeps traffic roughly at baseline, does not run conflicting changes, and gives us the access and data we need. We cannot guarantee results on work that never goes live.

**Remedy.** If we miss, we keep working free until we hit it. This costs us time, not a cash refund, and it leans into the 90-day term.

**Scope.** Applies to all three tiers.`,
  },
  {
    title: "Entry products: Discovery Audit and cold teardown",
    body: `Two paid-and-free entry points sit ahead of the retainer. Full structure is in Execution; here is what they are and who they are for.

**Discovery Audit (£1,000).** The warm-lead buy-in. A deep dive from the strategist, delivered as a branded slide deck plus a prioritised plan, turned around in 72 hours. The fee is credited against the retainer if they move forward, so buying it is risk-free if they go on to work with us.

**Cold teardown (free).** The cold-lead hook. A short, lightweight teardown that gives a cold lead real value without burning strategist time on someone who may never pay. It warms them toward the call or the paid audit. [DYLAN: confirm format, e.g. a short Loom or a one-page set of observations.]`,
  },
  {
    title: "Outreach playbook",
    body: `Outreach is run by our external outbound agency, targeting a 15-minute speed-to-lead. Its job is not to sell the retainer in a message. It is to give a base idea of what we do and earn the next call. On that call, cold leads get the teardown or the audit, warm leads get taken toward the retainer.

**Hard rule: no invented results.** Where a script has a proof slot, it stays empty until a real, cleared number or case exists. Case studies are our current priority gap and the single biggest unlock for cold reach.

### Cold email

Short, specific, about them and not us, one CTA. Lead with a true observation about their store so it is obvious we looked.

**Template A, the specific-observation angle (no proof required):**

> Subject: quick thing on [Brand]'s [PDP / cart / etc.]
>
> Hi [First name],
>
> [One specific, true observation, for example: your PDP pushes reviews below three scrolls, or your cart has no trust markers above the fold]. At your scale that is the kind of thing quietly costing you conversions every day.
>
> We are Ecom Landers. We own the funnel and testing programme for Shopify brands so they stop guessing at what to change.
>
> Worth 15 minutes for me to walk you through what I am seeing? No deck, no pitch, just the issues.

**Template B, the proof angle (requires a real case):**

> Subject: [result type] for [comparable brand type]
>
> Hi [First name],
>
> We recently [true, specific work for a comparable brand, for example: rebuilt the PDP and checkout flow for a brand at a similar scale]. [DYLAN: insert a real outcome here, or leave blank. Never an invented number.]
>
> You are in a similar spot. Happy to show you the exact changes on a short call and where I would start on [Brand].
>
> Open to it?

### LinkedIn DM

Connection-first, value before the ask.

**Connection note:** Hi [First name], I work with Shopify brands at your scale on conversion. Liked [specific true thing about their brand or post]. Worth connecting.

**After they accept (1 to 2 days later):** Thanks for connecting. I had one specific thought on your [PDP / checkout] that is probably costing you a little. Happy to share it on a quick call, or just drop it here, whichever you prefer.

Giving them the option to get the insight without a call lowers resistance and usually produces the call anyway.

### Follow-up cadence

Finite, and every touch must add something. No empty bumping messages. Starting cadence, to be refined by testing:

- **Day 0:** initial message.
- **Day 3:** short bump that adds a new observation or proof point.
- **Day 7:** switch the CTA to the audit, for example: rather than go back and forth, our Discovery Audit maps exactly what to fix and in what order.
- **Day 14:** break-up message. I will assume the timing is not right and close this off, door stays open.
- **After that:** long-term nurture, re-touch later. Stop manual chasing. [DYLAN: nurture interval.]`,
  },
  {
    title: "Sales call structure",
    body: `Run by Dylan or Ajay today, by trained closers as volume grows. This is the script spine. It does both jobs the call has to do: sell the audit or teardown to a cold lead, and sell the retainer to a warm one. Same backbone, different close. The motion is usually a value-led sequence of calls, not a single close: every call ends with a booked next step or a clean no, never a vague maybe.

### Phase 1: Frame (first 2 to 3 minutes)

Set the agenda, take polite control.

> "Thanks for jumping on. Here is how I run these so we do not waste your time: I will ask a few questions about the brand and where you think you are leaving money on the table, then show you specifically how we would approach it, and if it is a fit we will talk about working together. If it is not a fit, I will tell you straight. Sound good?"

Agreement on the agenda earns the right to ask hard questions and to close at the end.

### Phase 2: Discovery (the bulk of the call)

Get them to name the problem and its cost in their own words. Whoever diagnoses, prescribes.

- Roughly what is the brand doing in monthly revenue right now? (Qualifies tier fit against the band.)
- Where do you think you are losing the most money in the funnel?
- What have you already tried on conversion, and what happened? (Surfaces the tried-CRO-before objection early, on our terms.)
- Who owns the site and testing today, and who can approve changes? (Qualifies the single-decision-maker rule.)
- If we lifted [the metric they care about] over the next 90 days, what is that worth to you? (They size the prize themselves.)
- Why now? What made you look at this today? (Real urgency, or its absence.)

Listen for the disqualifiers. If they fail one, say so and end the call cleanly. A clean no builds more trust than forcing a bad deal.

### Phase 3: Demo (show, do not tell)

Prove competence by reacting to their store live, not by running slides about us.

- Pull up their site on the call. Walk one or two specific, high-impact frictions. Tie each to revenue.
- Show how the Conversion Engine attacks it: hypothesis, test, ship, measure.
- **Cold lead:** the demo sells the audit. The full version of this, across your whole funnel, mapped into a prioritised plan, is the Discovery Audit. £1,000, and it credits against the retainer.
- **Warm lead:** the demo sells the retainer. This is what we do every month, on a programme, owning it end to end.

Two sharp observations beat ten shallow ones. Do not over-show.

### Phase 4: Close

Get a decision, not a let-me-think-about-it.

- Recommend a specific tier by revenue band, directively: At your scale, Core is the right start, 4 pages and 4 tests a month, weekly rhythm, £10,000 a month, 90-day minimum.
- State the terms plainly: 90-day minimum, dedicated channel, same-day responses, weekly reports, the conversion guarantee, and the optional 10% prepay.
- Ask for the decision, then stop talking. Do you want to move forward? Silence closes.
- If they are not ready for the retainer, close on the audit, or book the next call with a clear value step attached.
- Lock the next action before hanging up: contract sent today, or the next call booked live.`,
  },
  {
    title: "Closing kit: contract to payment to kickoff",
    body: `Once they say yes, the close runs as a fixed sequence. Do not improvise it. Speed protects the deal: the longer the gap between yes and signed, the more it cools.

- **Same call:** confirm the tier (or the audit), state the terms back, and book the kickoff date live before hanging up.
- **Same day:** send the agreement. Contracts are built and sent inside Launchpad.
- **On signature:** send the Whop payment link. [DYLAN: is month 1, or the prepaid 90-day term, due before kickoff?]
- **On payment cleared:** trigger onboarding. Create the dedicated client channel, send the onboarding pack and book the onboarding call (see Retention).
- **Handover:** closer to delivery. The CSM and PM take ownership of moving things along. [DYLAN: handover format, doc, call, or both?]

**Audit-credit mechanic:** the £1,000 Discovery Audit fee credits against the retainer if the client moves forward. Say this at the point of sale, it removes the risk of buying the audit.`,
  },
  {
    title: "Pipeline rules",
    body: `How we manage leads between first contact and close. Written as our current starting hypothesis, because the exact timings are still being tested.

- **Speed to lead:** first contact fast, hot on the tail. The outbound agency targets 15 minutes.
- **Follow-up:** the finite cadence above. Every touch adds something.
- **Call sequencing:** book the next call before ending the current one. A lead with no next action booked is a leak.
- **Target time-to-close:** 7 days.
- **When to drop:** after the break-up message and one nurture re-touch with no reply, move the lead to long-term nurture and out of the active pipeline.
- **Hygiene:** every active lead has a stage, a next action, and a date. No orphan leads.`,
  },
  {
    title: "Collateral and decks",
    body: `The assets the sales motion runs on. Most do not exist yet, so this doubles as a build list. Overarching owner is CSM and PM; content from founder and strategist, build from the design pod.

- **Sales deck (live-call version).** The deck a closer drives on the call. Light on slides, heavy on reacting to the prospect's store. Carries the problem framing, the Conversion Engine model, the recommended tier, the 90-day term, and the guarantee. *Status: to build.*
- **Pitch deck (leave-behind).** The self-explaining version a lead can read alone or forward to a partner. Same spine, written to stand without a presenter. *Status: to build.*
- **Proof deck (case studies).** Real results, real or cleanly anonymised, structured as problem, what we did, outcome. The asset that unlocks cold reach, and it is currently empty. *Status: blocked on cases, top priority.*
- **Story deck (about the agency).** Who we are, how we work, the brain library, why post-click and not just traffic. *Status: to build.*
- **Proposal template.** Follows a verbal yes: tier, scope, terms, 90-day commitment, guarantee, prepay option, start date. Generated from Launchpad. *Status: to build.*
- **One-pager / mini-pitch.** A single page for cold outreach and quick intros: who we help, what the Conversion Engine is, the guarantee, one CTA. *Status: to build.*
- **Cold teardown asset.** The free cold-lead teardown that sits between outreach and the paid audit. *Status: define then build.*`,
  },
];

const objections = [
  {
    objection: "I need to think about it.",
    response: `**Underneath:** Almost always an unhandled concern (price, trust, or timing), rarely actual thinking.

**Response:** "Totally fair. Usually when someone says that, it is one of three things: the price, whether it will actually work for your brand, or the timing. Which is closest? Let us deal with the real one now while I am here, rather than you sitting on it."

**Move:** Never accept think-about-it as final. Convert it to the real objection and handle that.`,
  },
  {
    objection: "It's too expensive.",
    response: `**Underneath:** They do not yet see the return, or they are comparing us to a cheaper, different thing.

**Response:** "Compared to what? If it is a freelancer or a cheaper agency, you are right, we cost more. What you are buying is a team that owns your funnel end to end and ships tested changes every week. The real question is not whether the fee is a lot, it is whether your funnel is leaking more than that a month right now, and at your volume it usually is. We aim to make you more than you spend."

**Move:** Reframe cost into cost-of-inaction and ROI.`,
  },
  {
    objection: "We tried CRO before and it didn't work.",
    response: `**Underneath:** They got burned by a bad agency or a tool with no strategy.

**Response:** "What did that look like? Most CRO that fails is one of two things: a tool with no strategy behind it, or a team running random tests with no hypothesis. We run a prioritised programme, every test has a reason, we build everything so nothing waits on your dev, and you see the results weekly. You are not buying tests, you are buying a system."

**Move:** Diagnose the past failure, position our model as its opposite.`,
  },
  {
    objection: "What's the guarantee?",
    response: `**Underneath:** Fear of paying and getting nothing.

**Response:** "Most agencies who guarantee a revenue number are either padding the price to cover the risk or hoping you do not notice when they miss. We do it differently. We guarantee a measurable increase in your conversion rate inside the 90 days, or we keep working at no extra cost until you get one. We can say that because we run a tested programme on a brand with enough volume to actually move the number, and you see it in the weekly reports the whole way through. The only thing we ask is that you ship the changes we recommend."

**Move:** Kill the fake-guarantee expectation, replace it with our real conversion guarantee.`,
  },
  {
    objection: "Can we start smaller?",
    response: `**Underneath:** Risk-hedging, wants lower commitment.

**Response:** "Yes, two ways. Start on Entry, our lightest retainer, 2 pages and 2 tests a month, same 90-day minimum. Or, if you are not ready for a retainer at all, start with the Discovery Audit: £1,000, delivered in 72 hours, a deck and a prioritised plan. If you move to a retainer after, that £1,000 is credited. So starting small costs you nothing if you go on to work with us."

**Move:** Offer the real smaller options (Entry, or the credited audit), do not invent a custom deal.`,
  },
  {
    objection: "How is this different from [other agency]?",
    response: `**Underneath:** They cannot tell us apart from the field.

**Response:** "Most agencies sell deliverables: a page, a redesign, a report. You buy the thing and then you are on your own. We own the outcome on a programme, we run the funnel and the testing end to end, ship every week, and report what each change produced. We also move fast, because we build it, so you do not wait on us and we do not wait on your dev team. And we carry the patterns of what works across hundreds of Shopify stores, so we are not starting from a blank page on your funnel."

**Move:** Contrast deliverables-vendor against outcome-partner, then lean on the brain library.`,
  },
  {
    objection: "90 days is a long time to be locked in.",
    response: `**Underneath:** Fear of being stuck with something that is not working.

**Response:** "It is deliberate, and it protects you more than us. CRO does not work in two weeks, tests need runtime to reach significance and a programme needs a few cycles to compound. If we let people quit at 30 days, they would bail right before the work pays off and decide CRO does not work. The 90 days is the minimum window for the programme to show you something real, and you are not flying blind, you see weekly reports the whole way through. After the 90 days it rolls month to month."

**Move:** Reframe the lock-in as the thing that makes the work valid, pair it with transparency.`,
  },
  {
    objection: "Can you just do a one-off page first, then we'll see?",
    response: `**Underneath:** Wants proof before committing to the retainer.

**Response:** "We can, we do plenty of one-off builds. Honest version though: a single page in isolation tells you very little, because you cannot test or iterate on it without the programme around it. If you want proof before committing, the Discovery Audit is the better first step, faster and cheaper than a build, and it shows you exactly what we would do. If you would still rather start with one page, we will do it well, and most clients who start that way move to the retainer once they see how we work."

**Move:** Redirect to audit-first, keep the one-off as a valid on-ramp.`,
  },
];

const pricing = [
  {
    tier: "Entry",
    price: "£5,000 / month",
    includes: [
      "2 pages per month",
      "2 tests per month",
      "Biweekly strategy calls",
      "Biweekly results reports",
      "Same-day response SLA",
      "Dedicated client channel",
      "90-day minimum, then rolls month to month",
      "10% discount for paying the 90-day term up front",
      "Best fit: £200k to £400k monthly revenue",
      "Steps up to Core when: consistently maxing the 2 pages and 2 tests, or wanting the faster weekly rhythm",
    ],
  },
  {
    tier: "Core",
    price: "£10,000 / month",
    includes: [
      "4 pages per month",
      "4 tests per month",
      "Weekly strategy calls (optional)",
      "Weekly results reports (mandatory)",
      "Same-day response SLA",
      "Dedicated client channel",
      "90-day minimum, then rolls month to month",
      "10% discount for paying the 90-day term up front",
      "Best fit: £400k to £800k monthly revenue. The anchor tier - most clients land here.",
      "Steps up to VIP when: client wants maximum test velocity, priority turnaround, or brand-strategy input beyond pure CRO",
    ],
  },
  {
    tier: "VIP",
    price: "£15,000 / month",
    includes: [
      "6 pages per month",
      "12 tests per month (variant + iteration testing on existing pages, not just net-new builds)",
      "Weekly strategy calls",
      "Weekly results reports",
      "Priority turnaround on deliverables",
      "Quarterly brand-strategy calls (the QBR)",
      "Same-day response SLA",
      "Dedicated client channel",
      "90-day minimum, then rolls month to month",
      "10% discount for paying the 90-day term up front",
      "Best fit: £800k+ monthly revenue",
      "Second pod available for scale engagements (doubles resources)",
    ],
  },
];

const executionLayers = [
  {
    name: "Discovery Audit (pre-signup)",
    turnaround: "72 hours",
    included: `The £1,000 warm-lead buy-in. Run by the strategist. Credited against the retainer if they sign.

This gets systemised in Launchpad. The strategist inputs screenshots and findings, and the system outputs a consistent, branded deck. The audit does not depend on which strategist runs it: same structure, same quality, every time.`,
    deliverables: `Proposed deck structure (the systemised template):

- **Cover and brand snapshot.** Brand, URL, revenue band, date.
- **Executive summary.** The three to five biggest opportunities up top, so a busy founder gets the value in 60 seconds.
- **Current funnel overview.** Where they are now and the key metrics we can see from the outside.
- **Findings by funnel stage.** Landing, PDP, cart, checkout. Each finding follows the same shape: what we see (screenshot slot), why it costs them, the fix.
- **Prioritised opportunity list.** Every finding scored with ICE.
- **The first 30/60/90.** What we would do first if they came on.
- **How we would work together.** Recommended tier and the next step.`,
    bar: `Every finding tied to a screenshot and a revenue cost; top 3 opportunities a founder grasps in 60 seconds.`,
  },
  {
    name: "Cold teardown",
    turnaround: "Quick",
    included: `The lighter cousin of the audit: same logic, two or three findings, no full deck, free. It exists to give a cold lead enough value to want the call or the paid audit, without burning strategist time on someone who may never pay.

[DYLAN: confirm format, short Loom or one-pager.]`,
    deliverables: `[DYLAN: define]
- 2-3 specific findings
- Tied to revenue impact
- Single CTA: book a call or buy the Discovery Audit`,
    bar: `Specific enough that the lead replies; not so deep we've burned strategist time on a maybe.`,
  },
  {
    name: "Week-one deep dive (post-signup)",
    turnaround: "Week 1",
    included: `Run by the strategist in the first week. The Discovery Audit was the sales-stage diagnosis. This is the full internal baseline the whole programme is built on, so it has to be right. The job is to establish the most accurate picture of the funnel by going deep on Shopify stats and triangulating them against everything else.

- **Shopify analytics:** conversion rate, AOV, by device, by traffic source, and where the funnel drops off.
- **GA4:** cross-checked against Shopify to reconcile any discrepancy, so we trust our own numbers before we act on them.
- **Session recordings and heatmaps:** the behavioural why behind the drop-off, not just the where.
- **Ad library:** the messaging and creative landing on the page, so the on-site experience matches the promise that drove the click.

The team also uses Manus and Claude in the research and build workflow.`,
    deliverables: `Both an internal baseline (the data the pod builds from) and a short client-facing summary, so everyone shares the same source of truth and the client has clarity from day one.`,
    bar: `Numbers reconcile across Shopify and GA4. Behavioural why is named, not just the where. Pod can build from this without asking the strategist follow-up questions.`,
  },
  {
    name: "Roadmap and briefing",
    turnaround: "Week 1, refreshed quarterly",
    included: `Built from the deep-dive baseline plus the prioritised opportunity list. Covers both page builds and tests, all ICE-scored, mapped to the tier's monthly throughput.

**The 30/60/90 roadmap:** three horizons, each listing the pages to build and the tests to run, in ICE priority order, with the owning pod role against each item.

**ICE scoring:** Impact, Confidence, Ease (1 to 10 each), combined to rank the list. High impact and high ease rises to the top; low confidence drops down the queue until we have data to raise it.`,
    deliverables: `**Design brief template**
- Page or element being designed
- Objective (what this is meant to move)
- Linked hypothesis (if it is a test)
- Audience and context
- Key message and hierarchy
- Must-include elements and brand constraints
- References and inspiration
- Deadline and owner

**Dev brief template**
- What is being built (and the design link)
- Functionality and interactions
- Testing-tool setup (Intelligems or Visually, variant logic)
- Tracking and events to fire
- QA criteria (the bar is zero errors)
- Browsers and devices to cover
- Deadline and owner

**Hypothesis / test brief template**
- Hypothesis, in one line: because we observed [data], we believe [change] will [outcome], measured by [metric].
- Primary metric (conversion rate by default)
- ICE score
- Variant description (control vs variant)
- Audience and traffic
- Tool (Intelligems / Visually)
- Minimum runtime [strategist-set, see significance rules]
- Success criteria
- Owner`,
    bar: `ICE-ranked, sequenced across 30/60/90, every item tied to a hypothesis or a clear page goal.`,
  },
  {
    name: "Build cycle",
    turnaround: "~15 days standard, ~10 days VIP priority",
    included: `Work moves design to dev to QA to ship. Each pod role owns its stage, the same as on main builds: the designers own design, the developers own the build. Revisions are handled within the retainer, not billed as extras.

Inside an ongoing retainer, production is faster than a cold one-off because the pod knows the brand and runs in parallel, and it keeps compressing the longer we work together.`,
    deliverables: `**Review gates.** Nothing reaches a client until it clears the gate. The leads hold the bar across all pods, not the secondary pod members.

- **Design gate:** Design Lead signs off against our design standards.
- **Dev gate:** Dev Lead signs off on QA, and the bar is zero errors.`,
    bar: `**Design:** Meets our design standards; hierarchy serves the conversion goal; nothing decorative that does not earn its place.

**Dev:** Passes QA with zero errors, fast, tracked correctly, variant logic clean in the testing tool.

**QA:** Design Lead and Dev Lead sign off, zero errors, tested across devices and browsers before a client sees it.

**Launch:** Shipped on schedule, tracking confirmed firing, client told what shipped and why in the channel the same day.`,
  },
  {
    name: "Testing engine",
    turnaround: "Continuous - 2/4/12 tests per month by tier",
    included: `**Tests per tier:** Entry runs 2 a month, Core 4, VIP 12. VIP's volume means iteration and variant testing on existing pages, not only one test per new build.

**Hypothesis flow:** every test starts as a written hypothesis (see the brief template), is built into Intelligems or Visually, ships, and runs until the strategist calls it. Tests are never random; each one earns its slot through ICE.

**Significance and calling tests:** [DYLAN: significance rules to be solidified by the strategist, confidence level and minimum runtime or sample.] Calling a test, winner, loser, or inconclusive, is strategist judgment against those rules. A clear loser can be killed early at the strategist's discretion.`,
    deliverables: `**Post-test write-up.** Every test gets a written result, whether it wins, loses, or is inconclusive.

- Hypothesis and what we changed
- Metric and result (direction, size, significance reached)
- Verdict: winner, loser, or inconclusive
- What we learned
- What it feeds next`,
    bar: `Clear hypothesis, correct significance handling, a written result either way, and the learning feeds the next test.`,
  },
  {
    name: "Reporting",
    turnaround: "Weekly (Core / VIP) or biweekly (Entry)",
    included: `Every client gets the same shape of reporting on the cadence of their tier. The bar is simple: a client should be able to see, every single week, exactly what we did and what it produced.`,
    deliverables: `**Weekly report**
- Period and brand
- What we shipped this week (pages live, tests launched)
- Test results to date (each live test: status, metric, direction, significance progress)
- What we learned
- What is next week
- Any blockers or asks

**Monthly results write-up**
- Headline: the month's wins in one line
- Tests run, won, lost, inconclusive
- Pages shipped
- Conversion-rate movement vs baseline (with the data caveat)
- What we learned and how it shapes next month
- Roadmap update for the next 30 days`,
    bar: `Transparency: weekly reports show wins and misses alike. Client never has to chase us for what we did.`,
  },
];

const retentionSections = [
  {
    title: "First-week wow",
    body: `The bar: by the end of week one, the client has had a real kickoff, knows exactly what is coming, has their 30-day roadmap in hand, and has their first test already live. That is what proves we are different. We want this to be bulletproof.

- **Onboarding pack.** A branded welcome that sets expectations: who is on their pod, how we communicate, the cadence, the 90-day term and the guarantee, and what week one looks like.
- **Onboarding call.** A kickoff call to align on goals, access, and priorities.
- **Onboarding slide.** The deck that runs the onboarding call.
- **First test live.** A test is live inside the first week.
- **First 30-day roadmap.** Delivered in week one, so the client sees the plan, not just the promise.`,
  },
  {
    title: "Retention principles",
    body: `- **We sell outcomes, then we own them.** The client should never have to chase us for what we promised.
- **Transparency by default.** Weekly reporting means a client always sees what we did and what it produced, wins and misses alike.
- **Own the misses.** A losing test or a missed deadline gets named first by us, with the fix, not hidden until the client notices.
- **Same-day responsiveness.** A retainer client gets a same-day response, every time.
- **The relationship lives in the channel.** Daily check-ins and ongoing conversation keep us close, not distant.`,
  },
  {
    title: "Comms cadence",
    body: `- **Daily:** check-ins and general conversation in the dedicated client channel.
- **Same-day:** responses to any client message, every tier.
- **Strategy calls:** Entry biweekly, Core weekly (optional), VIP weekly.
- **Reporting:** Entry biweekly, Core and VIP weekly.
- **QBR:** VIP only, quarterly. This is VIP's quarterly brand-strategy call and the only formal strategic review; other tiers run on daily check-ins, reports, and their strategy calls.`,
  },
  {
    title: "Documents we deliver and when",
    body: `| Document | When | Tiers |
| --- | --- | --- |
| Onboarding pack + slide | Week 1 | All |
| 30/60/90 roadmap | Week 1, refreshed quarterly | All |
| Weekly or biweekly report | Per tier cadence | All |
| Test write-ups | As tests conclude | All |
| Monthly write-up | Monthly | All |
| QBR deck | Quarterly | VIP |
| Renewal proposal | Around the 90-day mark and continuation points | All |`,
  },
  {
    title: "At-risk signals and escalation",
    body: `**The signals we watch for:**
- Client going quiet in the channel.
- Missed deadlines, ours or theirs.
- A run of tests that do not yield, several inconclusive or losing in a row.

**Escalation path:** the CSM owns the recovery first. If it does not turn, Dylan or Ajay step in to get the ship back on course.`,
  },
  {
    title: "Expansion levers",
    body: `**When.** Brands that are scaling (most of them), and brands coming to us wanting double page builds.

**What.** Step up a tier (more pages and tests), or, for VIP-scale engagements, a second pod, which doubles the resources.

**Natural moments.** Day 90 onward once wins are compounding, and any point a client's ambition outgrows their current throughput.`,
  },
  {
    title: "Resource templates",
    body: `**Monthly report skeleton**
- Headline wins for the month
- Tests run, won, lost, inconclusive
- Pages shipped
- Conversion-rate movement vs baseline
- Learnings and what they change
- Next 30 days

**QBR deck skeleton (VIP)**
- Quarter in review: headline results
- Tests run and win rate
- Conversion-rate trajectory vs baseline
- Biggest wins, with the change shown
- What we learned about the brand's customer
- Roadmap for next quarter
- Scale or expansion opportunities
- Continuation

**Test plan template**
- Brand and period
- Prioritised test queue (ICE-ranked)
- For each: hypothesis, metric, variant, tool, owner, target runtime
- Capacity check against tier throughput

**Renewal proposal template**
- Recap of the term: what we shipped and what it produced
- The compounding case: why momentum matters
- Proposed continuation: rolling, or step up a tier
- Any expansion: second pod for VIP, more throughput
- Terms and next step`,
  },
];

const milestones = [
  {
    day: 30,
    title: "Day 30: pages live, tests live, kickoff retro",
    body: `- The pages we quoted are live.
- The tests we quoted are live.
- Results are banking, data accumulating toward significance.
- A kickoff retro: what shipped, what we are seeing, what is next.`,
  },
  {
    day: 90,
    title: "Day 90: pattern of wins, roadmap refresh, expansion check",
    body: `- A pattern of wins is forming, results compounding.
- Roadmap refresh for the next quarter.
- The 90-day minimum is met; the relationship rolls month to month from here.
- First expansion conversation if the signals are there (scaling, wanting more throughput).`,
  },
  {
    day: 180,
    title: "Day 180: case-study angle, renewal anchor",
    body: `- Wins compounding further; the programme is mature.
- A case-study angle should be emerging. Capture it.
- Renewal-anchor conversation: reinforce the trajectory, confirm continuation.`,
  },
  {
    day: 365,
    title: "Day 365: annual review, multi-year, referral, second pod",
    body: `[DYLAN: kept light for now, we will detail it later. The shape: annual review, continuation or multi-year framing, a referral ask, and a second-pod offer for VIP-scale clients.]`,
  },
];

/* ── Run ─────────────────────────────────────────────────────── */

async function main() {
  console.log("Wiping existing Hero Offer rows...");
  await Promise.all([
    wipe("offer_sections"),
    wipe("offer_objections"),
    wipe("offer_layers"),
    wipe("offer_milestones"),
    wipe("offer_resources"),
    wipe("offer_pricing"),
  ]);

  console.log("Inserting Start Here sections...");
  await insert(
    "offer_sections",
    startSections.map((s, i) => ({
      id: id("start", i),
      stage: "start",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    })),
  );

  console.log("Inserting Acquisition sections...");
  await insert(
    "offer_sections",
    acquisitionSections.map((s, i) => ({
      id: id("acq", i),
      stage: "acquisition",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    })),
  );

  console.log("Inserting Retention sections...");
  await insert(
    "offer_sections",
    retentionSections.map((s, i) => ({
      id: id("ret", i),
      stage: "retention",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    })),
  );

  console.log("Inserting Objections...");
  await insert(
    "offer_objections",
    objections.map((o, i) => ({
      id: id("obj", i),
      objection: o.objection,
      response: o.response,
      order: i * 10,
    })),
  );

  console.log("Inserting Pricing tiers...");
  await insert(
    "offer_pricing",
    pricing.map((p, i) => ({
      id: id("price", i),
      tier: p.tier,
      price: p.price,
      includes: p.includes,
      order: i * 10,
    })),
  );

  console.log("Inserting Execution layers...");
  await insert(
    "offer_layers",
    executionLayers.map((l, i) => ({
      id: id("layer", i),
      name: l.name,
      included: l.included,
      deliverables: l.deliverables,
      turnaround: l.turnaround,
      bar: l.bar,
      order: i * 10,
      updated_at: now,
    })),
  );

  console.log("Inserting Retention milestones...");
  await insert(
    "offer_milestones",
    milestones.map((m, i) => ({
      id: id("ms", i),
      day: m.day,
      title: m.title,
      body: m.body,
      order: i * 10,
    })),
  );

  console.log("Done. Reload /hero-offer to see the populated playbook.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

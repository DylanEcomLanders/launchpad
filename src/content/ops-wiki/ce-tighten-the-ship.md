# Tighten The Ship — May 2026
> Working memo. Pulls the last 5 days of scattered work + existing docs into one place.
> Status legend: ✅ settled · 🟡 drafted, needs ratifying · 🔴 still loose.

---

## TL;DR — where you actually stand

You have the asset pile. What's missing is **ratification + repetition**: deciding the canonical version, getting the team aligned on it, and using the same words in every call/proposal/Slack reply.

- **Offer:** ✅ priced, 🟡 phrased two different ways across docs.
- **Cheat sheet:** ✅ exists (`ce-sales-cheat-sheet.md`), team probably hasn't read it.
- **Objections:** ✅ exists (`ce-sales-objections.md`), 10 covered.
- **Team:** 🔴 phase tracking is in (Task Board overhaul, Apr 23) — but no accountability rhythm built on top of it yet.
- **Turnarounds:** ✅ `turnarounds.ts` is canonical (internal target + 30% buffer → client-quoted). Nobody on the team is using it yet.
- **What to say to clients:** ✅ scripts exist across 3 docs — needs one consolidated page.

---

## 1. THE OFFER — single source of truth

The offer is **Conversion Partnership** at **£8K/mo** (anchor: £12–15K Pro tier).
Everything else is one-off (audit, pages, ad-hocs) — it should funnel toward retainer.

**Canonical price:** [src/lib/pricing.ts](src/lib/pricing.ts) — `id: "conversion-partnership"` is the row that wins. Every quote, deck, proposal pulls from here.

**One-line positioning** (use this verbatim):
> "Most Shopify brands have an ads team, an email team, and nobody owning conversion. We're the team that sits between traffic and revenue."

**One-line price frame** (never quote the number cold):
> "£8K against £[X] of monthly recovered revenue."

🟡 **Decision needed:** the playbook calls Pro "£12–15K", pricing.ts only lists Core. Either add Pro to `pricing.ts` as a row or kill the Pro tier from the playbook. **Pick one this week.**

---

## 2. CHEAT SHEET — already done, use it

Lives at [src/content/ops-wiki/ce-sales-cheat-sheet.md](src/content/ops-wiki/ce-sales-cheat-sheet.md).

**The 4 discovery questions are the entire pitch.** If a prospect can't answer them with tension, they're not a fit:

1. Average monthly ad spend + blended CVR?
2. Who owns your conversion roadmap today?
3. Last 5 pages you shipped — who briefed them, who built them, what did they lift?
4. If a 0.5% CVR lift is worth £[X]/mo, does that change how you'd budget for it?

**Action:** print this page. Pin it above the desk. Use it on every call.

---

## 3. OBJECTIONS — already done, use it

Lives at [src/content/ops-wiki/ce-sales-objections.md](src/content/ops-wiki/ce-sales-objections.md). 10 objections, each with Position + Proof.

The two that come up most:
- **"£8K is too expensive"** → "Average client recovers 4–6× in 90 days. Month 4 is notice — you risk £24K, not a year."
- **"We've been burned by agencies"** → "Every brand over £500K has been. What were you promised, and what actually shipped?" (then listen)

🔴 **Gap:** no objection covers "we want to start with one page". The cheat sheet says credit £5–8K build against month one of retainer — make that an actual objection entry so AJ/team don't improvise.

---

## 4. TEAM — the loose part

The Task Board overhaul (Apr 23, 30+ commits) gave you the **mechanics** for tightening team:

- ✅ Phase tracking with time-in-phase logging
- ✅ Split deadlines per task (Design / Dev / Launch)
- ✅ Per-task designer + developer assignment, auto-assign by phase
- ✅ Deadline change-history audit trail (who moved what, when, why)
- ✅ Per-visit phase history (revision loop count visible)

**What's still missing — the operating rhythm:**

- 🔴 **Weekly cadence**: who reviews the board, when, what gets escalated. Right now nobody owns this.
- 🔴 **Accountability for moved deadlines**: the audit trail exists, but no rule for "if a deadline moves >2 days, it goes on the Friday review."
- 🔴 **Designer training on briefs**: the conversion partnership delivery doc says "no brief = no build." Designers need 1 session walking through `ce-03-delivery.md` Phase 4 brief template.
- 🔴 **Revision loop ceiling**: turnarounds.ts says R1 + R2 only. Anything beyond is `addon-extra-revision` (£350). Team isn't enforcing this yet.

**Proposed 2-hour fix this week:**
1. Friday 30-min board review (you + AJ). Anything red → reassigned or re-quoted.
2. Designer 1-hour walkthrough of `ce-03-delivery.md` brief template.
3. Hard rule: deadline moves >2 days require a note in the audit trail. No silent slips.

---

## 5. TURNAROUNDS — quote from the table, not the gut

Canonical: [src/lib/turnarounds.ts](src/lib/turnarounds.ts). Internal target + 30% buffer = client-quoted, rounded up.

**Use `getClientQuotedForId(id)` everywhere a client sees a number** — calculator, proposals, agreements. The internal number must never leave the building.

Quick reference (client-quoted business days):

| Deliverable | Internal | Client-quoted |
|---|---|---|
| Frame page (design + dev) | 5 | 7 |
| PDP build | 8 | 11 |
| Cart build | 4 | 6 |
| Full funnel (PDP + cart + checkout + 1) | 15 | 20 |
| Single section (design only) | 1 | 2 |
| Single section (design + dev) | 2 | 3 |
| CRO audit | 5 | 7 |
| Discovery phase | 7 | 10 |
| Test build (within retainer) | 3 | 4 |
| Strategic review deliverables | 5 | 7 |
| Revisions R1 | 2 | 3 |
| Revisions R2 | 1 | 2 |

🟡 **Action:** post this table in the team Slack pinned message. Right now it lives in code only.

---

## 6. WHAT TO SAY TO CLIENTS — the 6 scripts

These already exist across 3 docs. Consolidating here so there's one page to grab from.

### a. Cold opener (first DM/email)
> "We're the conversion team for DTC brands. You drive the traffic, we make sure it converts."

### b. Call 1 frame (the 60-second pitch)
> "Most brands at £80–120K/mo have figured out traffic. Meta works, Google works. But the click lands on a generic collection page or an old PDP. That's the leak. We come in as the full post-click team — audit every layer, build the prioritised roadmap, then execute monthly. It compounds. Most clients see it pay for itself within 60 days."

### c. Price reveal (Call 2)
> "Our retainer is £8K. Based on your traffic and current CVR, that pays for itself at a 0.[X]% lift. We average 1–2% in 90 days."

### d. Close (90-day proposal)
> "What I'd propose is a 90-day partnership. Month one we ship [the thing they said they need]. By month three we've tested against it. If the numbers don't move, you haven't locked in — 30-day notice from month four. Workable?"

### e. Scope creep (in-flight)
> "That's outside post-click — happy to scope it separately. For now, every hour we spend there is an hour off the conversion roadmap."

### f. Revision overflow (in-flight)
> "Two rounds is what's in scope on every project — keeps us moving on the roadmap. Beyond that is £350 per round. Want me to send a re-quote, or roll the changes into the next sprint?"

🔴 **Missing script:** the "you've gone quiet" check-in. Add one. Suggested:
> "Haven't heard from you on [X] — want to push the review to next week, or are we good to ship as-is?"

---

## 7. RECENT WORK — what shipped, what it unlocks

Last ~14 days, ranked by what tightens the ship:

| Date | Shipped | Unlocks |
|---|---|---|
| May 1 | Invoice Generator: registered address on every invoice | Compliance, look professional |
| Apr 28 | **Font Library** (Team Tools) — drop-and-go zip upload, family grouping, weight switcher | Design team stops hunting for fonts |
| Apr 28 | **Quiz Funnel** — 6-step lead qualifier with tiered routing | Disqualify the wrong-fit leads before they hit a call |
| Apr 26 | Swipe File — URL → mobile + desktop screenshots, hides stickies properly | Build the swipe library faster |
| Apr 23 | **Task Board overhaul** — phase tracking, split deadlines, audit trail, By Client / By Phase toggle | The mechanics for tightening team (see §4) |
| Apr 22 | **Sales deck** — editorial B&W, interactive calculator (S3), visual ROI (S9), horizontal flow diagram | Call 2 deliverable is sharper |

**The throughline:** every one of these is a "tighten the ship" move, not a feature for clients. You're investing in the operating system.

---

## 8. PUNCH LIST — what to close out this week

Order is intentional — top to bottom is highest-leverage.

1. **Pro tier decision** (§1) — kill it from the playbook OR add it to `pricing.ts`. 30 min.
2. **Friday board review** (§4) — book recurring 30-min slot with AJ. 5 min.
3. **Turnaround table in Slack** (§5) — pin it. 5 min.
4. **"Start with one page" objection entry** (§3) — add to `ce-sales-objections.md`. 15 min.
5. **Designer brief walkthrough** (§4) — book 1-hour session. 5 min to schedule.
6. **"Gone quiet" client script** (§6) — write it, save it. 10 min.
7. **First retainer = bulletproof case study** — already noted in conversion partnership memory. Assign owner.

Total: under 2 hours of work to ratify what's already drafted. The pile is built. This is just locking it down.

---

## File index

Strategy & sales:
- [ECL-PLAYBOOK.md](ECL-PLAYBOOK.md) — the master 17-section reference
- [src/content/ops-wiki/ce-sales-cheat-sheet.md](src/content/ops-wiki/ce-sales-cheat-sheet.md)
- [src/content/ops-wiki/ce-sales-objections.md](src/content/ops-wiki/ce-sales-objections.md)
- [src/content/ops-wiki/ce-03-delivery.md](src/content/ops-wiki/ce-03-delivery.md)
- [src/content/conversion-partnership/](src/content/conversion-partnership/) — 9 docs, 00–08

Pricing & turnarounds:
- [src/lib/pricing.ts](src/lib/pricing.ts) — single source of truth for £
- [src/lib/turnarounds.ts](src/lib/turnarounds.ts) — single source of truth for days

Team ops:
- Task Board (`/tasks`) — phase tracking, deadlines, audit trail
- [src/content/ops-wiki/](src/content/ops-wiki/) — 00–15 ops docs

Sales surfaces (live):
- `/audit` — public audit landing page
- `/sales-deck` — Call 2 deck
- `/sales-engine` — pipeline + funnel analytics

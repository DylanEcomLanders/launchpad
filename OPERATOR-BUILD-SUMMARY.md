# OPERATOR-BUILD-SUMMARY — operator-first delivery system

Brief: `launchpad-build-brief.md` (North Star: **"My Work"** — every person opens one screen and
knows what to do next). Branch `feat/operator-first-deliverable` (off `feat/pod-os-v2-overnight`,
which carries the Day-X/90 clock helpers it builds on). `tsc` ✓, production `next build` ✓.

> Process followed exactly: explored first, proposed the unified Deliverable model, got approval
> (extend Task in place + build My Work directly), **then** wrote code. My Work shipped first.

---

## The key finding (why this wasn't a big rebuild)

The "two disconnected views" aren't two stores — they're **one object and a projection of it**.
`pods-v2 Task` is already the shared Deliverable (person-owned via `assigned_to`, phased, pointed,
due-dated, parented to Project→Client). The engagement view is a read-only adapter
(`clientToEngagement` in `engagement-from-pods.ts`) whose `ownerFromTask()` *deliberately discards
the person* and shows a role badge — that one function **is** the brief's "owners are roles" problem.

So we didn't invent a Deliverable or migrate the pod board. We made `Task` the canonical Deliverable
and added a thin lens layer.

## What's built and tested

### 1. Unified Deliverable model — `src/lib/pods-v2/deliverable.ts`
- `Task` is the Deliverable (extended in place: added `Task.resource_deps`, `Client.resources` — both
  optional JSONB, no migration, pod board untouched).
- Derives the brief's **5 statuses** from existing fields: Not started / In progress / In review
  (from review phases) / Shipped / Blocked-waiting-on-client (`waiting_on`) / Blocked-missing-resource.
- **Resources-as-gates**: per-discipline default deps (design ⇒ figma+audit, dev ⇒ figma+preview,
  strategy ⇒ audit+analytics), overridable per Task. Gate fires only once a client is *tracking*
  resources (untracked ≠ confirmed-missing — see Decisions), so due-date prioritisation isn't buried.
- **Risk engine** (`riskLevel`/`riskReason`): Red = overdue or due ≤2d & not final phase; Amber =
  due ≤4d; Green = on track; Blocked + Shipped are their own buckets.

### 2. My Work — `/my-work` (THE front door, ships first)
- Per-person deliverables, **Red → Amber → Green**, blocked items in an "Off your plate" section
  with the real reason, shipped collapsed. Day-X/90 clock per retainer line.
- **One-tap Advance** (advances phase; ships at launch) — no forms.
- Identity: a visible "I'm [person]" picker (Launchpad has no per-user identity), persisted locally.
- Pinned **first** in the sidebar.
- *Verified:* Barnaby shows 18 deliverables, 11 at risk with real overdue counts — the brief's
  "Barnaby 18, Kaye 0" overload, now per-person. Advance mutates + re-renders live. Screenshots taken.

### 3. Risk & Triage — `/risk` (the PM's home)
- Every deliverable trending late, agency-wide, urgency-sorted, **owners as people** (name · client ·
  pod · phase · reason).
- Forcing-function alert bands: **clock-pressure** (retainer past Day 14 with nothing shipped =
  screaming red) and **onboarding-purgatory** (engagement with no deliverables yet).
- *Verified:* 33 red / 2 at-risk engagements on live data; Lumen & Co (Day 21/90) + Harvestory
  (Day 15/90) flagged "nothing shipped". Screenshot taken.

## What's stubbed / provisional
- **Identity picker** stands in for real per-user auth identity (none exists). Honest + visible.
- **Risk weights / "behind phase"** are approximated by due-date proximity + phase (not a full
  phase-vs-clock model yet) — tunable in `deliverable.ts`.

## What's NOT done yet (remaining brief items — recommended next PRs)
The brief's build sequence has six steps; this branch delivered the model + the two operator views
(the North Star). Remaining, in priority order:
1. **Reconnect the Client engagement view to show people** — flip `ownerFromTask`/the engagement UI
   from role badges to person-first. Small but touches the large `engagement-detail-client.tsx`.
2. **Resources-as-gates UI** — let the PM mark a client's resources present/missing (writes
   `Client.resources`), which switches the gates on. The model + gating already work; this is the
   input surface + the "missing resource flags the PM" affordance.
3. **Onboarding forcing function** — approved client with no pod = loud red at the top; clock starts
   visibly on approval. (Risk view already flags onboarding-purgatory for zero-deliverable clients.)
4. **Risk-engine morning ping** (in scope per brief) — a cron pinging owner + PM on Amber/Red. Existing
   cron infra (`api/cron/pods-standup`) + Slack can carry it.

## Where each piece lives
| Piece | Path |
|-------|------|
| Deliverable model (status/gates/risk) | `src/lib/pods-v2/deliverable.ts` |
| Task.resource_deps / Client.resources | `src/lib/pods-v2/types.ts` |
| My Work | `src/app/(dashboard)/my-work/{page,client}.tsx` |
| Risk & Triage | `src/app/(dashboard)/risk/{page,client}.tsx` |
| Sidebar (My Work + Risk pinned first) | `src/components/sidebar.tsx` |

## How to review
1. Open **`/my-work`**, switch "I'm …" to Barnaby — see the per-person priority list + one-tap Advance.
2. Open **`/risk`** — the agency-wide triage + the two clock/onboarding alert bands.
3. Skim `deliverable.ts` (the whole model is ~150 lines of pure functions over Task).
4. `git log --oneline feat/operator-first-deliverable ^feat/pod-os-v2-overnight` — 3 commits.

## Open questions
1. **Branch base** — this sits on `feat/pod-os-v2-overnight` (for the clock helpers). Want both merged
   together, or should I rebase this onto `main` standalone?
2. **My Work identity** — picker for now. Want me to wire it to a real per-user login later, or is
   "pick who you are" fine for the team's shared-login reality?
3. **Next PR** — I'd do "reconnect engagement view to people" + "resources-as-gates UI" next. Agree,
   or reprioritise?

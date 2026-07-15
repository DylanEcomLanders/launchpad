# Kanban Delivery System — Technical Breakdown

> A complete technical reference for how conversion work moves through Launchpad's `/kanban` board,
> from strategy brief to concluded test. Written for an external reviewer or a fresh context.
> Reflects the `feat/kanban-handover-gate` sandbox branch.

**Core files:** `src/app/(dashboard)/kanban/page.tsx`, `src/lib/projects/mock-data.ts`,
`src/lib/kanban/data.ts`, `src/lib/my-work/classify.ts`, `supabase/migrations/`

**Status key used below:** Live = wired and working · Pending DB = works locally, needs a migration pasted to persist · Vestigial = code present but not in the active workflow.

---

## 1. Overview and current state

The kanban board is the agency's delivery cockpit. Every piece of client work is a **card** (a "deliverable")
that travels left to right through three phases of work, owned by a pod of designers, developers and a strategist.
The board tracks where each card is, who owns the current step, whether it is on time, and what happened to it.

It is one large client-rendered React view backed by Supabase, with an in-memory mock + localStorage fallback so
the UI always renders. All writes are optimistic (state updates immediately, syncs in the background).

**Current state for the reviewer:** several `kanban_tasks` columns (handovers, subtasks, multi-test, activity log)
come from migrations `047`–`051` that have **not yet been applied** to the live Supabase project. Until pasted in,
those features work in the browser but their writes fail and fall back to local state. This is a config step, not a
code defect.

---

## 2. Core vocabulary

Four concepts recur everywhere: **phases** (columns), **phase groups** (the four workflow stages a checklist is
organised by), **roles** (who owns a step), and **statuses** (health + unlock state).

### Phases (the columns) — type `PreviewPhase`

| phase | Column | Band | Purpose |
|---|---|---|---|
| `tickets` | Tickets | Unbanded | Ad-hoc bugs/fixes. SLA-driven status by category (Fire / Bug / Ticket). Resolved in place, never dragged. |
| `not-started` | Not started | Unbanded | Backlog intake, waiting for strategy. |
| `strategy` | Strategy | Phase 1 | Strategist scopes the brief. |
| `design` | Design | Phase 1 | Design pod builds the layout. |
| `internal-revisions` | Internal Revisions | Phase 1 | Internal QA before the client sees it; approve or bounce back. |
| `external-revisions` | External Revisions | Phase 1 | With the client. Starts a 48h clock; card shows a "With client" callout. |
| `development` | Development | Phase 2 | Dev pod builds the live implementation. |
| `qa` | QA | Phase 2 | Final internal test; approve or send back to dev. |
| `test-backlog` | Test backlog | Phase 3 | Queued optimisation hypotheses. |
| `launch-testing` | Launch & Testing | Phase 3 | Test is live in market; metrics tracked, then concluded. |
| `documents` | — | Off-board | Retainer docs. In the model, surfaced in the Clients area, not on this board. |

### Phase groups (the four workflow stages) — `subtaskGroupForPhase()`

The card checklist is organised as **Strategy → Design → Development → Optimisation**. Several phases map to one group:

| Group | Phases |
|---|---|
| `strategy` | strategy · tickets · not-started · documents (fallback) |
| `design` | design · internal-revisions · external-revisions |
| `development` | development · qa |
| `optimisation` | test-backlog · launch-testing |

### Roles (who owns a step) — `SubtaskRole`

| Role | Resolves to | Typical work |
|---|---|---|
| `strategist` | Pod strategist (pod lead) | Brief, benchmarks, running the test |
| `primary_designer` | `card.designer` | Net-new design, handover to dev |
| `secondary_designer` | `card.secondaryDesigner` | Revisions, viewports, design tickets |
| `primary_dev` | `card.developer` | Main build, client approval, launch setup |
| `secondary_dev` | `card.secondaryDeveloper` | Internal QA, bugs, post-launch tweaks |

### Statuses (two different meanings)

- **Card health:** On track / Approaching / Late, derived from time-in-phase vs the phase budget, or an explicit due
  date, or the ticket SLA, or the 48h external-review clock. A card on hold reads neutral and never goes overdue.
- **Subtask status:** `done` / `available` / `locked`. Never stored — always derived at render (see §7).

---

## 3. Data model and relationships

A four-level tree — **Client → Project → Deliverable (card) → Subtask** — with a Pod attached to each project supplying
the roster, plus an append-only activity feed.

```
Client        (kanban_clients)   id · name · onboardingBrief
  └─ Project  (kanban_projects)  id · name · type(build|retainer) · podId · turnaround/engagement days ·
     │                           startDate · clientApprovedAt · phase1/2Deadline · brief · figmaUrl
     └─ Deliverable / card (kanban_tasks)  id · title · phase · category · 4 role names · dates ·
        │                                  handoffs · tests[] · subtasks[] · phaseHistory · testResult
        └─ Subtask  (embedded JSON)        id · title · group · role · unlock · kind? · done · doneAt?
```

A **Pod** (`kanban_pods`) holds four role names. Assigning a pod to a project writes those names onto every card, so
role → person resolution is consistent. A subtask's owner resolves through the card's role fields via
`subtaskAssigneeName()`.

### The deliverable (card), by concern

| Group | Fields |
|---|---|
| Identity | `id · title · category · phase` |
| Ownership | `designer · secondaryDesigner · developer · secondaryDeveloper` |
| Timing | `startDate · dueDate · hoursInPhase · phaseHistory[] · onHold` |
| Gates & approvals | `strategyHandoff · designHandoff · devHandoff · approvedAt · sentToClientAt · revisionRequested · completedAt` |
| Context | `brief · figmaUrl · notes` |
| Testing (singular, legacy) | `liveTestUrl · liveStartedAt · metrics[] · interimNotes · screenshot · testResult` |
| Testing (multi) | `tests[]` — array of `TestRun`; source of truth when present |
| Work | `subtasks[]` |

**Why two sets of test fields:** multi-test (`tests[]`) was layered over an older single-test model. When `tests`
exists it is authoritative; the singular fields mirror the *active* (last) run so older readers (card face, results
bank, My Work) keep working. Helpers: `activeTestRun`, `testRunsFor`, `mirrorTestRuns`.

---

## 4. The delivery lifecycle

```
PHASE 1 · Strategy + Design
  strategy → design → internal-revisions → external-revisions
  (Strategist)  (Primary designer)  (Internal sign-off)  (With client · 48h)

        ⇥ DESIGN HANDOVER GATE ⇥   (the one hard gate)

PHASE 2 · Development
  development → qa
  (Primary dev)  (Internal sign-off)

PHASE 3 · Optimisation
  test-backlog → launch-testing → [concluded → Results bank]
  (Queued)       (Strategist)      (Winner / loser / inconclusive / shipped)
```

**Loops and side-paths:**
- **Revision bounce** — dragging a card backward sets `revisionRequested` (shows a "Revisions" tag); moving forward
  past the bounce clears it. Repeated bounces show an `R3+` badge.
- **Internal sign-off** — in Internal Revisions, approve (stamps `approvedAt`) or request revisions. Dragging out of
  Internal Revisions clears the approval.
- **Client clock** — entering External Revisions stamps `sentToClientAt` and starts a 48h SLA.
- **QA sign-off** — approve to launch or send back to dev.
- **Test conclusion** — stamps `testResult`, removes the card from the board, files it in the Results bank.
- **Tickets** live in their own column, resolved in place.

---

## 5. The board

- **Bands & headers** (`PHASE_BANDS`): two unbanded stacks (Tickets, Backlog) then the three labelled bands. In
  project view, headers show real pod names — Phase 1 = strategist + primary designer, Phase 2 = primary developer,
  Phase 3 = strategist. Strategist and launch names are currently hardcoded constants; designer/developer come from
  the pod roster.
- **View modes:** By project (default) · All projects · By pod · Results Library (a filterable grid of concluded
  tests, not columns).
- **Toolbar:** deliverable/client counter · Search (`/` focus, `Esc` clear; matches title, client, project, category,
  all four assignees) · Activity feed · Display menu (Mine only, density Cosy/Glance, Phase rules).
- **Card face:** shared `ProjectCard` primitive with a fixed `min-height` so cards line up. Health shown by a subtle
  coloured border (red overdue, green live test), not a filled tint. Badges: Revisions, `R3+`, subtask counter
  `done/total`, Ready, Live (pulsing), Conclude, Log result, "With client · Nd".
- **Drag & drop:** admins only (`canManage`); tickets can't be dragged. A drop calls `moveDeliverable(id, targetPhase)`
  which runs gate checks, updates phase, resets the phase clock, seeds the destination checklist, appends phase
  history, manages revision/approval flags, and logs the move.

---

## 6. The card workflow (the drawer)

Opening a card slides in a right-hand drawer, rebuilt so every card is identical: a fixed header of core facts, then a
phase switcher that shows only the **active** phase's checklist (no long scroll).

Top to bottom: header (client · project · category, title, health badge, close) → three dates (Start, Phase 1, Phase 2)
→ Figma / Strategy-brief resource chips (inline-editable by admins) → **phase switcher** (four pills; done = check,
current = periwinkle ring, upcoming = lock; any pill clickable to peek ahead) → **active phase checklist** (only the
selected group renders, with its inline handover/sign-off/schedule blocks) → Delay toggle (on hold, pauses the clock)
→ Notes (saved on blur) → Phase history (collapsible, dated, per-visit) → Delete card (admin).

**Preload on view:** an effect keyed on the viewed phase materialises that group's checklist from the template the
first time it's seen — even for a phase the card hasn't reached — seeding each group at most once.

Every mutating control is gated on `canManage`; members see the same drawer read-only.

---

## 7. The subtask engine

### The template (`SUBTASK_TEMPLATE`) — the playbook

| Group | Step | Owner role | Notes |
|---|---|---|---|
| strategy | Brief provided | strategist | |
| design | Internal Revisions | primary_designer | |
| design | Client Revisions | secondary_designer | |
| design | Desktop Viewports Created | secondary_designer | |
| design | Development Handover Complete | primary_designer | **gate** — `kind: design_handoff` |
| development | Internal QA | secondary_dev | |
| development | Client Approval | primary_dev | |
| development | Launch Ready and Test Setup | primary_dev | |
| optimisation | Benchmarks Recorded | strategist | |
| optimisation | First Test Live | strategist | |
| optimisation | Results Recorded | strategist | |

Admins can add ad-hoc steps per phase (title, role, unlock) and remove any step.

### Seeding

`seedSubtasksForGroup(existing, group)` copies a group's template onto a card; no-op if the group already has
subtasks. Fires when a card is dragged into a phase, and when a phase pill is first viewed.

### Status derivation — `subtaskStatuses(card)`

```
for each subtask, in array order:
  if (subtask.done) return "done"
  if (groupIndex(subtask.group) > groupIndex(card.phase)) return "locked"   // future group
  priorSameGroupDone = allEarlierInSameGroup.every(done)
  if (unlock === "client_approval")
    return (clientApproved(card) && priorSameGroupDone) ? "available" : "locked"
  // unlock === "sequential"
  return priorSameGroupDone ? "available" : "locked"
```

Two unlock rules: `sequential` (wait for the prior step in the same group) and `client_approval` (also wait until the
card has cleared client review, i.e. reached any build phase). The first `available` item per card is the "next
actionable" step and gets a periwinkle highlight.

---

## 8. Handovers, gates and sign-offs

There is exactly **one hard gate** that blocks card movement; everything else is a soft sign-off that stamps a date.

- **Design handover (the gate) — Live.** The "Development Handover Complete" step (`kind: design_handoff`) opens a form
  requiring Figma link, Loom walkthrough, and font files (assets/notes optional). Submitting stamps
  `designHandoff.submittedAt` and moves the card to Development in the same tick. The gate in `moveDeliverable` blocks
  any move into a Phase 2 build phase without a submitted design handover (the submit flow passes `bypassHandoffGate`).
- **Internal sign-off (Design) — Live.** Approve (stamps `approvedAt`) or request revisions. Dragging out of Internal
  Revisions clears the stamp.
- **QA sign-off (Development) — Live.** Approve to launch, or send back to dev.
- **Build schedule anchors — Live, admin.** Project start, client-approved date, Phase 1/2 deadlines set from the
  Development phase; drive computed per-phase due dates.

**Retired:** the old strategy→design and development→launch gates were removed (those transitions are now plain drags).
`StrategyHandoffSection` and `DevHandoffSection` still exist in the file but are no longer in the active flow (see §15).

---

## 9. The optimisation loop

- **Multi-test model:** a card holds `tests: TestRun[]` — each run has a label, live URL, start date, tracked metrics
  (baseline/interim), interim notes, screenshot, and an optional `result`. The active run is the last; singular legacy
  fields mirror it. Pre-multi-test cards synthesise a single run on read.
- **Card cues:** Ready (not yet live) · Live (pulsing; `liveStartedAt` set, no result) · Log result (live ~7d, no
  metrics) · Conclude (live ~14d).
- **Results bank:** concluding stamps a `TestResult` (outcome, uplift %, confidence %, duration) and moves the card to
  the Results Library — filterable by outcome (Winner / Loser / Inconclusive / Shipped), client, and metric.

---

## 10. Activity log

Append-only "who did what" feed (Activity pill), newest first, relative timestamps. Denormalised (card/client/project
names copied at write time) so it stays readable after renames/deletes; phase names stored as text, not FKs.

| action | Reads as |
|---|---|
| `moved` | "{who} moved {card} from {phase} to {phase}" |
| `created` | "{who} created {card} in {phase}" |
| `deleted` | "{who} deleted {card / project / client}" |
| `concluded_test` | "{who} concluded a test on {card}: {outcome}" |
| `submitted_handover` | "{who} submitted the design handover for {card}, moved to {phase}" |

Writes are fire-and-forget (a logging failure never blocks the action). Reads from `kanban_activity` ordered by time,
capped at 200 rows.

---

## 11. My Work integration

`/my-work` is the individual view over the same kanban data. A member is matched by display name against pod rosters;
pod-strategist status is detected via the pods-v2 `cro_lead` role. Each card is placed in a lane (todo / in-progress /
done) by the viewer's role and the card's phase. `subtasksForUser()` walks every card, computes statuses, and returns
the items the viewer owns that are **not locked** — so each person sees exactly the steps they can act on now.

---

## 12. Persistence and sync

- **Read** — `fetchKanban()` reads all four tables in parallel, buckets tasks under projects and projects under clients
  in two O(n) passes, returns `{ clients, pods }`. Screenshot paths are batch-signed into fresh 24h URLs at read time
  (only the storage *path* is persisted). Unconfigured or failed read → null → mock fixtures.
- **Write** — `syncClientsDiff(prev, next)` diffs the two client trees (clients/projects by field, tasks by full JSON
  compare) and executes in dependency order: upsert parents before children, delete children before parents (the DB
  only cascades from a deleted parent, so orphans are deleted explicitly). Task upserts are chunked at 200 rows/batch.

```
await upsertClients(changed)     // parents first
await upsertProjects(changed)
await upsertTasks(changed)       // chunked at 200 rows/batch
await deleteTasks(removedIds)    // children first
await deleteProjects(removedIds)
await deleteClients(removedIds)
```

- **Failure behaviour:** `fetchKanban` → null (mock fallback) · `upsertTasks` → throws (sync-error toast) ·
  `logKanbanActivity` → swallowed · `fetchKanbanActivity` → `[]` · not configured → all no-op, localStorage + mocks
  drive the UI.
- **The error you'll see today:** `Could not find the 'design_handoff' column of 'kanban_tasks'` — the pending-migration
  state, not a bug. Clears once migrations 047–051 are applied.

---

## 13. Database schema and migrations

Four base tables plus an activity table. Migrations are additive and, by repo convention, **applied by hand** in the
Supabase SQL editor (no auto-runner).

| table | Holds | Key relationships |
|---|---|---|
| `kanban_pods` | Roster: four role names | Referenced by projects |
| `kanban_clients` | Client + onboarding brief | Parent of projects |
| `kanban_projects` | Project config & deadlines | FK → clients (cascade), FK → pods |
| `kanban_tasks` | The cards + all JSON sub-structures | FK → projects (cascade) |
| `kanban_activity` | Append-only audit feed | Denormalised, no FKs |

Complex sub-structures on a card (`subtasks`, `tests`, the three handoff blobs, `phase_history`, `metrics`,
`test_result`) are JSON columns on `kanban_tasks`, not separate tables. Indexes support by-project+phase and
active-cards reads; a trigger maintains `updated_at`.

### Migration ledger

| # | Adds | Status |
|---|---|---|
| 030 | Base schema: 4 tables, indexes, triggers, RLS | Applied |
| 045 | Manual Phase 1 / Phase 2 deadline overrides | Applied |
| 046 | Project-level brief + Figma URL | Applied |
| 047 | `design_handoff`, `start_date`, `on_hold` | **Pending** |
| 048 | Adds `test-backlog` to the phase constraint | **Pending** |
| 049 | `kanban_activity` table | **Pending** |
| 050 | `strategy_handoff`, `dev_handoff`, `tests` | **Pending** |
| 051 | `subtasks` | **Pending** |

Applied status is inferred from the console error confirming `047` onward aren't on the target project yet. Paste in
order, oldest first.

---

## 14. Security posture (honest)

Access control today is at the application layer, not the database:

- **RLS is open** — every kanban table enables RLS but with a single policy allowing the anonymous role full read/write
  (`using (true) with check (true)`). The DB does not distinguish users or pods.
- **Auth is a UI cookie** — `canManage` comes from a role cookie checked client-side. It governs what the interface
  offers, not what the DB accepts.
- **Implication** — anyone reaching the Supabase endpoint with the anon key can read/write delivery data directly,
  bypassing the UI. Tightening this (per-pod read models, authenticated policies) is deferred and deliberate.
- **Near-term lever** — platform-level deployment protection in front of the whole app (also covers API routes) is the
  highest-value short-term mitigation.

---

## 15. Known gaps and cleanup

**Configuration (operator, not code):**
- Paste migrations `047`–`051` into Supabase, oldest first.
- Populate pod rosters and app users so name-matching (My Work, band headers) resolves to real people.

**Vestigial code:**
- `StrategyHandoffSection` — implemented but no longer rendered after the strategy gate was removed. Safe to delete.
- `DevHandoffSection` — only renders if a subtask carries `kind: dev_handoff`, which the template no longer seeds.
  Present but unreachable through the normal flow.

**Consistency & polish:**
- Strategist and launch-testing names are hardcoded constants rather than resolved from the pod roster.
- In Design, the "APPROVED — SEND TO CLIENT" internal sign-off block overlaps conceptually with the "Client Revisions"
  checklist item; could be folded together.
- Task change-detection stringifies the whole card per sync — fine at current scale, worth revisiting if the board
  grows large.

**Not yet built (roadmap):**
- Slack notifications on assignee change and handover (stubbed pending a bot token).
- Deeper My Work integration for unlocked subtasks (currently read-only).
- The authenticated, per-pod RLS model in §14.

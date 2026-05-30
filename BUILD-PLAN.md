# BUILD-PLAN — Pod OS v2 (Pods · Clients · Strategist · CSM)

Source of truth: `ecom-landers-pod-os-strategy-v4-FINAL.md` (referenced below as §). Where this
plan and the doc disagree, the doc wins.

Branch: `feat/pod-os-v2-overnight` (off `main`). Commits small + frequent; only files authored by
this build are staged (the pre-existing dirty tree — `_pods-preview/`, `content-calendar/`, etc. —
is left untouched).

---

## 0. What already exists (reuse, don't rebuild)

The codebase already carries most of the operating-system primitives. This build *extends* them.

| Layer | Where | Status |
|-------|-------|--------|
| Pod / member / client / project / task model | `src/lib/pods-v2/types.ts` | Strong. Has points/buckets (§1.3), phases, `test_result`, retainer tiers, `must_dos`, `kickoff_date`. |
| Data layer (LS-first, additive Supabase mirror) | `src/lib/pods-v2/data.ts` + `sync.ts` | Reuse. New collections plug into `POD_KEY_TO_TABLE`. |
| Pure rules (points, buckets, kickoff/delivery dates, capacity) | `src/lib/pods-v2/calc.ts` | Reuse + extend. |
| Strategist briefs + live-test results | `src/lib/strategy/*` + migration `021` | Reuse. Briefs cover §4.1 Brief Intake; results seed Tests-in-Flight. |
| Live pod surfaces | `/pods-v2/*` (board, pipeline, [podId], standup, me, admin) | Untouched (working v1). |
| Live client surfaces | `/engagements/*` (list, [id], new, trash) | Extended, not rewritten. |
| **Design spec for v2 (mock)** | `_pods-preview/*` (unrouted, `_` prefix) | The clickable redesign. Used as the **UI spec**; not committed/moved. |

The `_pods-preview` redesign already mocks the Strategist dashboard (§4.1), CSM client-health,
delivery engine, and test management on throwaway data. This build makes those two role views
**real and wired** to the live data layer.

---

## 1. Scope (from the overnight brief)

IN: (1) Pods v2 data model + UI, (2) Clients v2 data model + UI (retainer + sprint lifecycle),
(3) Strategist workflow — dashboard + flow (§2.1 + Part 3), (4) CSM workflow — dashboard + flow
(§2.7 + Part 3).

OUT (do not touch): P&L engine, Library feedback engine, Pod Lead/PM/Designer/Developer
dashboards, **standalone Test Management Module**, Notification/alert system.

Scope boundary on tests — see DECISIONS.md #1. The Strategist's **Tests in Flight** panel (§4.1) is
IN (read + calling-rule recommendation + light status edit, part of the strategist workflow). The
separate Test Management *Module* (dev test-setup configurator §4.4, QA checklist, dedicated admin
surface) is OUT.

---

## 2. Data model

All additions are **additive + optional** (backward compatible — existing rows keep working). JSONB
columns mean most additions need no migration; only genuinely new collections do.

### 2a. Clients v2 — engagement lifecycle (`src/lib/pods-v2/types.ts`)
Anchored to §1.2 (products), §1.9 (90-day model), §2.7 (CSM).

Add to `Client` (all optional):
- `engagement_kind?: "retainer" | "sprint"` — defaults: `retainer_tier !== "none"` ⇒ retainer.
- `engagement_start?: string` (YYYY-MM-DD) — defaults to `kickoff_date`. Anchors Day-1..90 (§1.9).
- `renewal_status?: "active" | "refresh_due" | "renewed" | "winding_down" | "churned"` (§1.9 renewal).
- `next_check_in?: string` — CSM weekly/Day-45 touch (§3.3).
- `risk_flags?: string[]`, `onboarding_notes?: string[]`, `strategy_thesis?: string` (§3.2 outputs).
- `health_signals?: HealthSignals` — `{ client_delay_days, approval_lag_days, engagement_gap_days, open_blockers }` (CSM health, modelled off `_pods-preview`).

### 2b. Strategist — tests + hypotheses (new collections)
Anchored to §1.8 (testing framework) + §4.1.
- `PodTest` — hypothesis, status (`setup|live|analysing|won|lost|inconclusive|archived`), confidence,
  days running, min runtime, primary metric, guardrails[], variant config, traffic split, tool
  (Intelligems/Visually §1.8), sample-target %. LS key `launchpad-pods-v2-strategist-tests` →
  table `pods_v2_strategist_tests`.
- `PodHypothesis` — statement, tags[], outcome, linked test, result note. Searchable library (§4.1).
  LS key `launchpad-pods-v2-hypotheses` → table `pods_v2_hypotheses`.
- Both registered in `POD_KEY_TO_TABLE` (`sync.ts`) so the existing mirror/bootstrap picks them up.

### 2c. Migration
`supabase/migrations/023_create_pod_os_v2_tables.sql` — two tables in the standard
`{ id text pk, data jsonb, updated_at }` shape + RLS matching `011`. **Must be pasted into the
Supabase SQL editor manually** (migrations are not auto-applied here — see BLOCKERS.md). Until then
the app runs on the localStorage fallback, so nothing breaks.

### 2d. Calc helpers (`src/lib/pods-v2/calc.ts`, additive)
- `engagementDay(startYMD, today)` → integer day in engagement.
- `daysToRefresh(startYMD, today)` → `75 − day` (retainers; §1.9 Day-75 trigger).
- `engagementWindow(day)` → `"onboarding" | "first_wave" | "iteration" | "compound" | "refresh" | "transition"` (§1.9 macro cycle).
- `healthScore(signals)` / `healthBand(score)` — ported from `_pods-preview` (open weights, tunable).
- `callTest(test)` / `needsCall(test)` — §1.8 calling rules (ship / revert / inconclusive / continue).

---

## 3. UI flows

Reuse design tokens + form styles. New shared primitives in `src/components/pod-os/` (Card,
SectionHeader, StatTile, StatusPill) so the two dashboards stay consistent without depending on the
untracked `_pods-preview` components.

### 3a. Strategist Dashboard — route `/pods-v2/strategist` (§4.1, §2.1, §3.5)
- **Tests in Flight** — every live test across engagements; confidence bar, days-running/min-runtime,
  status pill, calling-rule recommendation; no system cap (§1.8 / locked #5); detail drawer with
  hypothesis, config, guardrails, sample target.
- **My Engagements** — retainers + sprints; status + next action; Day-75 countdown bar for retainers (§1.9).
- **Brief Intake Queue** — Friday-anchored (§1.5/§1.6); asset-gap flags; reads `strategy_briefs`.
- **Hypothesis Library** — searchable by text/tag, linked to results (§4.1).

### 3b. CSM Dashboard — route `/engagements/csm` (§4.6, §2.7, §3.4)
- **Client Pipeline** — all retainers (Day-75 countdown) + sprints.
- **Renewal Pipeline** — Day 60–90 engagements, refresh-doc status, renewal outcome (§1.9, §3.4).
- **Slip Alerts** — at-risk deliverables derived from overdue internal tasks per client (§1.7).
- **Client Profile (drawer)** — engagement history, health signals + score, notes, active tests.

### 3c. Clients v2 lifecycle UI (§1.9, §1.2)
- `EngagementLifecycle` component: retainer ⇒ 90-day macro-cycle track with Day-45 + Day-75 markers
  (§1.9); sprint ⇒ bucket-sized P1→P2→P3 track (§1.4). Surfaced on `/engagements/[id]`.
- `engagement_kind` editable on the engagement; defaults derived from `retainer_tier`.

### 3d. Pods v2
The pod model + board already exist. v2 work here = the data-model extensions (2a/2b) plus surfacing
the strategist/CSM signals; no rewrite of the working pod board (non-destructive).

### 3e. Sidebar
Add "Strategist" (→ `/pods-v2/strategist`) and "Client Success" (→ `/engagements/csm`) entries,
matching the existing nav pattern.

---

## 4. Build sequence (commit per step)

1. Planning docs + branch. ✅
2. Data model — `types.ts` + `calc.ts` additions; `tests.ts` + `hypotheses.ts` data layer;
   `sync.ts` registration; migration `023`. **Anchor: §1.2, §1.8, §1.9, §2.7.**
3. Shared `src/components/pod-os/` primitives.
4. Strategist Dashboard (wired). **Anchor: §4.1, §2.1, §3.5.**
5. CSM Dashboard (wired). **Anchor: §4.6, §2.7, §3.4.**
6. Clients v2 lifecycle component + `/engagements/[id]` surfacing + seed/back-fill of lifecycle fields.
   **Anchor: §1.9, §1.2.**
7. Sidebar entries.
8. `npx tsc --noEmit` + `next build` lint; fix.
9. BUILD-SUMMARY.md.

## 5. Guardrails honored
- No destructive ops: additive Supabase mirror only (`mirrorToSupabase` is additive by design after
  the 2026-05-12 incident); migration creates tables, never drops. Optional fields keep old rows valid.
- Library-first: extend `pods-v2`/`strategy` libs and existing routes before creating new ones.
- Out-of-scope modules untouched. Anything that drifts into them gets logged in BLOCKERS.md.

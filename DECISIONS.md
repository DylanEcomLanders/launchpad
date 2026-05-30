# DECISIONS — Pod OS v2 build

Assumptions made under ambiguity, and every revamp of an existing pattern. Each anchored to the
strategy doc (§) or an existing-code constraint. Newest at the bottom.

---

### 1. "Tests in Flight" is in scope; the Test Management *Module* is not
The overnight brief excludes the "Test management module", but the Strategist workflow (§2.1) and
Strategist Dashboard (§4.1) both require a **Tests in Flight** panel, and §1.8 calling rules are core
to the strategist's job. **Decision:** model a lightweight `PodTest` entity and build the strategist's
Tests-in-Flight panel (read + calling-rule recommendation + light status/confidence edit + detail
drawer). Do NOT build the standalone module surfaces that the phase-1 doc and §4.4 assign elsewhere:
the developer Test Setup Configurator, the QA checklist tooling, or a dedicated `/tests` admin route.
The boundary: tests as *data the strategist reads and calls*, not tests as *a dev build tool*.

### 2. The `_pods-preview` redesign is the UI spec, not the deliverable
`_pods-preview/` (unrouted, `_`-prefixed, and untracked in git) is Dylan's clickable mock of the v2
redesign on throwaway data. **Decision:** treat it as the authoritative UI spec for the Strategist
and CSM views, but build fresh, real, wired routes rather than promoting/moving the preview folder
(it's uncommitted WIP — moving it would entangle this build with his in-flight work). Shared visual
primitives are re-created under `src/components/pod-os/` so the new routes don't import from the
preview.

### 3. New role dashboards are additive routes, not rewrites of live screens
The live `/pods-v2` board and `/engagements` list are the working system. **Decision:** add the
Strategist dashboard at `/pods-v2/strategist` (per preview IA: "Lead Strategist → Pods · Strategy")
and the CSM dashboard at `/engagements/csm` (per preview IA: "CSM → Client Health", which lives under
Clients). This honors "no destructive ops" and "don't break Launchpad" while keeping the role views
where the IA puts them.

### 4. Engagement lifecycle fields ride in the existing `pods_v2_clients` JSONB
Rather than a new `engagements` table, the Clients-v2 lifecycle fields (`engagement_kind`,
`engagement_start`, `renewal_status`, `health_signals`, etc.) are added as optional fields on the
existing `Client` type, stored in the `pods_v2_clients.data` JSONB. **Why:** the column is schemaless
JSONB, the existing `Client` already carries retainer tier + metrics + brief + notes, and a parallel
table would fork the client identity. No migration needed for these; old rows stay valid (fields
optional). Anchored to §1.9 + existing `src/lib/pods-v2` pattern.

### 5. `engagement_start` defaults to `kickoff_date`; Day-1 anchor per §1.6
§1.6 anchors start to "brief lock + assets in", surfaced in this model as `kickoff_date` (already the
authoritative kickoff Monday in the `Client` type). **Decision:** `engagement_start` falls back to
`kickoff_date` when unset, so Day-75 math works for existing clients without back-fill. Logged because
§1.6's "brief lock" trigger and the existing `kickoff_date` are being treated as the same anchor.

### 6. Health-score weights are provisional (open decision in the doc)
The doc leaves health weighting open. **Decision:** port the `_pods-preview` weights
(delay ×3 cap 30, approval-lag ×5 cap 25, engagement-gap ×3 cap 30, blockers ×8 cap 15; bands
green ≥75 / amber ≥50 / red) as a tunable starting point. Flagged as provisional in code.

### 7. Two new Supabase tables registered for additive mirror
`pods_v2_strategist_tests` + `pods_v2_hypotheses` added to `POD_KEY_TO_TABLE`. They inherit the
**additive-only** mirror + cloud-wins-on-hydrate behavior already proven for the other pods-v2
collections (no destructive diff — respects the 2026-05-12 incident rule). Migration `023` creates
them; until pasted into Supabase, the app uses the localStorage fallback.

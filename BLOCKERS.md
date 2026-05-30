# BLOCKERS — Pod OS v2 build

True blockers (needs credentials/data I don't have, or risks breaking other parts of Launchpad) and
anything that drifted toward out-of-scope. Each thread is stopped *only on that thread*; the rest of
the build continues.

---

### B1. Migration 023 must be applied manually in Supabase (not a hard blocker)
Per the project rule, `supabase/migrations/*.sql` are **not** auto-applied — each must be pasted into
the Supabase SQL editor by hand. `023_create_pod_os_v2_tables.sql` creates `pods_v2_strategist_tests`
and `pods_v2_hypotheses`.
- **Impact while unapplied:** the Strategist tests + hypothesis library persist to **localStorage
  only** (the standard pods-v2 fallback). No errors, no data loss — just not yet synced cross-device.
- **Action for Dylan:** paste `023` into the Supabase SQL editor. The `bootstrapPodsSync` first-run
  migration then pushes any local rows up automatically.
- Not blocking the build — logged so it isn't forgotten.

### B2. No live seed data for tests / hypotheses / health signals
The strategist tests, hypothesis library, and CSM health signals are net-new fields with no existing
production data. **Resolution (not a blocker):** ship a one-time, idempotent dev seed
(`seedPodOsV2DemoData`) that runs only when the collections are empty, so the dashboards render with
representative data on first load and Dylan can see them working. Real data replaces it as the team
uses the surfaces. Seed mirrors the `_pods-preview` examples. Flagged here so the seed's provenance is
clear and it can be removed once real data exists.

---

(No hard blockers encountered that stopped a whole deliverable. If the build hits one — e.g. a
required external credential or a change that would break a live `/pods-v2` or `/engagements` flow —
it lands here and that thread stops while the rest proceeds.)
